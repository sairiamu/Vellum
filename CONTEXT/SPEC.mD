markdown
# Vellum — Technical Specification

## 1. Project Structure

vellum/
├── src-tauri/ # Rust backend
│ ├── src/
│ │ ├── main.rs
│ │ ├── commands/ # Tauri command handlers, grouped by domain
│ │ │ ├── file_io.rs # open/save/autosave/read-large-file streaming
│ │ │ ├── file_tree.rs # folder walking, watching (notify crate)
│ │ │ ├── settings.rs # tauri-plugin-store wrapper
│ │ │ ├── format.rs # JSON pretty-print, CSV parse, MD render
│ │ │ └── mod.rs
│ │ ├── models/ # shared Rust structs (FileMeta, TreeNode, etc.)
│ │ └── state.rs # app state (open files, watched folders)
│ ├── Cargo.toml
│ └── tauri.conf.json # window config: transparent: true (for glass mode),
│ # decorations: false, min window size, etc.
│
├── src/ # Frontend (React + TypeScript)
│ ├── main.tsx
│ ├── App.tsx
│ ├── editor/
│ │ ├── EditorPane.tsx # CodeMirror 6 wrapper
│ │ ├── extensions/
│ │ │ ├── keywordHighlight.ts # CM6 decoration plugin for user keywords
│ │ │ ├── lineWrap.ts
│ │ │ └── largeFileMode.ts # virtualization tuning for big files
│ │ └── formatViews/
│ │ ├── JsonTreeView.tsx
│ │ ├── CsvTableView.tsx
│ │ └── MarkdownPreview.tsx
│ ├── explorer/
│ │ ├── FileTree.tsx
│ │ ├── TreeNode.tsx
│ │ └── useFileWatcher.ts
│ ├── tabs/
│ │ ├── TabBar.tsx
│ │ └── useTabSession.ts # session restore logic
│ ├── theme/
│ │ ├── ThemeProvider.tsx
│ │ ├── themes/
│ │ │ ├── glass.css
│ │ │ ├── clay.css
│ │ │ ├── skeuo.css
│ │ │ └── pure-glass.css # + brightness/glow controls
│ │ └── tokens.css # shared CSS custom properties
│ ├── keywords/
│ │ ├── KeywordManager.tsx # UI to add/edit/categorize/color keywords
│ │ └── defaultKeywords.ts
│ ├── statusbar/
│ │ └── StatusBar.tsx # word/char/line count, encoding, line-ending
│ ├── commandPalette/
│ │ └── CommandPalette.tsx
│ └── lib/
│ ├── tauriApi.ts # typed wrappers around invoke() calls
│ └── types.ts
│
├── /CONTEXT/
│ ├── CONTEXT.md
│ └── SPEC.md
└── package.json


## 2. Feature Breakdown by Milestone

### v1 (MVP)
- Multi-tab open/save/new, unsaved-changes indicator
- Session restore (tabs, cursor pos, scroll pos, active theme)
- Autosave + crash recovery (debounced writes to temp/recovery location via Rust)
- Encoding detection (UTF-8/UTF-16/ANSI) + line-ending detection (CRLF/LF/CR), shown in status bar,
  user-overridable
- Word wrap (default on, toggleable)
- Font family + size control (monospace + proportional option)
- Find & Replace (plain text default, regex opt-in)
- Word/char/line count in status bar
- Basic theme engine scaffolding: Glass, Clay, Skeuomorphic themes selectable (even if not fully
  polished yet)
- File/folder explorer sidebar: open folder, tree view, click to open file in tab
- Large file handling: virtualized rendering in CodeMirror, streamed reads from Rust for files above
  a size threshold (define threshold, e.g. 10MB triggers streaming path)

### v2
- Pure Glass Mode with brightness/glow slider
- Keyword highlighting system (user-managed word list, categories, colors) — CodeMirror decoration
  plugin
- Format-aware views: JSON pretty-print + collapsible tree, CSV table view, Markdown live preview
  (all as toggleable overlays on raw text)
