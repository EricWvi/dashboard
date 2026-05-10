import type { Entry, JournalData, Statistic } from "@/lib/journal/model";
import type { Tag, TiptapV2, User } from "@/lib/model";

type ServerUser = Omit<User, "key" | "syncStatus"> & { serverVersion: number };
type ServerEntry = Omit<Entry, "syncStatus"> & { serverVersion: number };
type ServerTag = Omit<Tag, "syncStatus"> & { serverVersion: number };
type ServerTiptap = Omit<TiptapV2, "syncStatus"> & { serverVersion: number };
type ServerStatistic = Statistic & { serverVersion: number };

interface ServerState {
  users: ServerUser[];
  entries: ServerEntry[];
  tags: ServerTag[];
  tiptaps: ServerTiptap[];
  statistics: ServerStatistic[];
}

interface BackendWrapper<T> {
  requestId: string;
  code: number;
  message: T | string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withJson<T>(body: BackendWrapper<T>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export class FakeJournalServer {
  private versionCounter: number;
  private state: ServerState;

  constructor(seed?: Partial<ServerState> & { versionCounter?: number }) {
    this.versionCounter = seed?.versionCounter ?? 0;
    this.state = {
      users: clone(seed?.users ?? []),
      entries: clone(seed?.entries ?? []),
      tags: clone(seed?.tags ?? []),
      tiptaps: clone(seed?.tiptaps ?? []),
      statistics: clone(seed?.statistics ?? []),
    };
  }

  getCurrentVersion(): number {
    return this.versionCounter;
  }

  fullSync() {
    const snapshot = clone(this.state);
    return {
      serverVersion: this.maxVersion(snapshot, 1),
      users: snapshot.users,
      entries: snapshot.entries,
      tags: snapshot.tags,
      tiptaps: snapshot.tiptaps,
      statistics: snapshot.statistics,
    };
  }

  pull(since: number) {
    const changes = {
      users: this.state.users.filter((record) => record.serverVersion > since),
      entries: this.state.entries.filter((record) => record.serverVersion > since),
      tags: this.state.tags.filter((record) => record.serverVersion > since),
      tiptaps: this.state.tiptaps.filter(
        (record) => record.serverVersion > since,
      ),
      statistics: this.state.statistics.filter(
        (record) => record.serverVersion > since,
      ),
    };

    return {
      serverVersion: this.maxVersion(changes, since),
      users: clone(changes.users),
      entries: clone(changes.entries),
      tags: clone(changes.tags),
      tiptaps: clone(changes.tiptaps),
      statistics: clone(changes.statistics),
    };
  }

  push(data: JournalData) {
    for (const entry of data.entries) {
      this.upsertRecord(this.state.entries, entry);
    }
    for (const tag of data.tags) {
      this.upsertRecord(this.state.tags, tag);
    }
    for (const tiptap of data.tiptaps) {
      this.upsertRecord(this.state.tiptaps, tiptap);
    }
    this.recalculateStatistics();
    return { success: true };
  }

  async handleFetch(
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const url = new URL(rawUrl, "http://localhost");
    const action = url.searchParams.get("Action");

    try {
      switch (action) {
        case "FullSync":
          return withJson({
            requestId: "full-sync",
            code: 200,
            message: this.fullSync(),
          });
        case "Pull":
          return withJson({
            requestId: "pull",
            code: 200,
            message: this.pull(Number(url.searchParams.get("since") ?? "0")),
          });
        case "Push": {
          const body = init?.body ? JSON.parse(String(init.body)) : null;
          this.push(body as JournalData);
          return withJson({
            requestId: "push",
            code: 200,
            message: { success: true },
          });
        }
        default:
          return withJson(
            {
              requestId: "unknown",
              code: 400,
              message: `Unsupported action: ${action}`,
            },
            400,
          );
      }
    } catch (error) {
      return withJson(
        {
          requestId: "error",
          code: 500,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  private upsertRecord<
    T extends {
      id: string;
      updatedAt: number;
      isDeleted: boolean;
    },
  >(
    collection: Array<T & { serverVersion: number }>,
    incoming: T,
  ): void {
    const index = collection.findIndex((record) => record.id === incoming.id);
    if (index === -1) {
      collection.push({
        ...clone(incoming),
        serverVersion: ++this.versionCounter,
      });
      return;
    }

    const existing = collection[index];
    if (existing.updatedAt >= incoming.updatedAt) {
      return;
    }

    collection[index] = {
      ...clone(incoming),
      serverVersion: ++this.versionCounter,
    };
  }

  private recalculateStatistics(): void {
    const liveEntries = this.state.entries.filter((entry) => !entry.isDeleted);
    const wordsCount = liveEntries.reduce((sum, entry) => sum + entry.wordCount, 0);
    const currentYear: Record<string, number> = {};

    for (const entry of liveEntries) {
      const date = new Date(entry.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      currentYear[key] = (currentYear[key] ?? 0) + 1;
    }

    this.state.statistics = [
      {
        stKey: "wordsCount",
        stValue: wordsCount,
        serverVersion: ++this.versionCounter,
      },
      {
        stKey: "currentYear",
        stValue: currentYear,
        serverVersion: ++this.versionCounter,
      },
    ];
  }

  private maxVersion(state: Partial<ServerState>, fallback: number): number {
    const versions = [
      ...(state.users ?? []).map((record) => record.serverVersion),
      ...(state.entries ?? []).map((record) => record.serverVersion),
      ...(state.tags ?? []).map((record) => record.serverVersion),
      ...(state.tiptaps ?? []).map((record) => record.serverVersion),
      ...(state.statistics ?? []).map((record) => record.serverVersion),
    ];

    return versions.length > 0 ? Math.max(...versions) : fallback;
  }
}
