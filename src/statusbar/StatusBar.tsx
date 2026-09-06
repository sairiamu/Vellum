import React from 'react';

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
        <select value={encoding} onChange={(e) => onEncodingChange(e.target.value)}>
          <option value="UTF-8">UTF-8</option>
          <option value="UTF-16LE">UTF-16LE</option>
          <option value="UTF-16BE">UTF-16BE</option>
          <option value="windows-1252">ANSI (Windows-1252)</option>
        </select>
        <select value={lineEnding} onChange={(e) => onLineEndingChange(e.target.value)}>
          <option value="LF">LF</option>
          <option value="CRLF">CRLF</option>
          <option value="CR">CR</option>
        </select>
      </div>
    </div>
  );
};
