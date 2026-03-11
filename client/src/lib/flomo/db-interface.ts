import { tiptapRefresh, triggerRefresh } from "@/hooks/flomo/query-keys";
import { DexieFlomoDatabase } from "./dexie";
import { SqliteFlomoDatabase } from "./sqlite";
import {
  type Card,
  type CardField,
  type FlomoData,
  type Folder,
  type FolderField,
} from "./model";
import {
  type SyncMeta,
  type TiptapV2,
  type TiptapV2Field,
  type User,
} from "@/lib/model";
import { isTauri } from "@/lib/utils";

// Database abstraction interface
export interface IFlomoDatabase {
  // User
  getUser(): Promise<User | undefined>;
  putUser(user: Omit<User, "key">): Promise<void>;

  // Cards
  getCard(id: string): Promise<Card | undefined>;
  getCardsInFolder(folderId: string): Promise<Card[]>;
  addCard(card: CardField): Promise<string>;
  putCard(card: Card): Promise<void>;
  putCards(cards: Card[]): Promise<void>;
  updateCard(id: string, updates: Partial<CardField>): Promise<void>;
  deleteCard(id: string): Promise<void>;
  softDeleteCard(id: string): Promise<void>;
  markCardSynced(id: string, updatedAt: number): Promise<void>;
  getArchivedCards(): Promise<Card[]>;
  getBookmarkedCards(): Promise<Card[]>;
  getRecentCards(limit: number): Promise<Card[]>;

  // Folders
  getFolder(id: string): Promise<Folder | undefined>;
  getFoldersInParent(parentId: string): Promise<Folder[]>;
  addFolder(folder: FolderField): Promise<string>;
  putFolder(folder: Folder): Promise<void>;
  putFolders(folders: Folder[]): Promise<void>;
  updateFolder(id: string, updates: Partial<FolderField>): Promise<void>;
  deleteFolder(id: string): Promise<void>;
  softDeleteFolder(id: string): Promise<void>;
  markFolderSynced(id: string, updatedAt: number): Promise<void>;
  getArchivedFolders(): Promise<Folder[]>;
  getBookmarkedFolders(): Promise<Folder[]>;

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
  getPendingChanges(): Promise<FlomoData>;
  getLocalDataForSync(): Promise<FlomoData>;
  getSyncMeta(key: string): Promise<SyncMeta | undefined>;
  setSyncMeta(key: string, value: number | string): Promise<void>;
  getLastServerVersion(): Promise<number>;
  clearAllData(): Promise<void>;
}

export class RefreshDecorator implements IFlomoDatabase {
  private baseDb: IFlomoDatabase;
  private onTableChange: (table: string, id?: string) => void;

  constructor(
    baseDb: IFlomoDatabase,
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

  // Cards
  async getCard(id: string): Promise<Card | undefined> {
    return this.baseDb.getCard(id);
  }

  async getCardsInFolder(folderId: string): Promise<Card[]> {
    return this.baseDb.getCardsInFolder(folderId);
  }

  async addCard(card: CardField): Promise<string> {
    const id = await this.baseDb.addCard(card);
    this.onTableChange("cards");
    return id;
  }

  async putCard(card: Card): Promise<void> {
    await this.baseDb.putCard(card);
    this.onTableChange("cards");
  }

  async putCards(cards: Card[]): Promise<void> {
    await this.baseDb.putCards(cards);
    this.onTableChange("cards");
  }

  async updateCard(id: string, updates: Partial<CardField>): Promise<void> {
    await this.baseDb.updateCard(id, updates);
    this.onTableChange("cards");
  }

  async deleteCard(id: string): Promise<void> {
    await this.baseDb.deleteCard(id);
    this.onTableChange("cards");
  }

  async softDeleteCard(id: string): Promise<void> {
    await this.baseDb.softDeleteCard(id);
    this.onTableChange("cards");
  }

  async markCardSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markCardSynced(id, updatedAt);
  }

  async getArchivedCards(): Promise<Card[]> {
    return this.baseDb.getArchivedCards();
  }

  async getBookmarkedCards(): Promise<Card[]> {
    return this.baseDb.getBookmarkedCards();
  }

  async getRecentCards(limit: number): Promise<Card[]> {
    return this.baseDb.getRecentCards(limit);
  }

  // Folders
  async getFolder(id: string): Promise<Folder | undefined> {
    return this.baseDb.getFolder(id);
  }

  async getFoldersInParent(parentId: string): Promise<Folder[]> {
    return this.baseDb.getFoldersInParent(parentId);
  }

  async addFolder(folder: FolderField): Promise<string> {
    const id = await this.baseDb.addFolder(folder);
    this.onTableChange("folders");
    return id;
  }

  async putFolder(folder: Folder): Promise<void> {
    await this.baseDb.putFolder(folder);
    this.onTableChange("folders");
  }

  async putFolders(folders: Folder[]): Promise<void> {
    await this.baseDb.putFolders(folders);
    this.onTableChange("folders");
  }

  async updateFolder(id: string, updates: Partial<FolderField>): Promise<void> {
    await this.baseDb.updateFolder(id, updates);
    this.onTableChange("folders");
  }

  async deleteFolder(id: string): Promise<void> {
    await this.baseDb.deleteFolder(id);
    this.onTableChange("folders");
  }

  async softDeleteFolder(id: string): Promise<void> {
    await this.baseDb.softDeleteFolder(id);
    this.onTableChange("folders");
  }

  async markFolderSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markFolderSynced(id, updatedAt);
  }

  async getArchivedFolders(): Promise<Folder[]> {
    return this.baseDb.getArchivedFolders();
  }

  async getBookmarkedFolders(): Promise<Folder[]> {
    return this.baseDb.getBookmarkedFolders();
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
  async getPendingChanges(): Promise<FlomoData> {
    return this.baseDb.getPendingChanges();
  }

  async getLocalDataForSync(): Promise<FlomoData> {
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
function createBaseDatabase(): IFlomoDatabase {
  if (isTauri()) {
    return new SqliteFlomoDatabase();
  }
  return new DexieFlomoDatabase();
}

// Export singleton instance
export const flomoDatabase: IFlomoDatabase = new RefreshDecorator(
  createBaseDatabase(),
  (table, id?: string) => {
    if (table === "tiptap") {
      tiptapRefresh(id!);
    }
    triggerRefresh(table);
  },
);
