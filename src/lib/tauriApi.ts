import { invoke } from "@tauri-apps/api/core";

export const apiInvoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  return await invoke<T>(command, args);
};
