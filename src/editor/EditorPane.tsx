import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';

interface EditorPaneProps {
  content: string;
  onChange: (newContent: string) => void;
  onStateChange?: (cursorPos: number, scrollPos: number) => void;
  initialCursorPos?: number;
  initialScrollPos?: number;
  wordWrap?: boolean;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  content,
  onChange,
  onStateChange,
  initialCursorPos = 0,
  initialScrollPos = 0,
  wordWrap = true
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: content,
      selection: { anchor: initialCursorPos },
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
          if (update.selectionSet || update.docChanged || update.geometryChanged) {
            const cursorPos = update.state.selection.main.head;
            const scrollPos = update.view.scrollDOM.scrollTop;
            onStateChange?.(cursorPos, scrollPos);
          }
        }),
        wordWrap ? EditorView.lineWrapping : [],
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    // Restore scroll position after a short delay to ensure rendering
    setTimeout(() => {
      view.scrollDOM.scrollTop = initialScrollPos;
    }, 0);

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []); // Only on mount

  // Handle external content updates (e.g. switching tabs or loading file)
  useEffect(() => {
    if (viewRef.current && content !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: content }
      });
    }
  }, [content]);

  return <div ref={editorRef} className="editor-pane" style={{ height: '100%', width: '100%' }} />;
};
