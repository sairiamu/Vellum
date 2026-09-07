import React from 'react';
import { Tab } from '../lib/types';
import { X, Plus } from 'lucide-react';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }) => {
  return (
    <div className="tab-bar">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onTabClick(tab.id)}
          >
            <span className="tab-name">{tab.name}</span>
            {tab.isDirty && <span className="dirty-indicator"></span>}
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              title="Close Tab"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <button className="new-tab-btn" onClick={onNewTab} title="New Tab">
        <Plus size={18} />
      </button>
    </div>
  );
};
