export interface FileMeta {
  path: string;
  name: string;
  isDir: boolean;
}

export interface TreeNode {
  path: string;
  name: string;
  children?: TreeNode[];
}

export type KeywordStyle = "background" | "underline" | "bold" | "glow";

export interface KeywordCategory {
  id: string;
  name: string;
  color: string;
  style: KeywordStyle;
  words: string[];
  enabled: boolean;
}

export interface Tab {
  id: string;
  path?: string;
  name: string;
  content: string;
  isDirty: boolean;
  cursorPos?: number;
  scrollPos?: number;
  encoding: string;
  lineEnding: string;
  isLargeMode?: boolean;
}

export interface SessionState {
  tabs: Omit<Tab, 'content'>[];
  activeTabId: string | null;
}
