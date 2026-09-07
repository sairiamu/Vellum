import React from 'react';
import { TreeNode as TreeNodeType } from '../lib/types';
import { TreeNode } from './TreeNode';
import { RecentFile } from '../lib/recentFiles';

interface FileTreeProps {
  tree: TreeNodeType | null;
  onFileClick: (path: string) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
  onOpenFolder: () => void;
  recentFiles?: RecentFile[];
  onPinRecent?: (path: string) => void;
  onRemoveRecent?: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  tree,
  onFileClick,
  showAll,
  onToggleShowAll,
  onOpenFolder,
  recentFiles = [],
  onPinRecent,
  onRemoveRecent
}) => {
  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <span>EXPLORER</span>
        <div className="explorer-actions">
          <button onClick={onToggleShowAll} title={showAll ? "Hide unknown files" : "Show all files"}>
            {showAll ? '★' : '☆'}
          </button>
          <button onClick={onOpenFolder} title="Open Folder">📁</button>
        </div>
      </div>
      <div className="explorer-content">
        {recentFiles.length > 0 && (
          <div className="recent-files-section">
            <div className="section-header">RECENT</div>
            {recentFiles.map(file => (
              <div key={file.path} className="recent-file-item" onClick={() => onFileClick(file.path)}>
                <span className="node-icon">{file.pinned ? '📌' : '📄'}</span>
                <span className="node-name" title={file.path}>{file.name}</span>
                <div className="recent-actions">
                   <button onClick={(e) => { e.stopPropagation(); onPinRecent?.(file.path); }}>
                     {file.pinned ? '📍' : '📌'}
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); onRemoveRecent?.(file.path); }}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="section-header">FILES</div>
        {tree ? (
          <TreeNode node={tree} onFileClick={onFileClick} />
        ) : (
          <div className="explorer-empty">
            <p>No folder open</p>
            <button onClick={onOpenFolder}>Open Folder</button>
          </div>
        )}
      </div>
    </div>
  );
};
