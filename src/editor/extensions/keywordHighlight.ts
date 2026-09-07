import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder, Facet } from "@codemirror/state";
import { KeywordCategory } from "../../lib/types";

// Facet to provide keyword categories to the extension
export const keywordCategoriesFacet = Facet.define<KeywordCategory[]>({
  combine: values => values.length ? values[values.length - 1] : []
});

const keywordTheme = EditorView.baseTheme({
  ".cm-keyword-background": {
    borderRadius: "2px",
    padding: "0 1px",
  },
  ".cm-keyword-underline": {
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
  ".cm-keyword-bold": {
    fontWeight: "bold",
  },
  ".cm-keyword-glow": {
    // Glow effect is handled via inline styles for specific colors
  }
});

export const keywordHighlightPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.computeDecorations(view);
  }

  update(update: ViewUpdate) {
    const prevCategories = update.startState.facet(keywordCategoriesFacet);
    const currCategories = update.state.facet(keywordCategoriesFacet);

    if (update.docChanged || update.viewportChanged || prevCategories !== currCategories) {
      this.decorations = this.computeDecorations(update.view);
    }
  }

  computeDecorations(view: EditorView): DecorationSet {
    const categories = view.state.facet(keywordCategoriesFacet);
    const builder = new RangeSetBuilder<Decoration>();
    const activeCategories = categories.filter(c => c.enabled && c.words.length > 0);

    if (activeCategories.length === 0) return Decoration.none;

    const wordMap = new Map<string, KeywordCategory>();
    activeCategories.forEach(cat => {
      cat.words.forEach(word => {
        if (word.trim()) {
          wordMap.set(word.toLowerCase(), cat);
        }
      });
    });

    const words = Array.from(wordMap.keys()).sort((a, b) => b.length - a.length);
    if (words.length === 0) return Decoration.none;

    // Build a single regex for all keywords
    const regex = new RegExp(`\\b(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

    // Only scan the visible viewport for performance (this is the "incremental" part for large docs)
    for (let { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      let match;
      while ((match = regex.exec(text)) !== null) {
        const start = from + match.index;
        const end = start + match[0].length;
        const word = match[0].toLowerCase();
        const category = wordMap.get(word);

        if (category) {
          builder.add(start, end, Decoration.mark({
            class: `cm-keyword-${category.style}`,
            attributes: {
              style: this.getStyleString(category)
            }
          }));
        }
      }
    }

    return builder.finish();
  }

  getStyleString(category: KeywordCategory): string {
    const color = category.color;
    switch (category.style) {
      case 'background':
        return `background-color: ${color}44; border-bottom: 1px solid ${color};`;
      case 'underline':
        return `text-decoration-color: ${color}; text-decoration-thickness: 2px;`;
      case 'bold':
        return `color: ${color};`;
      case 'glow':
        return `color: ${color}; text-shadow: 0 0 5px ${color}, 0 0 10px ${color};`;
      default:
        return '';
    }
  }
}, {
  decorations: v => v.decorations
});

export const keywordHighlight = () => [keywordTheme, keywordHighlightPlugin];
