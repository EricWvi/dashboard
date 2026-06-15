import { v4 as uuidv4 } from "uuid";
import type { AuthResponse } from "@only/contracts";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/// Ensures a valid auth token exists, running the OIDC flow when necessary.
///
/// In Tauri, delegates to the native `onlyquant_is_logged_in` command.
/// In web, exchanges the OIDC authorization code for a token and saves it to localStorage.
/// Redirects to the OIDC authorization endpoint when no token is present.
export async function checkAuth(): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("onlyquant_is_logged_in");
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const error = urlParams.get("error");

  if (error) {
    const errorDescription = urlParams.get("error_description");
    console.error(`Authentication error: ${errorDescription || error}`);
    return;
  }

  if (code && !localStorage.getItem("oqAuthToken")) {
    await handleOidcCallback();
  }

  if (!localStorage.getItem("oqAuthToken")) {
    startOidcAuthentication();
  }
}

function startOidcAuthentication(): void {
  const state = uuidv4();
  sessionStorage.setItem("oidc_state", state);
  const redirectUri = encodeURIComponent(
    window.location.origin + "/oidc/callback",
  );
  const clientId =
    "Tp6WnNpVj9Sa8gdPZt8bVGq~yjKnjUZkG8J5IJ~aoIj5-Azn~pXUXq5fPXP-8BLQqOVnxq8P";
  const authUrl = `https://auth.onlyquant.top/api/oidc/authorization?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile%20email&state=${state}`;
  window.location.href = authUrl;
}

async function handleOidcCallback(): Promise<void> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const state = urlParams.get("state");

  const savedState = sessionStorage.getItem("oidc_state");
  if (!savedState || savedState !== state) {
    throw new Error(
      `Invalid state parameter - saved: ${savedState}, received: ${state}`,
    );
  }

  const redirectUri = encodeURIComponent(
    window.location.origin + "/oidc/callback",
  );
  const response = await fetch(
    `/api/auth?code=${code}&redirect_uri=${redirectUri}`,
  );
  if (!response.ok) {
    throw new Error("Failed to authenticate");
  }
  const data = (await response.json()) as AuthResponse;
  if (data.token) {
    localStorage.setItem("oqAuthToken", data.token);
    sessionStorage.removeItem("oidc_state");
    window.history.replaceState({}, document.title, window.location.origin);
  }
}
