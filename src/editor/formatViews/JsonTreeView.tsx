import React, { useState } from 'react';

interface JsonNodeProps {
  data: any;
  label?: string;
  depth?: number;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, label, depth = 0 }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isObject = data !== null && typeof data === 'object';
  const type = Array.isArray(data) ? 'array' : typeof data;

  const toggle = () => setIsCollapsed(!isCollapsed);

  const renderValue = () => {
    if (data === null) return <span className="json-null">null</span>;
    if (typeof data === 'string') return <span className="json-string">"{data}"</span>;
    if (typeof data === 'number') return <span className="json-number">{data}</span>;
    if (typeof data === 'boolean') return <span className="json-boolean">{String(data)}</span>;
    return null;
  };

  return (
    <div className="json-node" style={{ marginLeft: depth > 0 ? '20px' : '0' }}>
      <div className="json-line" onClick={isObject ? toggle : undefined}>
        {isObject && (
          <span className={`json-toggle ${isCollapsed ? 'collapsed' : ''}`}>
            {isCollapsed ? '▶' : '▼'}
          </span>
        )}
        {label && <span className="json-label">{label}: </span>}
        {isObject ? (
          <span className="json-bracket">
            {Array.isArray(data) ? '[' : '{'}
            {isCollapsed && (
              <span className="json-placeholder">
                {Array.isArray(data) ? ` ${data.length} items ` : ' ... '}
                {Array.isArray(data) ? ']' : '}'}
              </span>
            )}
          </span>
        ) : (
          renderValue()
        )}
      </div>
      {!isCollapsed && isObject && (
        <div className="json-children">
          {Object.entries(data).map(([key, value]) => (
            <JsonNode key={key} label={key} data={value} depth={depth + 1} />
          ))}
          <div className="json-bracket" style={{ marginLeft: '0' }}>
            {Array.isArray(data) ? ']' : '}'}
          </div>
        </div>
      )}
    </div>
  );
};

export const JsonTreeView: React.FC<{ content: string }> = ({ content }) => {
  try {
    const data = JSON.parse(content);
    return (
      <div className="json-tree-view">
        <JsonNode data={data} />
      </div>
    );
  } catch (e) {
    return (
      <div className="json-error">
        <h3>Invalid JSON</h3>
        <pre>{(e as Error).message}</pre>
      </div>
    );
  }
};
