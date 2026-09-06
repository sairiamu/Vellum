import { useState, useCallback } from 'react';
import './App.css';
import './theme/tokens.css';
import { EditorPane } from './editor/EditorPane';
import { TabBar } from './tabs/TabBar';
import { Tab } from './lib/types';
import { apiInvoke } from './lib/tauriApi';
import { open, save } from '@tauri-apps/plugin-dialog';

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const createNewTab = useCallback(() => {
    const newTab: Tab = {
      id: crypto.randomUUID(),
      name: 'Untitled',
      content: '',
      isDirty: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleTabClose = (tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      }
      return newTabs;
    });
  };

  const handleContentChange = (newContent: string) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, content: newContent, isDirty: true } : t
    ));
  };

  const handleOpen = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Text Files', extensions: ['txt', 'md', 'json', 'csv', 'log'] }]
      });

      if (selected && typeof selected === 'string') {
        const content = await apiInvoke<string>('read_text_file', { path: selected });
        const name = selected.split(/[\\/]/).pop() || 'Untitled';

        const newTab: Tab = {
          id: crypto.randomUUID(),
          path: selected,
          name: name,
          content: content,
          isDirty: false
        };

        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
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
        await apiInvoke('write_text_file', { path, content: activeTab.content });
        const name = path.split(/[\\/]/).pop() || 'Untitled';
        setTabs(prev => prev.map(t =>
          t.id === activeTab.id ? { ...t, path, name, isDirty: false } : t
        ));
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  return (
    <div className="app-container">
      <div className="toolbar">
        <button onClick={createNewTab}>New</button>
        <button onClick={handleOpen}>Open</button>
        <button onClick={handleSave} disabled={!activeTab}>Save</button>
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
    </div>
  );
}

export default App;
