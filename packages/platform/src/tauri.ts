import type { PlatformAdapter } from "./adapter.js";

/// Tauri desktop adapter — delegates auth to the native command and resolves
/// the local media-server port via IPC.
export class TauriAdapter implements PlatformAdapter {
  readonly isNative = true as const;

  async checkAuth(): Promise<void> {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("onlyquant_is_logged_in");
  }

  async getMediaServerBaseUrl(): Promise<string> {
    const { invoke } = await import("@tauri-apps/api/core");
    const port = await invoke<number>("get_local_media_server_port");
    return `http://localhost:${port}`;
  }
}
