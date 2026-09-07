import { useState, useCallback, useEffect } from 'react';
import './App.css';
import './theme/tokens.css';
import { EditorPane, EditorStats } from './editor/EditorPane';
import { TabBar } from './tabs/TabBar';
import { StatusBar } from './statusbar/StatusBar';
import { Tab, TreeNode } from './lib/types';
import { apiInvoke, streamInvoke } from './lib/tauriApi';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useTabSession } from './tabs/useTabSession';

import { FileTree } from './explorer/FileTree';
import { useFileWatcher } from './explorer/useFileWatcher';
import { KeywordManager } from './keywords/KeywordManager';
import { useKeywords } from './keywords/useKeywords';

import { JsonTreeView } from './editor/formatViews/JsonTreeView';
import { CsvTableView } from './editor/formatViews/CsvTableView';
import { MarkdownPreview } from './editor/formatViews/MarkdownPreview';

import { CommandPalette, Command } from './commandPalette/CommandPalette';
import { useTheme, ThemeType } from './theme/ThemeProvider';
import { getRecentFiles, addRecentFile, RecentFile, togglePinRecentFile, removeRecentFile } from './lib/recentFiles';

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
  const [explorerTree, setExplorerTree] = useState<TreeNode | null>(null);
  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [showKeywordManager, setShowKeywordManager] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [stats, setStats] = useState<EditorStats>({
    wordCount: 0,
    charCount: 0,
    lineCount: 0,
    cursorPos: { line: 1, col: 1 }
  });

  const { loadSession, triggerAutosave } = useTabSession(tabs, activeTabId, setTabs, setActiveTabId);
  const { categories } = useKeywords();
  const {
    theme, setTheme,
    fontSize, setFontSize,
    fontFamily, setFontFamily
  } = useTheme();

  useEffect(() => {
    getRecentFiles().then(setRecentFiles);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'F11') {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    // Safety timeout to ensure app renders even if session loading hangs
    const timeout = setTimeout(() => {
      setIsLoaded(true);
    }, 2000);

    loadSession().finally(() => {
      clearTimeout(timeout);
      setIsLoaded(true);
    });
  }, [loadSession]);

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
              addRecentFile(selected, name).then(setRecentFiles);
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
          addRecentFile(selected, name).then(setRecentFiles);
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

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === 'string') {
        setCurrentFolderPath(selected);
        const tree = await apiInvoke<TreeNode>('get_directory_tree', { path: selected, showAll: showAllFiles });
        setExplorerTree(tree);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const handleToggleShowAll = async () => {
    const newVal = !showAllFiles;
    setShowAllFiles(newVal);
    if (currentFolderPath) {
      const tree = await apiInvoke<TreeNode>('get_directory_tree', { path: currentFolderPath, showAll: newVal });
      setExplorerTree(tree);
    }
  };

  const handleFileClick = async (path: string) => {
    const existingTab = tabs.find(t => t.path === path);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Open new file logic (simplified for tree)
    try {
      const res = await apiInvoke<FileResponse>('read_text_file', { path });
      const name = path.split(/[\\/]/).pop() || 'Untitled';
      const newTab: Tab = {
        id: crypto.randomUUID(),
        path,
        name,
        content: res.content,
        isDirty: false,
        encoding: res.encoding,
        lineEnding: res.line_ending
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      addRecentFile(path, name).then(setRecentFiles);
    } catch (error) {
      console.error('Failed to open file from tree:', error);
    }
  };

  const handleRefreshTree = useCallback(async () => {
    if (currentFolderPath) {
      const tree = await apiInvoke<TreeNode>('get_directory_tree', { path: currentFolderPath, showAll: showAllFiles });
      setExplorerTree(tree);
    }
  }, [currentFolderPath, showAllFiles]);

  const handlePinRecent = async (path: string) => {
    const updated = await togglePinRecentFile(path);
    setRecentFiles(updated);
  };

  const handleRemoveRecent = async (path: string) => {
    const updated = await removeRecentFile(path);
    setRecentFiles(updated);
  };

  const insertTimestamp = () => {
    if (!activeTabId) return;
    const timestamp = new Date().toLocaleString();
    handleContentChange(activeTab?.content + "\n" + timestamp);
  };

  const commands: Command[] = [
    { id: 'new-file', name: 'File: New', shortcut: 'Ctrl+N', action: createNewTab },
    { id: 'open-file', name: 'File: Open', shortcut: 'Ctrl+O', action: handleOpen },
    { id: 'save-file', name: 'File: Save', shortcut: 'Ctrl+S', action: handleSave },
    { id: 'open-folder', name: 'File: Open Folder', action: handleOpenFolder },
    { id: 'toggle-wrap', name: 'Editor: Toggle Word Wrap', action: () => setWordWrap(!wordWrap) },
    { id: 'insert-ts', name: 'Editor: Insert Timestamp', action: insertTimestamp },
    { id: 'focus-mode', name: 'View: Toggle Focus Mode', shortcut: 'F11', action: () => setIsFocusMode(!isFocusMode) },
    { id: 'keywords', name: 'View: Keyword Manager', action: () => setShowKeywordManager(true) },
    { id: 'find', name: 'Edit: Find', shortcut: 'Ctrl+F', action: () => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: !navigator.platform.includes('Mac'),
        metaKey: navigator.platform.includes('Mac'),
        bubbles: true
      }));
    }},
    { id: 'font-larger', name: 'Font: Increase Size', action: () => setFontSize(fontSize + 1) },
    { id: 'font-smaller', name: 'Font: Decrease Size', action: () => setFontSize(Math.max(8, fontSize - 1)) },
    { id: 'font-mono', name: 'Font: Switch to Monospace', action: () => setFontFamily("'Cascadia Code', monospace") },
    { id: 'font-sans', name: 'Font: Switch to Proportional', action: () => setFontFamily("-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif") },
    { id: 'enc-utf8', name: 'Encoding: UTF-8', action: () => handleEncodingChange('UTF-8') },
    { id: 'enc-utf16le', name: 'Encoding: UTF-16LE', action: () => handleEncodingChange('UTF-16LE') },
    { id: 'enc-windows1252', name: 'Encoding: Windows-1252 (ANSI)', action: () => handleEncodingChange('windows-1252') },
    { id: 'theme-glass', name: 'Theme: Glass', action: () => setTheme('glass') },
    { id: 'theme-clay', name: 'Theme: Clay', action: () => setTheme('clay') },
    { id: 'theme-skeuo', name: 'Theme: Skeuomorphic', action: () => setTheme('skeuo') },
    { id: 'theme-pure-glass', name: 'Theme: Pure Glass', action: () => setTheme('pure-glass') },
  ];

  const handleToggleViewMode = () => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, viewMode: t.viewMode === 'formatted' ? 'raw' : 'formatted' } : t
    ));
  };

  const getFormatType = (path?: string) => {
    if (!path) return null;
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext === 'json') return 'json';
    if (ext === 'csv') return 'csv';
    if (ext === 'md') return 'markdown';
    return null;
  };

  const formatType = getFormatType(activeTab?.path);
  const showFormatted = activeTab?.viewMode === 'formatted' && formatType;

  const renderFormattedView = () => {
    if (!activeTab) return null;
    return (
      <div className="formatted-view-container">
        {formatType === 'json' && <JsonTreeView content={activeTab.content} />}
        {formatType === 'csv' && <CsvTableView content={activeTab.content} />}
        {formatType === 'markdown' && <MarkdownPreview content={activeTab.content} />}
      </div>
    );
  };

  useFileWatcher(currentFolderPath, handleRefreshTree);

  if (!isLoaded) {
    return (
      <div className="empty-state">
        <p>Restoring session...</p>
      </div>
    );
  }

  return (
    <div className={`app-container ${isFocusMode ? 'focus-mode' : ''}`}>
      <FileTree
        tree={explorerTree}
        onFileClick={handleFileClick}
        showAll={showAllFiles}
        onToggleShowAll={handleToggleShowAll}
        onOpenFolder={handleOpenFolder}
        recentFiles={recentFiles}
        onPinRecent={handlePinRecent}
        onRemoveRecent={handleRemoveRecent}
      />
      <div className="main-view">
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
          <button onClick={() => setShowKeywordManager(true)}>Keywords</button>
          {formatType && (
            <button
              className={`format-toggle-btn ${activeTab?.viewMode === 'formatted' ? 'active' : ''}`}
              onClick={handleToggleViewMode}
            >
              {activeTab?.viewMode === 'formatted' ? 'Raw' : 'Formatted'}
            </button>
          )}
          <button onClick={() => {
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
            showFormatted ? renderFormattedView() : (
              <EditorPane
                key={activeTab.id}
                content={activeTab.content}
                onChange={handleContentChange}
                onStateChange={handleEditorStateChange}
                initialCursorPos={activeTab.cursorPos}
                initialScrollPos={activeTab.scrollPos}
                wordWrap={wordWrap}
                categories={categories}
              />
            )
          ) : (
            <div className="empty-state">
              <p>Vellum</p>
              <button onClick={createNewTab}>Create new file</button>
              <button onClick={handleOpen}>Open existing file</button>
              <button onClick={handleOpenFolder}>Open Folder</button>
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
      {showKeywordManager && (
        <KeywordManager onClose={() => setShowKeywordManager(false)} />
      )}
      {showCommandPalette && (
        <CommandPalette commands={commands} onClose={() => setShowCommandPalette(false)} />
      )}
    </div>
  );
}

export default App;
