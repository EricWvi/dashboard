import { v4 as uuidv4 } from "uuid";
import Dexie, { type EntityTable } from "dexie";
import {
  EntryMeta,
  SchemaVersion,
  type Entry,
  type EntryField,
  type JournalData,
  type QueryCondition,
  type Statistic,
} from "./model";
import {
  SyncStatus,
  type SyncMeta,
  type Tag,
  type TagField,
  type TiptapV2,
  type TiptapV2Field,
  type User,
} from "@/lib/model";
import type { IJournalDatabase } from "./db-interface";
import { onEntryCreate, onEntryDelete, onEntryUpdate } from "./statistics";

const USER_KEY = "current_user";

// Database interface for type safety
export interface JournalDB {
  user: EntityTable<User, "key">;
  entries: EntityTable<Entry, "id">;
  tags: EntityTable<Tag, "id">;
  tiptaps: EntityTable<TiptapV2, "id">;
  syncMeta: EntityTable<SyncMeta, "key">;
  statistics: EntityTable<Statistic, "stKey">;
}

// Dexie implementation
export class DexieJournalDatabase implements IJournalDatabase {
  private db: Dexie & JournalDB;

  constructor() {
    this.db = new Dexie("JournalDB") as Dexie & JournalDB;
    this.initSchema();
  }

  private initSchema() {
    this.db.version(SchemaVersion).stores({
      user: "key",
      entries: "id, syncStatus, createdAt",
      tags: "id, syncStatus",
      tiptaps: "id, syncStatus",
      syncMeta: "key",
      statistics: "stKey",
    });
  }

  // User
  async getUser(): Promise<User | undefined> {
    return this.db.user.get(USER_KEY);
  }

  async putUser(user: User): Promise<void> {
    await this.db.user.put({ ...user, key: USER_KEY });
  }

  // Entries
  async getEntry(id: string): Promise<Omit<Entry, "rawText"> | undefined> {
    return this.db.entries.get(id);
  }

  async getEntries(
    page: number,
    _condition: QueryCondition[],
  ): Promise<{ entries: EntryMeta[]; hasMore: boolean }> {
    const pageSize = 8;
    const offset = (page - 1) * pageSize;
    const rawData = this.db.entries
      .orderBy("createdAt")
      .reverse()
      .filter((e) => !e.isDeleted)
      .offset(offset)
      .limit(pageSize + 1) // Fetch one extra to check if there's more
      .toArray();
    return rawData.then((entries) => {
      const hasMore = entries.length > pageSize;
      const result = entries
        .slice(0, pageSize)
        .map(
          (entry) =>
            new EntryMeta(
              entry.id,
              entry.draft,
              new Date(entry.createdAt).getFullYear(),
              new Date(entry.createdAt).getMonth() + 1,
              new Date(entry.createdAt).getDate(),
            ),
        );
      return { entries: result, hasMore };
    });
  }

  async addEntry(entry: EntryField): Promise<string> {
    const id = uuidv4();
    const now = Date.now();
    await this.db.entries.add({
      ...entry,
      id,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      syncStatus: SyncStatus.Pending,
    });
    // Update statistics
    await onEntryCreate(now, entry.wordCount);
    return id;
  }

  async putEntry(entry: Entry): Promise<void> {
    await this.db.entries.put(entry);
  }

  async putEntries(entries: Entry[]): Promise<void> {
    await this.db.entries.bulkPut(entries);
  }

