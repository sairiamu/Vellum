import React, { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { search, searchKeymap } from '@codemirror/search';
import { keywordHighlight, keywordCategoriesFacet } from './extensions/keywordHighlight';
import { KeywordCategory } from '../lib/types';

const keywordCompartment = new Compartment();

export interface EditorStats {
  wordCount: number;
  charCount: number;
  lineCount: number;
  cursorPos: { line: number; col: number };
}

interface EditorPaneProps {
  content: string;
  onChange: (newContent: string) => void;
  onStateChange?: (cursorPos: number, scrollPos: number, stats: EditorStats) => void;
  initialCursorPos?: number;
  initialScrollPos?: number;
  wordWrap?: boolean;
  categories?: KeywordCategory[];
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  content,
  onChange,
  onStateChange,
  initialCursorPos = 0,
  initialScrollPos = 0,
  wordWrap = true,
  categories = []
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const getStats = (state: EditorState): EditorStats => {
    const doc = state.doc;
    const charCount = doc.length;
    const lineCount = doc.lines;

    // Word count - iterate through chunks to be memory efficient for large files
    let wordCount = 0;
    const iter = doc.iter();
    while (!iter.done) {
      const chunk = iter.next().value;
      if (chunk) {
        const matches = chunk.match(/\b\w+\b/g);
        if (matches) {
          wordCount += matches.length;
        }
      }
    }

    const selection = state.selection.main;
    const line = doc.lineAt(selection.head);
    const cursorPos = {
      line: line.number,
      col: selection.head - line.from + 1
    };

    return { wordCount, charCount, lineCount, cursorPos };
  };

  const statsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const safeCursorPos = Math.min(initialCursorPos, content.length);

    const startState = EditorState.create({
      doc: content,
      selection: { anchor: safeCursorPos },
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        search({ top: true }), // Minimal search at the top
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        keywordCompartment.of(keywordCategoriesFacet.of(categories)),
        keywordHighlight(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }

          if (update.selectionSet || update.docChanged || update.geometryChanged) {
            if (statsTimeoutRef.current) window.clearTimeout(statsTimeoutRef.current);

            statsTimeoutRef.current = window.setTimeout(() => {
              const cursorPos = update.state.selection.main.head;
              const scrollPos = update.view.scrollDOM.scrollTop;
              const stats = getStats(update.state);
              onStateChange?.(cursorPos, scrollPos, stats);
            }, 100);
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

  // Handle keyword categories updates
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: keywordCompartment.reconfigure(keywordCategoriesFacet.of(categories))
      });
    }
  }, [categories]);

  return <div ref={editorRef} className="editor-pane" style={{ height: '100%', width: '100%' }} />;
};
