import React, { useMemo } from 'react';
import { marked } from 'marked';

export const MarkdownPreview: React.FC<{ content: string }> = ({ content }) => {
  const html = useMemo(() => {
    return marked(content || '');
  }, [content]);

  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
