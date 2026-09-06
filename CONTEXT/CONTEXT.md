# Vellum — Project Context

## What Vellum Is
Vellum is a fast, beautiful, native-feel text editor built with Tauri (Rust backend + web frontend).
It is a **Notepad replacement**, not a code editor. Think "Notepad, but if it were designed in 2026
by someone who cares about craft" — not VS Code, not Sublime, not a code IDE.

## Who It's For
People who write: notes, journals, drafts, logs, quick scratch text, markdown files, exported data
(CSV/JSON) they just want to *read* comfortably. Power users who are tired of Notepad's limitations
but don't want the complexity/weight of a full IDE.

## Core Product Philosophy
1. **Notepad-first, Pro-second.** Every feature must not compromise the "opens instantly, feels light,
   just works" core. If a feature adds friction to the basic "open app, type, save" loop, it must be
   optional/toggleable, never default-on complexity.
2. **Raw text is the default truth.** Formatted views (JSON tree, CSV table, MD preview) are always
   *opt-in overlays* on top of raw text, never a replacement for it. The user can always drop back to
   raw text.
3. **Visual identity is a first-class feature, not decoration.** The glass/clay/skeuomorphic theming
   and the Pure Glass Mode are part of the product's core appeal — treat the theme engine with the
   same seriousness as file I/O. But readability/accessibility must never be sacrificed for aesthetics
   — every glass/glow state needs a legible fallback.
4. **No code-editor scope creep.** Explicitly out of scope: syntax highlighting for programming
   languages, multi-cursor editing, language servers, debugging, git integration, extension
   marketplaces, terminal panes. If a suggested feature smells like "VS Code lite," push back on it.
5. **Personal, not generic.** The keyword-highlighting system exists because this editor should feel
   like *the user's* tool — their important words, their colors, their categories. Default keyword
   set is intentionally small and user-editable, never a fixed/locked list.
6. **Performance is a feature.** Large files (hundreds of MB, e.g. logs) must not freeze the UI.
   Startup time is a competitive differentiator versus Notepad — do not regress it casually.

## Tech Stack (fixed decisions — do not deviate without discussion)
- **Shell:** Tauri (Rust backend, webview frontend)
- **Editor engine:** CodeMirror 6 (not Monaco — too heavy/code-oriented for this use case; not a raw
  `<textarea>` — need virtualization for large files)
- **Frontend framework:** React (functional components, hooks) + TypeScript
- **Styling:** CSS custom properties driven theme engine (see SPEC.md) — no CSS-in-JS runtime overhead
- **State/settings persistence:** `tauri-plugin-store` (JSON-backed)
- **File system ops:** Rust side (`std::fs`, `walkdir` for tree traversal, `notify` for watching)
- **Markdown rendering:** `pulldown-cmark` (Rust) → sanitized HTML, or `markdown-it` (JS) — decide in
  implementation, prefer Rust-side for consistency with "heavy lifting in Rust" principle
- **JSON/CSV parsing:** `serde_json` / Rust CSV crate for parsing; rendering is frontend

## Non-Negotiable Constraints
- IPC between Rust and JS must NOT be chatty on the hot path (i.e., do not sync every keystroke to
  Rust). Editing state lives in JS/CodeMirror; Rust is invoked for file I/O, settings, and folder
  traversal only, with debounced writes for autosave.
- The app must remain usable (not crash, not freeze) on files up to at least 500MB via virtualized
  rendering — do not load-and-render the entire file into the DOM at once.
- Every visual theme (including Pure Glass Mode) must have a minimum-contrast/legibility floor that
  cannot be disabled entirely.

## Out of Scope for v1 (do not build unless explicitly asked)
- Plugin/extension system
- Split panes / multi-pane comparison
- Diff view
- Cloud sync / accounts
- Spellcheck beyond OS-native integration (no custom spellcheck engine)
- Any programming-language syntax highlighting

## How to Use This With SPEC.md
This file explains *why* and *what not to do*. `/CONTEXT/SPEC.md` explains *what to build and how it's
structured*. When in doubt about scope or direction, this file wins. When in doubt about implementation
detail, SPEC.md wins. If they conflict, flag it rather than guessing.