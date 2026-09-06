import { invoke, Channel } from "@tauri-apps/api/core";

export const apiInvoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  return await invoke<T>(command, args);
};

export interface StreamPayload {
  type: 'Chunk' | 'Complete' | 'Error';
  payload: any;
}

export const streamInvoke = (
  command: string,
  args: Record<string, unknown>,
  onEvent: (payload: StreamPayload) => void
) => {
  const channel = new Channel<StreamPayload>();
  channel.onmessage = onEvent;
  invoke(command, { ...args, onEvent: channel });
};