  async updateEntry(id: string, updates: Partial<EntryField>): Promise<void> {
    // Get old entry for wordCount comparison
    const oldEntry = await this.db.entries.get(id);
    const oldWordCount = oldEntry?.wordCount ?? 0;

    await this.db.entries.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });

    // Update statistics if wordCount changed
    if (updates.wordCount !== undefined && updates.wordCount !== oldWordCount) {
      await onEntryUpdate(oldWordCount, updates.wordCount);
    }
  }

  async deleteEntry(id: string): Promise<void> {
    await this.db.entries.delete(id);
  }

  async softDeleteEntry(id: string): Promise<void> {
    // Get entry for statistics update
    const entry = await this.db.entries.get(id);
    if (entry) {
      await this.db.entries.update(id, {
        isDeleted: true,
        updatedAt: Date.now(),
        syncStatus: SyncStatus.Pending,
      });
      // Update statistics
      await onEntryDelete(entry.createdAt, entry.wordCount);
    }
  }

  async markEntrySynced(id: string, updatedAt: number): Promise<void> {
    await this.db.entries
      .where("id")
      .equals(id)
      .and((entry) => entry.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  // Tags
  async getTag(id: string): Promise<Tag | undefined> {
    return this.db.tags.get(id);
  }

  async getAllTags(): Promise<Tag[]> {
    return this.db.tags.filter((t) => !t.isDeleted).toArray();
  }

  async addTag(tag: TagField): Promise<string> {
    const id = uuidv4();
    await this.db.tags.add({
      ...tag,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
      syncStatus: SyncStatus.Pending,
    });
    return id;
  }

  async putTag(tag: Tag): Promise<void> {
    await this.db.tags.put(tag);
  }

  async putTags(tags: Tag[]): Promise<void> {
    await this.db.tags.bulkPut(tags);
  }

  async updateTag(id: string, updates: Partial<TagField>): Promise<void> {
    await this.db.tags.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteTag(id: string): Promise<void> {
    await this.db.tags.delete(id);
  }

  async softDeleteTag(id: string): Promise<void> {
    await this.db.tags.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markTagSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.tags
      .where("id")
      .equals(id)
      .and((tag) => tag.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  // Tiptaps
  async getTiptap(id: string): Promise<TiptapV2 | undefined> {
    return this.db.tiptaps.get(id);
  }

  async addTiptap(tiptap: TiptapV2Field): Promise<string> {
    const id = uuidv4();
    await this.db.tiptaps.add({
      ...tiptap,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
      syncStatus: SyncStatus.Pending,
    });
    return id;
  }

  async putTiptap(tiptap: TiptapV2): Promise<void> {
    await this.db.tiptaps.put(tiptap);
  }

  async putTiptaps(tiptaps: TiptapV2[]): Promise<void> {
    await this.db.tiptaps.bulkPut(tiptaps);
  }

  async syncTiptap(
    id: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    await this.db.tiptaps.update(id, {
      content,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async updateTiptap(
    id: string,
    updates: Partial<TiptapV2Field>,
  ): Promise<void> {
    await this.db.tiptaps.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteTiptap(id: string): Promise<void> {
    await this.db.tiptaps.delete(id);
  }

  async softDeleteTiptap(id: string): Promise<void> {
    await this.db.tiptaps.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markTiptapSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.tiptaps
      .where("id")
      .equals(id)
      .and((tiptap) => tiptap.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  async listTiptapHistory(id: string): Promise<number[]> {
    const tiptap = await this.db.tiptaps.get(id);
    if (!tiptap) {
      return [];
    }
    return tiptap.history.map((entry) => entry.time);
  }

  async getTiptapHistory(
    id: string,
    ts: number,
  ): Promise<Record<string, unknown>> {
    const tiptap = await this.db.tiptaps.get(id);
    if (!tiptap) {
      throw new Error("Tiptap not found");
    }
    const entry = tiptap.history.find((h) => h.time === ts);
    if (!entry) {
      throw new Error("History entry not found");
    }
    return entry.content;
  }

  async restoreTiptapHistory(id: string, ts: number): Promise<void> {
    const tiptap = await this.db.tiptaps.get(id);
    if (!tiptap) {
      throw new Error("Tiptap not found");
    }
    const entry = tiptap.history.find((h) => h.time === ts);
    if (!entry) {
      throw new Error("History entry not found");
    }
    await this.db.tiptaps.update(id, {
      content: entry.content,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  // Sync
  async getPendingChanges(): Promise<JournalData> {
    const [entries, tags, tiptaps] = await Promise.all([
      this.db.entries.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.tags.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.tiptaps.where("syncStatus").equals(SyncStatus.Pending).toArray(),
    ]);
    return { entries, tags, tiptaps };
  }

  async getLocalDataForSync(): Promise<JournalData> {
    const [entries, tags, tiptaps] = await Promise.all([
      this.db.entries.toArray(),
      this.db.tags.toArray(),
      this.db.tiptaps.toArray(),
    ]);
    return { entries, tags, tiptaps };
  }

  async getSyncMeta(key: string): Promise<SyncMeta | undefined> {
    return this.db.syncMeta.get(key);
  }

  async setSyncMeta(key: string, value: number | string): Promise<void> {
    await this.db.syncMeta.put({ key, value });
  }

  async getLastServerVersion(): Promise<number> {
    const meta = await this.getSyncMeta("lastServerVersion");
    return meta ? Number(meta.value) : 0;
  }

  async clearAllData(): Promise<void> {
    await this.db.transaction(
      "rw",
      [
        this.db.user,
        this.db.entries,
        this.db.tags,
        this.db.tiptaps,
        this.db.syncMeta,
        this.db.statistics,
      ],
      async () => {
        await Promise.all([
          this.db.user.clear(),
          this.db.entries.clear(),
          this.db.tags.clear(),
          this.db.tiptaps.clear(),
          this.db.syncMeta.clear(),
          this.db.statistics.clear(),
        ]);
      },
    );
  }

  // Statistics
  async getStatistic(key: string): Promise<Statistic | undefined> {
    return this.db.statistics.get(key);
  }

  async setStatistic(key: string, value: unknown): Promise<void> {
    const existing = await this.getStatistic(key);
    if (existing) {
      await this.db.statistics.update(existing.stKey, {
        stValue: value,
      });
    } else {
      await this.db.statistics.add({
        stKey: key,
        stValue: value,
      });
    }
  }

  async putStatistics(statistics: Statistic[]): Promise<void> {
    await this.db.statistics.bulkPut(statistics);
  }
}
