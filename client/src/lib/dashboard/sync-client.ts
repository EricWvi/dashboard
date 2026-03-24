import {
  type Blog,
  type Bookmark,
  type Collection,
  type DashboardData,
  type Echo,
  type QuickNote,
  type Todo,
  type Watch,
} from "./model";
import { type Tag, type TiptapV2, type User } from "@/lib/model";
import { getRequest, postRequest } from "@/lib/queryClient";
import { isTauri } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";

// API response types
interface DashboardSyncResponse {
  serverVersion: number;
  users: Omit<User, "key" | "syncStatus">[];
  tags: Omit<Tag, "syncStatus">[];
  blogs: Omit<Blog, "syncStatus">[];
  bookmarks: Omit<Bookmark, "syncStatus">[];
  collections: Omit<Collection, "syncStatus">[];
  echoes: Omit<Echo, "syncStatus">[];
  quickNotes: Omit<QuickNote, "syncStatus">[];
  todos: Omit<Todo, "syncStatus">[];
  watches: Omit<Watch, "syncStatus">[];
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
  FullSync(): Promise<DashboardSyncResponse>;
  Push(data: DashboardData): Promise<{ ok: boolean; statusText: string }>;
  Pull(version: number): Promise<DashboardSyncResponse>;
}

export class WebSyncClient implements ISyncClient {
  async FullSync(): Promise<DashboardSyncResponse> {
    const response = await getRequest(`/api/dashboard?Action=FullSync`);
    const data: BackendWrapper<DashboardSyncResponse> = await response.json();
    return unwrapBackend(data);
  }

  async Push(data: DashboardData): Promise<{ ok: boolean; statusText: string }> {
    const response = await postRequest(`/api/dashboard?Action=Push`, data, 2);
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

  async Pull(version: number): Promise<DashboardSyncResponse> {
    const response = await getRequest(
      `/api/dashboard?Action=Pull&since=${version}`,
      2,
    );
    const data: BackendWrapper<DashboardSyncResponse> = await response.json();
    return unwrapBackend(data);
  }
}

export class TauriSyncClient implements ISyncClient {
  async FullSync(): Promise<DashboardSyncResponse> {
    const raw: BackendWrapper<DashboardSyncResponse> =
      await invoke("dashboard_full_sync");
    return unwrapBackend(raw);
  }

  async Push(data: DashboardData): Promise<{ ok: boolean; statusText: string }> {
    const raw: BackendWrapper<unknown> = await invoke("dashboard_push", { data });
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

  async Pull(version: number): Promise<DashboardSyncResponse> {
    const raw: BackendWrapper<DashboardSyncResponse> = await invoke(
      "dashboard_pull",
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
