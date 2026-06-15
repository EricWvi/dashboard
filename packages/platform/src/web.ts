import { v4 as uuidv4 } from "uuid";
import type { AuthResponse } from "@only/contracts";
import type { PlatformAdapter } from "./adapter.js";

/// Web browser adapter — runs the OIDC redirect/callback flow for auth.
/// Does not support native IPC; `getMediaServerBaseUrl` always returns "".
export class WebAdapter implements PlatformAdapter {
  readonly isNative = false as const;

  async checkAuth(): Promise<void> {
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

  async getMediaServerBaseUrl(): Promise<string> {
    return "";
  }
}

export function startOidcAuthentication(): void {
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
