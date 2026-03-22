import { type Entry, type JournalData, type Tag } from "./model";
import { type TiptapV2, type User } from "@/lib/model";
import { getRequest, postRequest } from "@/lib/queryClient";
import { isTauri } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";

// API response types
interface JournalSyncResponse {
  serverVersion: number;
  users: Omit<User, "key" | "syncStatus">[];
  entries: Omit<Entry, "syncStatus">[];
  tags: Omit<Tag, "syncStatus">[];
  tiptaps: Omit<TiptapV2, "syncStatus">[];
}

interface BackendWrapper<T> {
  requestId: string;
  code: number;
  message: T | string;
}

function unwrapBackend<T>(raw: BackendWrapper<T>): T {
  if (raw.code !== 200) {
    throw new Error(
      typeof raw.message === "string" ? raw.message : "Unknown error",
    );
  }
  return raw.message as T;
}

export interface ISyncClient {
  FullSync(): Promise<JournalSyncResponse>;
  Push(data: JournalData): Promise<{ ok: boolean; statusText: string }>;
  Pull(version: number): Promise<JournalSyncResponse>;
}

export class WebSyncClient implements ISyncClient {
  async FullSync(): Promise<JournalSyncResponse> {
    const response = await getRequest(`/api/journal?Action=FullSync`);
    const data: BackendWrapper<JournalSyncResponse> = await response.json();
    return unwrapBackend(data);
  }

  async Push(data: JournalData): Promise<{ ok: boolean; statusText: string }> {
    const response = await postRequest(`/api/journal?Action=Push`, data, 2);
    const raw: BackendWrapper<unknown> = await response.json();
    return {
      ok: raw.code === 200,
      statusText:
        raw.code === 200
          ? "OK"
          : typeof raw.message === "string"
            ? raw.message
            : "Unknown error",
    };
  }

  async Pull(version: number): Promise<JournalSyncResponse> {
    const response = await getRequest(
      `/api/journal?Action=Pull&since=${version}`,
      2,
    );
    const data: BackendWrapper<JournalSyncResponse> = await response.json();
    return unwrapBackend(data);
  }
}

export class TauriSyncClient implements ISyncClient {
  async FullSync(): Promise<JournalSyncResponse> {
    const raw: BackendWrapper<JournalSyncResponse> =
      await invoke("journal_full_sync");
    return unwrapBackend(raw);
  }

  async Push(data: JournalData): Promise<{ ok: boolean; statusText: string }> {
    const raw: BackendWrapper<unknown> = await invoke("journal_push", { data });
    return {
      ok: raw.code === 200,
      statusText:
        raw.code === 200
          ? "OK"
          : typeof raw.message === "string"
            ? raw.message
            : "Unknown error",
    };
  }

  async Pull(version: number): Promise<JournalSyncResponse> {
    const raw: BackendWrapper<JournalSyncResponse> = await invoke(
      "journal_pull",
      {
        version,
      },
    );
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
