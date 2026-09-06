import { useState, useCallback, useEffect } from 'react';
import './App.css';
import './theme/tokens.css';
import { EditorPane, EditorStats } from './editor/EditorPane';
import { TabBar } from './tabs/TabBar';
import { StatusBar } from './statusbar/StatusBar';
import { Tab } from './lib/types';
import { apiInvoke, streamInvoke } from './lib/tauriApi';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useTabSession } from './tabs/useTabSession';

interface FileResponse {
  content: string;
  encoding: string;
  line_ending: string;
  size?: number;
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLargeFile, setIsLargeFile] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [stats, setStats] = useState<EditorStats>({
    wordCount: 0,
    charCount: 0,
    lineCount: 0,
    cursorPos: { line: 1, col: 1 }
  });

  const { loadSession, triggerAutosave } = useTabSession(tabs, activeTabId, setTabs, setActiveTabId);

  useEffect(() => {
    loadSession().then(() => setIsLoaded(true));
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const createNewTab = useCallback(() => {
    const newTab: Tab = {
      id: crypto.randomUUID(),
      name: 'Untitled',
      content: '',
      isDirty: false,
      encoding: 'UTF-8',
      lineEnding: 'LF'
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleTabClose = async (tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      }
      return newTabs;
    });
    await apiInvoke('clear_recovery_file', { id: tabId });
  };

  const handleContentChange = (newContent: string) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, content: newContent, isDirty: true } : t
    ));
    triggerAutosave(activeTabId, newContent);
  };

  const handleEditorStateChange = (cursorPos: number, scrollPos: number, newStats: EditorStats) => {
    if (!activeTabId) return;
    setStats(newStats);
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, cursorPos, scrollPos } : t
    ));
  };

  const handleOpen = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Text Files', extensions: ['txt', 'md', 'json', 'csv', 'log'] }]
      });

      if (selected && typeof selected === 'string') {
        const startTime = performance.now();
        // Check size first via metadata or use a separate command
        // For now, let's try a regular read and check size from response,
        // OR better, we use a command that returns metadata first.

        // Let's use read_text_file which I just updated to include size
        const firstRes = await apiInvoke<FileResponse>('read_text_file', { path: selected });
        const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB

        if (firstRes.size && firstRes.size > LARGE_FILE_THRESHOLD) {
          setIsLargeFile(true);
          let fullContent = "";
          let currentSize = 0;

          streamInvoke('read_text_file_stream', { path: selected }, (event) => {
            if (event.type === 'Chunk') {
              fullContent += event.payload;
              currentSize += event.payload.length;
              setLoadProgress(Math.min(99, Math.round((currentSize / (firstRes.size || 1)) * 100)));
            } else if (event.type === 'Complete') {
              const name = selected.split(/[\\/]/).pop() || 'Untitled';
              const newTab: Tab = {
                id: crypto.randomUUID(),
                path: selected,
                name: name,
                content: fullContent,
                isDirty: false,
                encoding: event.payload.encoding,
                lineEnding: event.payload.line_ending,
                isLargeMode: true
              };
              setTabs(prev => [...prev, newTab]);
              setActiveTabId(newTab.id);
              setIsLargeFile(false);
              setLoadProgress(0);
              const endTime = performance.now();
              console.log(`Large file opened in ${endTime - startTime}ms`);
            } else if (event.type === 'Error') {
              console.error('Stream error:', event.payload);
              setIsLargeFile(false);
            }
          });
        } else {
          const name = selected.split(/[\\/]/).pop() || 'Untitled';
          const newTab: Tab = {
            id: crypto.randomUUID(),
            path: selected,
            name: name,
            content: firstRes.content,
            isDirty: false,
            encoding: firstRes.encoding,
            lineEnding: firstRes.line_ending
          };
          setTabs(prev => [...prev, newTab]);
          setActiveTabId(newTab.id);
          const endTime = performance.now();
          console.log(`File opened in ${endTime - startTime}ms`);
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const handleSave = async () => {
    if (!activeTab) return;

    try {
      let path = activeTab.path;
      if (!path) {
        path = await save({
          defaultPath: activeTab.name,
          filters: [{ name: 'Text Files', extensions: ['txt', 'md', 'json', 'csv', 'log'] }]
        }) || undefined;
      }

      if (path) {
        await apiInvoke('write_text_file', {
          path,
          content: activeTab.content,
          encoding: activeTab.encoding,
          lineEnding: activeTab.lineEnding
        });
        const name = path.split(/[\\/]/).pop() || 'Untitled';
        setTabs(prev => prev.map(t =>
          t.id === activeTab.id ? { ...t, path, name, isDirty: false } : t
        ));
        await apiInvoke('clear_recovery_file', { id: activeTab.id });
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const handleEncodingChange = (newEncoding: string) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, encoding: newEncoding, isDirty: true } : t
    ));
  };

  const handleLineEndingChange = (newLineEnding: string) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, lineEnding: newLineEnding, isDirty: true } : t
    ));
  };

  if (!isLoaded) {
    return (
      <div className="empty-state">
        <p>Restoring session...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {isLargeFile && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading large file... {loadProgress}%</p>
        </div>
      )}
      <div className="toolbar">
        <button onClick={createNewTab}>New</button>
        <button onClick={handleOpen}>Open</button>
        <button onClick={handleSave} disabled={!activeTab}>Save</button>
        <button onClick={() => {
          // A bit of a hack to trigger the search panel from outside
          // but effective for a simple toolbar button
          window.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'f',
            ctrlKey: !navigator.platform.includes('Mac'),
            metaKey: navigator.platform.includes('Mac'),
            bubbles: true
          }));
        }} disabled={!activeTab}>Find</button>
      </div>
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={createNewTab}
      />
      <main className="editor-container">
        {activeTab ? (
          <EditorPane
            key={activeTab.id}
            content={activeTab.content}
            onChange={handleContentChange}
            onStateChange={handleEditorStateChange}
            initialCursorPos={activeTab.cursorPos}
            initialScrollPos={activeTab.scrollPos}
            wordWrap={true}
          />
        ) : (
          <div className="empty-state">
            <p>Vellum</p>
            <button onClick={createNewTab}>Create new file</button>
            <button onClick={handleOpen}>Open existing file</button>
          </div>
        )}
      </main>
      {activeTab && (
        <StatusBar
          {...stats}
          encoding={activeTab.encoding}
          lineEnding={activeTab.lineEnding}
          isLargeFile={activeTab.isLargeMode}
          onEncodingChange={handleEncodingChange}
          onLineEndingChange={handleLineEndingChange}
        />
      )}
    </div>
  );
}

export default App;
