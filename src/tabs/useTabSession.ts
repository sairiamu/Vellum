import { useEffect, useRef, useCallback } from 'react';
import { Tab, SessionState } from '../lib/types';
import { apiInvoke } from '../lib/tauriApi';
import { ask } from '@tauri-apps/plugin-dialog';

const AUTOSAVE_DEBOUNCE = 2000;

interface FileResponse {
  content: string;
  encoding: string;
  line_ending: string;
}

export const useTabSession = (
  tabs: Tab[],
  activeTabId: string | null,
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>,
  setActiveTabId: React.Dispatch<React.SetStateAction<string | null>>
) => {
  const autosaveTimers = useRef<Record<string, number>>({});

  const saveSession = useCallback(async () => {
    const session: SessionState = {
      tabs: tabs.map(({ id, path, name, isDirty, cursorPos, scrollPos, encoding, lineEnding }) => ({
        id, path, name, isDirty, cursorPos, scrollPos, encoding, lineEnding
      })),
      activeTabId
    };
    await apiInvoke('save_session', { session });
  }, [tabs, activeTabId]);

  // Debounced autosave to recovery file
  const triggerAutosave = useCallback((tabId: string, content: string) => {
    if (autosaveTimers.current[tabId]) {
      window.clearTimeout(autosaveTimers.current[tabId]);
    }

    autosaveTimers.current[tabId] = window.setTimeout(async () => {
      await apiInvoke('save_recovery_file', { id: tabId, content });
      delete autosaveTimers.current[tabId];
    }, AUTOSAVE_DEBOUNCE);
  }, []);

  // Save session whenever tabs or active tab changes
  useEffect(() => {
    if (tabs.length > 0) {
      saveSession();
    }
  }, [tabs, activeTabId, saveSession]);

  const loadSession = useCallback(async () => {
    try {
      const session = await apiInvoke<SessionState | null>('load_session');
      if (session && session.tabs.length > 0) {
        const loadedTabs: Tab[] = await Promise.all(session.tabs.map(async (t) => {
          let content = '';
          let isDirty = t.isDirty;
          let recoveryContent: string | null = null;

          try {
            recoveryContent = await apiInvoke<string>('load_recovery_file', { id: t.id });
          } catch {
            // No recovery file found
          }

          let diskContent = '';
          if (t.path) {
            try {
              const res = await apiInvoke<FileResponse>('read_text_file', { path: t.path, encoding_override: t.encoding });
              diskContent = res.content;
            } catch {
              // File might have been moved or deleted
            }
          }

          if (recoveryContent !== null) {
            // Check if it matches disk content
            if (recoveryContent !== diskContent) {
              const recover = await ask(
                `A recovery file for "${t.name}" was found. Do you want to restore it?`,
                { title: 'Crash Recovery', kind: 'warning' }
              );
              if (recover) {
                content = recoveryContent;
                isDirty = true;
              } else {
                content = diskContent;
                isDirty = false;
                // Clear the recovery file if user rejected it
                await apiInvoke('clear_recovery_file', { id: t.id });
              }
            } else {
              content = diskContent;
              isDirty = false;
              await apiInvoke('clear_recovery_file', { id: t.id });
            }
          } else {
            content = diskContent;
          }

          return {
            ...t,
            content,
            isDirty,
            encoding: t.encoding || 'UTF-8',
            lineEnding: t.lineEnding || 'LF'
          };
        }));

        setTabs(loadedTabs);
        setActiveTabId(session.activeTabId);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }, [setTabs, setActiveTabId]);

  return { loadSession, triggerAutosave };
};
