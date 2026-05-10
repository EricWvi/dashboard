import { SyncStatus, type SyncMeta, type Tag, type TiptapV2, type User } from "@/lib/model";
import { SchemaVersion, type Entry, type JournalData } from "@/lib/journal/model";
import { SyncManager } from "@/lib/journal/sync-manager";
import type { IJournalDatabase } from "@/lib/journal/db-interface";
import type { ISyncClient } from "@/lib/journal/sync-client";
import { syncEvents } from "@/lib/sync-events";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEntry,
  createStatistic,
  createTag,
  createTiptap,
  createUser,
} from "./test-helpers/factories";

type MockDb = Record<keyof IJournalDatabase, ReturnType<typeof vi.fn>>;
type SyncPayload = Awaited<ReturnType<ISyncClient["FullSync"]>>;

function createMockDb(overrides: Partial<MockDb> = {}): MockDb {
  const db: MockDb = {
    getUser: vi.fn().mockResolvedValue(undefined),
    putUser: vi.fn().mockResolvedValue(undefined),
    getEntry: vi.fn().mockResolvedValue(undefined),
    getEntries: vi.fn().mockResolvedValue({ entries: [], hasMore: false }),
    addEntry: vi.fn().mockResolvedValue("entry-id"),
    putEntry: vi.fn().mockResolvedValue(undefined),
    putEntries: vi.fn().mockResolvedValue(undefined),
    updateEntry: vi.fn().mockResolvedValue(undefined),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
    softDeleteEntry: vi.fn().mockResolvedValue(undefined),
    markEntrySynced: vi.fn().mockResolvedValue(undefined),
    getTag: vi.fn().mockResolvedValue(undefined),
    getAllTags: vi.fn().mockResolvedValue([]),
    addTag: vi.fn().mockResolvedValue("tag-id"),
    putTag: vi.fn().mockResolvedValue(undefined),
    putTags: vi.fn().mockResolvedValue(undefined),
    updateTag: vi.fn().mockResolvedValue(undefined),
    deleteTag: vi.fn().mockResolvedValue(undefined),
    softDeleteTag: vi.fn().mockResolvedValue(undefined),
    markTagSynced: vi.fn().mockResolvedValue(undefined),
    getTiptap: vi.fn().mockResolvedValue(undefined),
    addTiptap: vi.fn().mockResolvedValue("tiptap-id"),
    putTiptap: vi.fn().mockResolvedValue(undefined),
    putTiptaps: vi.fn().mockResolvedValue(undefined),
    syncTiptap: vi.fn().mockResolvedValue(undefined),
    updateTiptap: vi.fn().mockResolvedValue(undefined),
    deleteTiptap: vi.fn().mockResolvedValue(undefined),
    softDeleteTiptap: vi.fn().mockResolvedValue(undefined),
    markTiptapSynced: vi.fn().mockResolvedValue(undefined),
    listTiptapHistory: vi.fn().mockResolvedValue([]),
    getTiptapHistory: vi.fn().mockResolvedValue({}),
    restoreTiptapHistory: vi.fn().mockResolvedValue(undefined),
    getPendingChanges: vi.fn().mockResolvedValue({
      entries: [],
      tags: [],
      tiptaps: [],
    }),
    getLocalDataForSync: vi.fn().mockResolvedValue({
      entries: [],
      tags: [],
      tiptaps: [],
    }),
    getSyncMeta: vi.fn().mockResolvedValue(undefined),
    setSyncMeta: vi.fn().mockResolvedValue(undefined),
    getLastServerVersion: vi.fn().mockResolvedValue(0),
    clearAllData: vi.fn().mockResolvedValue(undefined),
    getStatistic: vi.fn().mockResolvedValue(undefined),
    setStatistic: vi.fn().mockResolvedValue(undefined),
    putStatistics: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return db;
}

function createMockClient(overrides: Partial<Record<keyof ISyncClient, ReturnType<typeof vi.fn>>> = {}) {
  return {
    FullSync: vi.fn().mockResolvedValue({
      serverVersion: 1,
      users: [],
      entries: [],
      tags: [],
      tiptaps: [],
      statistics: [],
    }),
    Push: vi.fn().mockResolvedValue({ ok: true, statusText: "OK" }),
    Pull: vi.fn().mockResolvedValue({
      serverVersion: 0,
      users: [],
      entries: [],
      tags: [],
      tiptaps: [],
      statistics: [],
    }),
    listEntries: vi.fn().mockResolvedValue({ entries: [], hasMore: false }),
    ...overrides,
  } satisfies Record<keyof ISyncClient, ReturnType<typeof vi.fn>>;
}

function serverUser(user: User): Omit<User, "key" | "syncStatus"> {
  const { key: _key, syncStatus: _syncStatus, ...rest } = user;
  return rest;
}

function serverEntry(entry: Entry): Omit<Entry, "syncStatus"> {
  const { syncStatus: _syncStatus, ...rest } = entry;
  return rest;
}

function serverTag(tag: Tag): Omit<Tag, "syncStatus"> {
  const { syncStatus: _syncStatus, ...rest } = tag;
  return rest;
}

function serverTiptap(tiptap: TiptapV2): Omit<TiptapV2, "syncStatus"> {
  const { syncStatus: _syncStatus, ...rest } = tiptap;
  return rest;
}

describe("Journal SyncManager", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("treats missing schemaVersion as needing full sync", async () => {
    const db = createMockDb({
      getLastServerVersion: vi.fn().mockResolvedValue(3),
      getSyncMeta: vi.fn().mockResolvedValue(undefined),
    });
    const manager = new SyncManager(db as unknown as IJournalDatabase, createMockClient());

    await expect(manager.needFullSync()).resolves.toBe(true);
  });

  it("parses schemaVersion safely when stored as a string", async () => {
    const schemaMeta: SyncMeta = { key: "schemaVersion", value: String(SchemaVersion) };
    const db = createMockDb({
      getLastServerVersion: vi.fn().mockResolvedValue(7),
      getSyncMeta: vi.fn().mockResolvedValue(schemaMeta),
    });
    const manager = new SyncManager(db as unknown as IJournalDatabase, createMockClient());

    await expect(manager.needFullSync()).resolves.toBe(false);
  });

  it("writes synced records and metadata during full sync", async () => {
    const user = createUser();
    const entry = createEntry();
    const tag = createTag();
    const tiptap = createTiptap();
    const statistic = createStatistic();
    const db = createMockDb();
    const client = createMockClient({
      FullSync: vi.fn().mockResolvedValue({
        serverVersion: 42,
        users: [serverUser(user)],
        entries: [serverEntry(entry)],
        tags: [serverTag(tag)],
        tiptaps: [serverTiptap(tiptap)],
        statistics: [statistic],
      } satisfies SyncPayload),
    });
    const manager = new SyncManager(
      db as unknown as IJournalDatabase,
      client as unknown as ISyncClient,
    );

    await manager.fullSync();

    expect(db.clearAllData).toHaveBeenCalledTimes(2);
    expect(db.putEntries).toHaveBeenCalledWith([
      expect.objectContaining({ id: entry.id, syncStatus: SyncStatus.Synced }),
    ]);
    expect(db.putTags).toHaveBeenCalledWith([
      expect.objectContaining({ id: tag.id, syncStatus: SyncStatus.Synced }),
    ]);
    expect(db.putTiptaps).toHaveBeenCalledWith([
      expect.objectContaining({ id: tiptap.id, syncStatus: SyncStatus.Synced }),
    ]);
    expect(db.putUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: user.username, syncStatus: SyncStatus.Synced }),
    );
    expect(db.setSyncMeta).toHaveBeenNthCalledWith(1, "schemaVersion", SchemaVersion);
    expect(db.setSyncMeta).toHaveBeenNthCalledWith(2, "lastServerVersion", 42);
  });

  it("marks pending records as synced after a successful push", async () => {
    const pending = {
      entries: [createEntry({ id: "entry-push", updatedAt: 10 })],
      tags: [createTag({ id: "tag-push", updatedAt: 11 })],
      tiptaps: [createTiptap({ id: "tiptap-push", updatedAt: 12 })],
    } satisfies JournalData;
    const db = createMockDb({
      getPendingChanges: vi.fn().mockResolvedValue(pending),
    });
    const client = createMockClient();
    const manager = new SyncManager(
      db as unknown as IJournalDatabase,
      client as unknown as ISyncClient,
    );

    await manager.pushChanges();

    expect(client.Push).toHaveBeenCalledWith(pending);
    expect(db.markEntrySynced).toHaveBeenCalledWith("entry-push", 10);
    expect(db.markTagSynced).toHaveBeenCalledWith("tag-push", 11);
    expect(db.markTiptapSynced).toHaveBeenCalledWith("tiptap-push", 12);
  });

  it("applies newer remote changes, deletes tombstones, emits tiptap refresh, and updates the pull version", async () => {
    const localEntry = createEntry({ id: "entry-1", updatedAt: 1000, rawText: "local" });
    const localTag = createTag({ id: "tag-1", updatedAt: 500 });
    const localTiptap = createTiptap({ id: "tiptap-1", updatedAt: 800 });
    const db = createMockDb({
      getLastServerVersion: vi.fn().mockResolvedValue(10),
      getEntry: vi.fn().mockResolvedValue(localEntry),
      getTag: vi.fn().mockResolvedValue(localTag),
      getTiptap: vi.fn().mockResolvedValue(localTiptap),
    });
    const client = createMockClient({
      Pull: vi.fn().mockResolvedValue({
        serverVersion: 15,
        users: [serverUser(createUser({ updatedAt: 2000 }))],
        entries: [
          serverEntry(createEntry({ id: "entry-1", updatedAt: 2000, rawText: "remote" })),
          serverEntry(createEntry({ id: "entry-deleted", isDeleted: true, updatedAt: 2100 })),
        ],
        tags: [serverTag(createTag({ id: "tag-1", updatedAt: 100 }))],
        tiptaps: [
          serverTiptap(
            createTiptap({
              id: "tiptap-1",
              updatedAt: 3000,
              content: { type: "doc", content: [{ type: "paragraph" }] },
            }),
          ),
        ],
        statistics: [createStatistic({ stValue: 222 })],
      } satisfies SyncPayload),
    });
    const emitSpy = vi.spyOn(syncEvents, "emitMany").mockImplementation(() => {});
    const manager = new SyncManager(
      db as unknown as IJournalDatabase,
      client as unknown as ISyncClient,
      { intervalMs: 1000, now: () => 5000 },
    );
    (manager as unknown as { nextPull: number }).nextPull = 0;

    await manager.pullChanges();

    expect(db.putEntry).toHaveBeenCalledWith(
      expect.objectContaining({ id: "entry-1", rawText: "remote", syncStatus: SyncStatus.Synced }),
    );
    expect(db.deleteEntry).toHaveBeenCalledWith("entry-deleted");
    expect(db.putTag).not.toHaveBeenCalled();
    expect(db.putTiptap).toHaveBeenCalledWith(
      expect.objectContaining({ id: "tiptap-1", syncStatus: SyncStatus.Synced }),
    );
    expect(db.putStatistics).toHaveBeenCalledWith([expect.objectContaining({ stValue: 222 })]);
    expect(db.setSyncMeta).toHaveBeenCalledWith("lastServerVersion", 15);
    expect(emitSpy).toHaveBeenCalledWith(["tiptap-1"]);
  });

  it("backs off when pull returns no changes and when sync fails", async () => {
    const db = createMockDb({
      getLastServerVersion: vi.fn().mockResolvedValue(5),
    });
    const client = createMockClient();
    const now = vi.fn().mockReturnValue(1000);
    const manager = new SyncManager(
      db as unknown as IJournalDatabase,
      client as unknown as ISyncClient,
      { intervalMs: 3000, now },
    );
    (manager as unknown as { nextPull: number }).nextPull = 0;

    await manager.pullChanges();

    expect((manager as unknown as { waitMs: number }).waitMs).toBe(6000);
    expect((manager as unknown as { nextPull: number }).nextPull).toBe(7000);

    client.Push.mockRejectedValueOnce(new Error("network"));
    await expect(manager.sync()).resolves.toBeUndefined();
    expect((manager as unknown as { waitMs: number }).waitMs).toBe(6000);
    expect((manager as unknown as { nextPull: number }).nextPull).toBe(7000);
  });
});
