import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

export const useFileWatcher = (currentPath: string | null, onRefresh: () => void) => {
  useEffect(() => {
    if (!currentPath) return;

    let unlisten: (() => void) | null = null;

    const setup = async () => {
      // In a real implementation with tauri-plugin-fs, we'd start watching here
      // For this scaffold, we'll listen for a custom refresh event or just refresh on demand
      // The notify crate would send an event to the frontend.
      unlisten = await listen('file-change', () => {
        onRefresh();
      });
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, [currentPath, onRefresh]);
};
