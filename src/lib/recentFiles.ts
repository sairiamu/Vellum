import { LazyStore } from '@tauri-apps/plugin-store';

export interface RecentFile {
  path: string;
  name: string;
  timestamp: number;
  pinned: boolean;
}

const store = new LazyStore('recent_files.json');
const RECENT_FILES_KEY = 'recent_files';

export const getRecentFiles = async (): Promise<RecentFile[]> => {
  const files = await store.get<RecentFile[]>(RECENT_FILES_KEY);
  return files || [];
};

export const addRecentFile = async (path: string, name: string) => {
  const files = await getRecentFiles();
  const existingIndex = files.findIndex(f => f.path === path);

  if (existingIndex !== -1) {
    const file = files[existingIndex];
    files.splice(existingIndex, 1);
    files.unshift({ ...file, timestamp: Date.now() });
  } else {
    files.unshift({
      path,
      name,
      timestamp: Date.now(),
      pinned: false
    });
  }

  // Keep max 50 recent files (excluding pinned)
  const pinned = files.filter(f => f.pinned);
  const unpinned = files.filter(f => !f.pinned).slice(0, 50);

  const updated = [...pinned, ...unpinned];
  await store.set(RECENT_FILES_KEY, updated);
  await store.save();
  return updated;
};

export const togglePinRecentFile = async (path: string) => {
  const files = await getRecentFiles();
  const updated = files.map(f =>
    f.path === path ? { ...f, pinned: !f.pinned } : f
  );
  await store.set(RECENT_FILES_KEY, updated);
  await store.save();
  return updated;
};

export const removeRecentFile = async (path: string) => {
  const files = await getRecentFiles();
  const updated = files.filter(f => f.path !== path);
  await store.set(RECENT_FILES_KEY, updated);
  await store.save();
  return updated;
};
