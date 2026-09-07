import React from 'react';
import { useTheme, ThemeType } from '../theme/ThemeProvider';
import { ChevronDown } from 'lucide-react';

interface StatusBarProps {
  wordCount: number;
  charCount: number;
  lineCount: number;
  cursorPos: { line: number; col: number };
  encoding: string;
  lineEnding: string;
  isLargeFile?: boolean;
  onEncodingChange: (encoding: string) => void;
  onLineEndingChange: (lineEnding: string) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  wordCount,
  charCount,
  lineCount,
  cursorPos,
  encoding,
  lineEnding,
  isLargeFile,
  onEncodingChange,
  onLineEndingChange,
}) => {
  const { theme, setTheme, glowIntensity, setGlowIntensity } = useTheme();

  return (
    <div className="status-bar">
      <div className="status-left">
        {isLargeFile && <span className="large-file-badge">LARGE FILE MODE</span>}
        <span>Words: {wordCount}</span>
        <span>Chars: {charCount}</span>
        <span>Lines: {lineCount}</span>
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
      </div>
      <div className="status-right">
        {theme === 'pure-glass' && (
          <div className="glow-control">
            <label>Glow</label>
            <input
              type="range"
              min="0"
              max="20"
              value={glowIntensity}
              onChange={(e) => setGlowIntensity(parseInt(e.target.value))}
            />
          </div>
        )}
        <div className="custom-select-wrapper">
          <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeType)}>
            <option value="glass">Glass</option>
            <option value="clay">Clay</option>
            <option value="skeuo">Skeuomorphic</option>
            <option value="pure-glass">Pure Glass</option>
          </select>
          <ChevronDown className="select-icon" size={12} />
        </div>
        <div className="custom-select-wrapper">
          <select value={encoding} onChange={(e) => onEncodingChange(e.target.value)}>
            <option value="UTF-8">UTF-8</option>
            <option value="UTF-16LE">UTF-16LE</option>
            <option value="UTF-16BE">UTF-16BE</option>
            <option value="windows-1252">ANSI (Windows-1252)</option>
          </select>
          <ChevronDown className="select-icon" size={12} />
        </div>
        <div className="custom-select-wrapper">
          <select value={lineEnding} onChange={(e) => onLineEndingChange(e.target.value)}>
            <option value="LF">LF</option>
            <option value="CRLF">CRLF</option>
            <option value="CR">CR</option>
          </select>
          <ChevronDown className="select-icon" size={12} />
        </div>
      </div>
    </div>
  );
};
