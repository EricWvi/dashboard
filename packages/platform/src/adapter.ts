import { TauriAdapter } from "./tauri.js";
import { WebAdapter } from "./web.js";

/// Abstraction over platform-specific capabilities (Tauri desktop vs web browser).
///
/// Implementations must not be swapped at runtime; the singleton is resolved
/// once at module load time based on the presence of `__TAURI_INTERNALS__`.
export interface PlatformAdapter {
  /// True when running inside a Tauri webview, false in a plain browser.
  readonly isNative: boolean;

  /// Runs the platform auth flow. In Tauri this delegates to the native
  /// command; in web it runs the OIDC redirect/callback sequence.
  checkAuth(): Promise<void>;

  /// Returns the base URL of the local media server (Tauri only).
  /// Returns an empty string in web environments.
  getMediaServerBaseUrl(): Promise<string>;
}

function detectTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/// Singleton resolved at module load time. Use this in non-React modules
/// (sync-client, db-interface). React components should prefer `usePlatform()`.
export const platform: PlatformAdapter = detectTauri()
  ? new TauriAdapter()
  : new WebAdapter();
