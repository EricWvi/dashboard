import { beforeEach, describe, expect, it, vi } from "vitest";
import { DexieJournalDatabase } from "@/lib/journal/dexie";
import { SyncStatus } from "@/lib/model";
import { createJournalStatisticsStore } from "@/lib/journal/statistics";
import {
  createEntry,
  createTag,
  createTiptap,
} from "./test-helpers/factories";

function omitId<T extends { id: string }>(value: T): Omit<T, "id"> {
  const { id: _id, ...rest } = value;
  return rest;
}

function omitSyncStatus<T extends { syncStatus: number }>(
  value: T,
): Omit<T, "syncStatus"> {
  const { syncStatus: _syncStatus, ...rest } = value;
  return rest;
}

describe("DexieJournalDatabase", () => {
  let now = 1000;
  let db: DexieJournalDatabase;

  beforeEach(() => {
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const dbName = `JournalDB-test-${crypto.randomUUID()}`;
    db = new DexieJournalDatabase({
      dbName,
      statisticsStore: createJournalStatisticsStore({
        getStatistic: async (key) => db.getStatistic(key),
        setStatistic: async (key, value) => db.setStatistic(key, value),
      }),
    });
  });

  it("tracks entry statistics through add, update, and soft delete", async () => {
    const entryId = await db.addEntry(
      omitSyncStatus(createEntry({ wordCount: 100 })),
    );
    const created = await db.getEntry(entryId);

    expect(created).toEqual(
      expect.objectContaining({
        id: entryId,
        syncStatus: SyncStatus.Pending,
        wordCount: 100,
      }),
    );
    expect(await db.getStatistic("wordsCount")).toEqual({
      stKey: "wordsCount",
      stValue: 100,
    });

    now = 2000;
    await db.updateEntry(entryId, { wordCount: 150, rawText: "updated" });
    expect(await db.getStatistic("wordsCount")).toEqual({
      stKey: "wordsCount",
      stValue: 150,
    });

    now = 3000;
    await db.softDeleteEntry(entryId);
    const deleted = await db.getEntry(entryId);

    expect(deleted).toEqual(
      expect.objectContaining({
        isDeleted: true,
        syncStatus: SyncStatus.Pending,
        updatedAt: 3000,
      }),
    );
    expect(await db.getStatistic("wordsCount")).toEqual({
      stKey: "wordsCount",
      stValue: 0,
    });
  });

  it("returns pending data and only marks records as synced when timestamps match", async () => {
    const entryId = await db.addEntry(omitId(createEntry()));
    const tagId = await db.addTag(omitId(createTag()));
    const tiptapId = await db.addTiptap(omitId(createTiptap()));

    const entry = await db.getEntry(entryId);
    const tag = await db.getTag(tagId);
    const tiptap = await db.getTiptap(tiptapId);
    const pending = await db.getPendingChanges();

    expect(pending.entries).toHaveLength(1);
    expect(pending.tags).toHaveLength(1);
    expect(pending.tiptaps).toHaveLength(1);

    await db.markEntrySynced(entryId, -1);
    await db.markTagSynced(tagId, -1);
    await db.markTiptapSynced(tiptapId, -1);

    expect((await db.getEntry(entryId))?.syncStatus).toBe(SyncStatus.Pending);
    expect((await db.getTag(tagId))?.syncStatus).toBe(SyncStatus.Pending);
    expect((await db.getTiptap(tiptapId))?.syncStatus).toBe(SyncStatus.Pending);

    await db.markEntrySynced(entryId, entry!.updatedAt);
    await db.markTagSynced(tagId, tag!.updatedAt);
    await db.markTiptapSynced(tiptapId, tiptap!.updatedAt);

    expect((await db.getEntry(entryId))?.syncStatus).toBe(SyncStatus.Synced);
    expect((await db.getTag(tagId))?.syncStatus).toBe(SyncStatus.Synced);
    expect((await db.getTiptap(tiptapId))?.syncStatus).toBe(SyncStatus.Synced);
  });

  it("filters deleted entries and paginates results", async () => {
    for (let index = 0; index < 10; index += 1) {
      now = 1000 + index;
      await db.addEntry(
        createEntry({
          draft: `draft-${index}`,
          rawText: `entry-${index}`,
          wordCount: index + 1,
        }),
      );
    }

    const localData = await db.getLocalDataForSync();
    await db.softDeleteEntry(localData.entries[0]!.id);

    const firstPage = await db.getEntries(1, []);
    const secondPage = await db.getEntries(2, []);

    expect(firstPage.entries).toHaveLength(8);
    expect(firstPage.hasMore).toBe(true);
    expect(secondPage.entries).toHaveLength(1);
    expect(secondPage.hasMore).toBe(false);
  });
});
