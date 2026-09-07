import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export interface Command {
  id: string;
  name: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  commands: Command[];
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ commands, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll into view
  useEffect(() => {
    const selectedElement = resultsRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input">
          <Search size={18} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="command-palette-results" ref={resultsRef}>
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
              >
                <span className="command-name">{cmd.name}</span>
                {cmd.shortcut && <span className="command-shortcut">{cmd.shortcut}</span>}
              </div>
            ))
          ) : (
            <div className="command-no-results">No commands found</div>
          )}
        </div>
      </div>
    </div>
  );
};
