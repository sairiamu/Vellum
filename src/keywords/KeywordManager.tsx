import React, { useState } from 'react';
import { useKeywords } from './useKeywords';
import { KeywordStyle } from '../lib/types';

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
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="keyword-manager-content">
          <div className="category-list">
            {categories.map(cat => (
              <div key={cat.id} className="category-item">
                <div className="category-settings">
                  <input
                    type="checkbox"
                    checked={cat.enabled}
                    onChange={e => updateCategory(cat.id, { enabled: e.target.checked })}
                  />
                  <input
                    type="text"
                    value={cat.name}
                    onChange={e => updateCategory(cat.id, { name: e.target.value })}
                    placeholder="Category Name"
                  />
                  <input
                    type="color"
                    value={cat.color}
                    onChange={e => updateCategory(cat.id, { color: e.target.value })}
                  />
                  <select
                    value={cat.style}
                    onChange={e => updateCategory(cat.id, { style: e.target.value as KeywordStyle })}
                  >
                    <option value="background">Background</option>
                    <option value="underline">Underline</option>
                    <option value="bold">Bold</option>
                    <option value="glow">Glow</option>
                  </select>
                  <button className="delete-cat-btn" onClick={() => deleteCategory(cat.id)}>Delete</button>
                </div>

                <div className="word-tags">
                  {cat.words.map(word => (
                    <span key={word} className="word-tag">
                      {word}
                      <button onClick={() => removeWord(cat.id, word)}>&times;</button>
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
                    <button onClick={() => {
                      addWord(cat.id, newWords[cat.id]);
                      setNewWords({ ...newWords, [cat.id]: '' });
                    }}>Add</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="add-category-btn" onClick={addCategory}>+ Add Category</button>
        </div>
      </div>
    </div>
  );
};
