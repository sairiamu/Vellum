import React, { useState } from 'react';
import { TreeNode as TreeNodeType } from '../lib/types';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';

interface TreeNodeProps {
  node: TreeNodeType;
  onFileClick: (path: string) => void;
  level?: number;
}

export const TreeNode: React.FC<TreeNodeProps> = ({ node, onFileClick, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDirectory = !!node.children;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onFileClick(node.path);
    }
  };

  return (
    <div className="tree-node-wrapper">
      <div
        className={`tree-node ${isDirectory ? 'directory' : 'file'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleToggle}
      >
        <span className="node-icon">
          {isDirectory ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <FileText size={14} />
          )}
        </span>
        <span className="node-name">{node.name}</span>
      </div>
      {isDirectory && isOpen && node.children && (
        <div className="tree-node-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              onFileClick={onFileClick}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
