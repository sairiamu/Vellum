import React, { useState } from 'react';
import { useKeywords } from './useKeywords';
import { KeywordStyle } from '../lib/types';
import { Trash2, Plus, X, ChevronDown } from 'lucide-react';

interface KeywordManagerProps {
  onClose: () => void;
}

export const KeywordManager: React.FC<KeywordManagerProps> = ({ onClose }) => {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addWord,
    removeWord
  } = useKeywords();

  const [newWords, setNewWords] = useState<Record<string, string>>({});

  return (
    <div className="keyword-manager-overlay">
      <div className="keyword-manager-modal">
        <div className="keyword-manager-header">
          <h2>Keyword Highlighting</h2>
          <button className="close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="keyword-manager-content">
          <div className="category-list">
            {categories.map(cat => (
              <div key={cat.id} className="category-item">
                <div className="category-settings">
                  <label className="custom-checkbox">
                    <input
                      type="checkbox"
                      checked={cat.enabled}
                      onChange={e => updateCategory(cat.id, { enabled: e.target.checked })}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <input
                    type="text"
                    className="category-name-input"
                    value={cat.name}
                    onChange={e => updateCategory(cat.id, { name: e.target.value })}
                    placeholder="Category Name"
                  />
                  <input
                    type="color"
                    className="category-color-input"
                    value={cat.color}
                    onChange={e => updateCategory(cat.id, { color: e.target.value })}
                  />
                  <div className="custom-select-wrapper">
                    <select
                      value={cat.style}
                      onChange={e => updateCategory(cat.id, { style: e.target.value as KeywordStyle })}
                    >
                      <option value="background">Background</option>
                      <option value="underline">Underline</option>
                      <option value="bold">Bold</option>
                      <option value="glow">Glow</option>
                    </select>
                    <ChevronDown className="select-icon" size={14} />
                  </div>
                  <button className="delete-cat-btn" onClick={() => deleteCategory(cat.id)} title="Delete Category">
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>

                <div className="word-tags">
                  {cat.words.map(word => (
                    <span key={word} className="word-tag">
                      {word}
                      <button className="remove-word-btn" onClick={() => removeWord(cat.id, word)} title="Remove word">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <div className="add-word">
                    <input
                      type="text"
                      value={newWords[cat.id] || ''}
                      placeholder="Add word..."
                      onChange={e => setNewWords({ ...newWords, [cat.id]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          addWord(cat.id, newWords[cat.id]);
                          setNewWords({ ...newWords, [cat.id]: '' });
                        }
                      }}
                    />
                    <button className="add-word-btn" onClick={() => {
                      addWord(cat.id, newWords[cat.id]);
                      setNewWords({ ...newWords, [cat.id]: '' });
                    }}>
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="add-category-btn" onClick={addCategory}>
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        </div>
      </div>
    </div>
  );
};
