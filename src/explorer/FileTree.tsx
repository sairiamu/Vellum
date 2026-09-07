import React from 'react';
import { TreeNode as TreeNodeType } from '../lib/types';
import { TreeNode } from './TreeNode';

interface FileTreeProps {
  tree: TreeNodeType | null;
  onFileClick: (path: string) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
  onOpenFolder: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  tree,
  onFileClick,
  showAll,
  onToggleShowAll,
  onOpenFolder
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
