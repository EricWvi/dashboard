import { type Card, type FlomoData, type Folder } from "./model";
import { type TiptapV2, type User } from "@/lib/model";
import { getRequest, postRequest } from "@/lib/queryClient";
import { isTauri } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";

// API response types
interface FlomoSyncResponse {
  serverVersion: number;
  users: Omit<User, "key" | "syncStatus">[];
  cards: Omit<Card, "syncStatus">[];
  folders: Omit<Folder, "syncStatus">[];
  tiptaps: Omit<TiptapV2, "syncStatus">[];
}

interface BackendWrapper<T> {
  requestId: string;
  code: number;
  message: T | string;
}

function unwrapBackend<T>(raw: BackendWrapper<T>): T {
  if (raw.code !== 200) {
    throw new Error(typeof raw.message === "string" ? raw.message : "Unknown error");
  }
  return raw.message as T;
}

export interface ISyncClient {
  FullSync(): Promise<FlomoSyncResponse>;
  Push(
    data: FlomoData,
  ): Promise<{ ok: boolean; statusText: string }>;
  Pull(version: number): Promise<FlomoSyncResponse>;
}

export class WebSyncClient implements ISyncClient {
  async FullSync(): Promise<FlomoSyncResponse> {
    const response = await getRequest(`/api/flomo?Action=FullSync`);
    const data: BackendWrapper<FlomoSyncResponse> = await response.json();
    return unwrapBackend(data);
  }

  async Push(
    data: FlomoData,
  ): Promise<{ ok: boolean; statusText: string }> {
    const response = await postRequest(`/api/flomo?Action=Push`, data);
    const raw: BackendWrapper<unknown> = await response.json();
    return {
      ok: raw.code === 200,
      statusText: raw.code === 200 ? "OK" : (typeof raw.message === "string" ? raw.message : "Unknown error"),
    };
  }

  async Pull(version: number): Promise<FlomoSyncResponse> {
    const response = await getRequest(
      `/api/flomo?Action=Pull&since=${version}`,
    );
    const data: BackendWrapper<FlomoSyncResponse> = await response.json();
    return unwrapBackend(data);
  }
}

export class TauriSyncClient implements ISyncClient {
  async FullSync(): Promise<FlomoSyncResponse> {
    const raw: BackendWrapper<FlomoSyncResponse> = await invoke("flomo_full_sync");
    return unwrapBackend(raw);
  }

  async Push(
    data: FlomoData,
  ): Promise<{ ok: boolean; statusText: string }> {
    const raw: BackendWrapper<unknown> = await invoke("flomo_push", { data });
    return {
      ok: raw.code === 200,
      statusText: raw.code === 200 ? "OK" : (typeof raw.message === "string" ? raw.message : "Unknown error"),
    };
  }

  async Pull(version: number): Promise<FlomoSyncResponse> {
    const raw: BackendWrapper<FlomoSyncResponse> = await invoke("flomo_pull", { version });
    return unwrapBackend(raw);
  }
}

function createSyncClient(): ISyncClient {
  if (isTauri()) {
    return new TauriSyncClient();
  }
  return new WebSyncClient();
}

export const syncClient = createSyncClient();
