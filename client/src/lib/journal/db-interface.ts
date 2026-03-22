import { tiptapRefresh, triggerRefresh } from "@/hooks/journal/query-keys";
import { DexieJournalDatabase } from "./dexie";
import { SqliteJournalDatabase } from "./sqlite";
import {
  type Entry,
  type EntryField,
  type JournalData,
  type Tag,
  type TagField,
} from "./model";
import {
  type SyncMeta,
  type TiptapV2,
  type TiptapV2Field,
  type User,
} from "@/lib/model";
import { isTauri } from "@/lib/utils";

// Database abstraction interface
export interface IJournalDatabase {
  // User
  getUser(): Promise<User | undefined>;
  putUser(user: Omit<User, "key">): Promise<void>;

  // Entries
  getEntry(id: string): Promise<Entry | undefined>;
  getAllEntries(): Promise<Entry[]>;
  addEntry(entry: EntryField): Promise<string>;
  putEntry(entry: Entry): Promise<void>;
  putEntries(entries: Entry[]): Promise<void>;
  updateEntry(id: string, updates: Partial<EntryField>): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  softDeleteEntry(id: string): Promise<void>;
  markEntrySynced(id: string, updatedAt: number): Promise<void>;

  // Tags
  getTag(id: string): Promise<Tag | undefined>;
  getAllTags(): Promise<Tag[]>;
  addTag(tag: TagField): Promise<string>;
  putTag(tag: Tag): Promise<void>;
  putTags(tags: Tag[]): Promise<void>;
  updateTag(id: string, updates: Partial<TagField>): Promise<void>;
  deleteTag(id: string): Promise<void>;
  softDeleteTag(id: string): Promise<void>;
  markTagSynced(id: string, updatedAt: number): Promise<void>;

  // Tiptaps
  getTiptap(id: string): Promise<TiptapV2 | undefined>;
  addTiptap(tiptap: TiptapV2Field): Promise<string>;
  putTiptap(tiptap: TiptapV2): Promise<void>;
  putTiptaps(tiptaps: TiptapV2[]): Promise<void>;
  syncTiptap(id: string, content: Record<string, unknown>): Promise<void>;
  updateTiptap(id: string, updates: Partial<TiptapV2Field>): Promise<void>;
  deleteTiptap(id: string): Promise<void>;
  softDeleteTiptap(id: string): Promise<void>;
  markTiptapSynced(id: string, updatedAt: number): Promise<void>;
  listTiptapHistory(id: string): Promise<number[]>;
  getTiptapHistory(id: string, ts: number): Promise<Record<string, unknown>>;
  restoreTiptapHistory(id: string, ts: number): Promise<void>;

  // Sync
  getPendingChanges(): Promise<JournalData>;
  getLocalDataForSync(): Promise<JournalData>;
  getSyncMeta(key: string): Promise<SyncMeta | undefined>;
  setSyncMeta(key: string, value: number | string): Promise<void>;
  getLastServerVersion(): Promise<number>;
  clearAllData(): Promise<void>;
}

export class RefreshDecorator implements IJournalDatabase {
  private baseDb: IJournalDatabase;
  private onTableChange: (table: string, id?: string) => void;

  constructor(
    baseDb: IJournalDatabase,
    onTableChange: (table: string, id?: string) => void,
  ) {
    this.baseDb = baseDb;
    this.onTableChange = onTableChange;
  }

  // User
  async getUser(): Promise<User | undefined> {
    return this.baseDb.getUser();
  }

  async putUser(user: Omit<User, "key">): Promise<void> {
    await this.baseDb.putUser(user);
    this.onTableChange("user");
  }

  // Entries
  async getEntry(id: string): Promise<Entry | undefined> {
    return this.baseDb.getEntry(id);
  }

  async getAllEntries(): Promise<Entry[]> {
    return this.baseDb.getAllEntries();
  }

  async addEntry(entry: EntryField): Promise<string> {
    const id = await this.baseDb.addEntry(entry);
    this.onTableChange("entries");
    return id;
  }

  async putEntry(entry: Entry): Promise<void> {
    await this.baseDb.putEntry(entry);
    this.onTableChange("entries");
  }

  async putEntries(entries: Entry[]): Promise<void> {
    await this.baseDb.putEntries(entries);
    this.onTableChange("entries");
  }

  async updateEntry(id: string, updates: Partial<EntryField>): Promise<void> {
    await this.baseDb.updateEntry(id, updates);
    this.onTableChange("entries");
  }