- Command palette
- Distraction-free/focus mode
- Recent files list, pinned favorites
- Quick-timestamp insert shortcut

### v3
- Global hotkey quick-note popup window (always-on-top mini Vellum)
- Theme blending / custom theme editor
- Import/export keyword lists
- OS "Open With" registration polish, file-type icon integration

## 3. Theme Engine

All three visual styles (glass, clay, skeuomorphic) are implemented via a shared set of CSS custom
properties, swapped per theme — not three duplicated stylesheets. Minimum property set:

--surface-bg
--surface-blur /* 0 for clay/skeuo, >0 for glass /
--surface-border
--shadow-primary / single soft shadow for glass, dual light/dark for clay /
--shadow-secondary
--radius-sm / --radius-md / --radius-lg
--text-glow-color
--text-glow-intensity / controlled by Pure Glass Mode brightness slider, 0 by default /
--contrast-floor / minimum text/background contrast enforced regardless of theme */


**Pure Glass Mode specifics:**
- Requires `transparent: true`, `decorations: false` in `tauri.conf.json`, custom titlebar
- Brightness/glow slider maps to `--text-glow-intensity`, applied via `text-shadow`
- Must enforce `--contrast-floor` — if computed contrast against desktop background is unknowable,
  default to a safe minimum backing opacity (e.g. never fully 0% surface opacity) rather than pure
  see-through text on nothing

## 4. Keyword Highlighting System

**Data model (settings store):**
```ts
type KeywordCategory = {
  id: string;
  name: string;           // e.g. "Faith", "Names", "Warnings"
  color: string;           // hex
  style: "background" | "underline" | "bold" | "glow";
  words: string[];         // e.g. ["God", "Jesus", "love"]
  enabled: boolean;
};
```
- Ships with one small default category (few example words) — never hardcoded/locked, fully editable
- Matching: word-boundary aware, case-insensitive by default (configurable), compiled into a single
  regex or trie per category for performance
- Implemented as a CodeMirror 6 `ViewPlugin` producing `Decoration`s — must re-run efficiently on
  document change (incremental, not full-document rescan on every keystroke for large files)
- `KeywordManager.tsx` UI: add/remove words, create/edit categories, assign color + style per category

## 5. Format-Aware Viewing

- Detect file type by extension on open
- Show a toggle in the tab/toolbar: "Raw" (default) vs "Formatted"
- **JSON:** "Formatted" = pretty-printed + collapsible tree (property-level expand/collapse)
- **CSV:** "Formatted" = HTML table, sticky header row, column auto-width
- **Markdown:** "Formatted" = live preview pane (split: raw left, rendered right, or toggle-only —
  decide in implementation; split is preferred if it doesn't hurt perf)
- Formatted views are read-only rendering layers; editing always happens in the raw text view

## 6. File Explorer

- Rust command walks directory (`walkdir`), returns tree structure to frontend
- Default filter: show `.txt`, `.md`, `.json`, `.csv`, `.log` + folders; toggle to "show all files"
- `notify` crate watches the open folder for external changes; frontend gets a event to refresh tree
- Click file → opens in new tab (or focuses existing tab if already open)
- Right-click context menu: rename, delete, reveal in OS file manager

## 7. Status Bar Contents
Word count | character count | line count | current encoding | line-ending type | cursor position
(line:col) | current theme indicator

## 8. Non-Functional Requirements
- Cold start target: comparable to or faster than Windows Notepad (benchmark early, treat regressions
  as bugs)
- No blocking main-thread work for files up to 500MB
- All settings/keyword data persisted locally via `tauri-plugin-store`; no network calls required for
  core functionality
- Accessibility: minimum contrast floor enforced in every theme, keyboard-navigable command palette
  and file tree

## 9. Open Decisions (flag to user, do not silently assume)
- Exact large-file streaming threshold (suggested default: 10MB)
- Whether Markdown preview is split-pane or toggle-only
- Whether spellcheck uses OS-native APIs only or is deferred entirely to v3
- Global hotkey default keybinding for quick-note popup (v3)