  async deleteEntry(id: string): Promise<void> {
    await this.baseDb.deleteEntry(id);
    this.onTableChange("entries");
  }

  async softDeleteEntry(id: string): Promise<void> {
    await this.baseDb.softDeleteEntry(id);
    this.onTableChange("entries");
  }

  async markEntrySynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markEntrySynced(id, updatedAt);
  }

  // Tags
  async getTag(id: string): Promise<Tag | undefined> {
    return this.baseDb.getTag(id);
  }

  async getAllTags(): Promise<Tag[]> {
    return this.baseDb.getAllTags();
  }

  async addTag(tag: TagField): Promise<string> {
    const id = await this.baseDb.addTag(tag);
    this.onTableChange("tags");
    return id;
  }

  async putTag(tag: Tag): Promise<void> {
    await this.baseDb.putTag(tag);
    this.onTableChange("tags");
  }

  async putTags(tags: Tag[]): Promise<void> {
    await this.baseDb.putTags(tags);
    this.onTableChange("tags");
  }

  async updateTag(id: string, updates: Partial<TagField>): Promise<void> {
    await this.baseDb.updateTag(id, updates);
    this.onTableChange("tags");
  }

  async deleteTag(id: string): Promise<void> {
    await this.baseDb.deleteTag(id);
    this.onTableChange("tags");
  }

  async softDeleteTag(id: string): Promise<void> {
    await this.baseDb.softDeleteTag(id);
    this.onTableChange("tags");
  }

  async markTagSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markTagSynced(id, updatedAt);
  }

  // Tiptaps
  async getTiptap(id: string): Promise<TiptapV2 | undefined> {
    return this.baseDb.getTiptap(id);
  }

  async addTiptap(tiptap: TiptapV2Field): Promise<string> {
    return this.baseDb.addTiptap(tiptap);
  }

  async putTiptap(tiptap: TiptapV2): Promise<void> {
    await this.baseDb.putTiptap(tiptap);
    this.onTableChange("tiptap", tiptap.id);
  }

  async putTiptaps(tiptaps: TiptapV2[]): Promise<void> {
    await this.baseDb.putTiptaps(tiptaps);
    this.onTableChange("tiptaps");
  }

  async syncTiptap(
    id: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    return this.baseDb.syncTiptap(id, content);
  }

  async updateTiptap(
    id: string,
    updates: Partial<TiptapV2Field>,
  ): Promise<void> {
    await this.baseDb.updateTiptap(id, updates);
    this.onTableChange("tiptap", id);
  }

  async deleteTiptap(id: string): Promise<void> {
    return this.baseDb.deleteTiptap(id);
  }

  async softDeleteTiptap(id: string): Promise<void> {
    return this.baseDb.softDeleteTiptap(id);
  }

  async markTiptapSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markTiptapSynced(id, updatedAt);
  }

  async listTiptapHistory(id: string): Promise<number[]> {
    return this.baseDb.listTiptapHistory(id);
  }

  async getTiptapHistory(
    id: string,
    ts: number,
  ): Promise<Record<string, unknown>> {
    return this.baseDb.getTiptapHistory(id, ts);
  }

  async restoreTiptapHistory(id: string, ts: number): Promise<void> {
    await this.baseDb.restoreTiptapHistory(id, ts);
    this.onTableChange("tiptap", id);
  }

  // Sync
  async getPendingChanges(): Promise<JournalData> {
    return this.baseDb.getPendingChanges();
  }

  async getLocalDataForSync(): Promise<JournalData> {
    return this.baseDb.getLocalDataForSync();
  }

  async getSyncMeta(key: string): Promise<SyncMeta | undefined> {
    return this.baseDb.getSyncMeta(key);
  }

  async setSyncMeta(key: string, value: number | string): Promise<void> {
    return this.baseDb.setSyncMeta(key, value);
  }

  async getLastServerVersion(): Promise<number> {
    return this.baseDb.getLastServerVersion();
  }

  async clearAllData(): Promise<void> {
    return this.baseDb.clearAllData();
  }
}

// Create base database based on runtime environment
function createBaseDatabase(): IJournalDatabase {
  if (isTauri()) {
    return new SqliteJournalDatabase();
  }
  return new DexieJournalDatabase();
}

// Export singleton instance
export const journalDatabase: IJournalDatabase = new RefreshDecorator(
  createBaseDatabase(),
  (table, id?: string) => {
    if (table === "tiptap") {
      tiptapRefresh(id!);
    }
    triggerRefresh(table);
  },
);
