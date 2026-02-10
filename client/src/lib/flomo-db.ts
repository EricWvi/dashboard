import Dexie, { type EntityTable } from "dexie";

// Database models (omitting creator_id, review_count, site)
export interface Card {
  id: string; // UUID
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds
  serverVersion: number;
  isDeleted: boolean;
  folderId: string | null; // UUID
  title: string;
  draft: string; // UUID
  payload: Record<string, unknown>;
  rawText: string;
  syncStatus: "synced" | "pending" | "deleted";
}

export interface Folder {
  id: string; // UUID
  createdAt: number;
  updatedAt: number;
  serverVersion: number;
  isDeleted: boolean;
  parentId: string | null; // UUID
  title: string;
  payload: Record<string, unknown>;
  syncStatus: "synced" | "pending" | "deleted";
}

export interface TiptapV2 {
  id: string; // UUID
  createdAt: number;
  updatedAt: number;
  serverVersion: number;
  isDeleted: boolean;
  content: Record<string, unknown>;
  history: unknown[];
  syncStatus: "synced" | "pending" | "deleted";
}

export interface SyncMeta {
  key: string;
  value: number | string;
}

// Database interface for type safety
export interface FlomoDB {
  cards: EntityTable<Card, "id">;
  folders: EntityTable<Folder, "id">;
  tiptaps: EntityTable<TiptapV2, "id">;
  syncMeta: EntityTable<SyncMeta, "key">;
}

// Database instance
export const db = new Dexie("FlomoDB") as Dexie & FlomoDB;

// Schema definition
db.version(1).stores({
  cards: "id, serverVersion, syncStatus, folderId, updatedAt",
  folders: "id, serverVersion, syncStatus, parentId, updatedAt",
  tiptaps: "id, serverVersion, syncStatus, updatedAt",
  syncMeta: "key",
});

// Database abstraction interface
export interface IFlomoDatabase {
  // Cards
  getCard(id: string): Promise<Card | undefined>;
  getAllCards(): Promise<Card[]>;
  getCardsInFolder(folderId: string | null): Promise<Card[]>;
  putCard(card: Card): Promise<void>;
  putCards(cards: Card[]): Promise<void>;
  deleteCard(id: string): Promise<void>;

  // Folders
  getFolder(id: string): Promise<Folder | undefined>;
  getAllFolders(): Promise<Folder[]>;
  getFoldersInParent(parentId: string | null): Promise<Folder[]>;
  putFolder(folder: Folder): Promise<void>;
  putFolders(folders: Folder[]): Promise<void>;
  deleteFolder(id: string): Promise<void>;

  // Tiptaps
  getTiptap(id: string): Promise<TiptapV2 | undefined>;
  putTiptap(tiptap: TiptapV2): Promise<void>;
  putTiptaps(tiptaps: TiptapV2[]): Promise<void>;

  // Sync
  getPendingChanges(): Promise<{
    cards: Card[];
    folders: Folder[];
    tiptaps: TiptapV2[];
  }>;
  getSyncMeta(key: string): Promise<SyncMeta | undefined>;
  setSyncMeta(key: string, value: number | string): Promise<void>;
  getLastServerVersion(): Promise<number>;
  clearAllData(): Promise<void>;
}

// Dexie implementation
export class DexieFlomoDatabase implements IFlomoDatabase {
  private db: Dexie & FlomoDB;

  constructor(db: Dexie & FlomoDB) {
    this.db = db;
  }

  async getCard(id: string): Promise<Card | undefined> {
    return this.db.cards.get(id);
  }

  async getAllCards(): Promise<Card[]> {
    return this.db.cards.filter((card) => !card.isDeleted).toArray();
  }

  async getCardsInFolder(folderId: string | null): Promise<Card[]> {
    return this.db.cards
      .filter((card) => !card.isDeleted && card.folderId === folderId)
      .toArray();
  }

  async putCard(card: Card): Promise<void> {
    await this.db.cards.put(card);
  }

  async putCards(cards: Card[]): Promise<void> {
    await this.db.cards.bulkPut(cards);
  }

  async deleteCard(id: string): Promise<void> {
    await this.db.cards.delete(id);
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    return this.db.folders.get(id);
  }

  async getAllFolders(): Promise<Folder[]> {
    return this.db.folders.filter((folder) => !folder.isDeleted).toArray();
  }

  async getFoldersInParent(parentId: string | null): Promise<Folder[]> {
    return this.db.folders
      .filter((folder) => !folder.isDeleted && folder.parentId === parentId)
      .toArray();
  }

  async putFolder(folder: Folder): Promise<void> {
    await this.db.folders.put(folder);
  }

  async putFolders(folders: Folder[]): Promise<void> {
    await this.db.folders.bulkPut(folders);
  }

  async deleteFolder(id: string): Promise<void> {
    await this.db.folders.delete(id);
  }

  async getTiptap(id: string): Promise<TiptapV2 | undefined> {
    return this.db.tiptaps.get(id);
  }

  async putTiptap(tiptap: TiptapV2): Promise<void> {
    await this.db.tiptaps.put(tiptap);
  }

  async putTiptaps(tiptaps: TiptapV2[]): Promise<void> {
    await this.db.tiptaps.bulkPut(tiptaps);
  }

  async getPendingChanges(): Promise<{
    cards: Card[];
    folders: Folder[];
    tiptaps: TiptapV2[];
  }> {
    const [cards, folders, tiptaps] = await Promise.all([
      this.db.cards.where("syncStatus").anyOf(["pending", "deleted"]).toArray(),
      this.db.folders
        .where("syncStatus")
        .anyOf(["pending", "deleted"])
        .toArray(),
      this.db.tiptaps
        .where("syncStatus")
        .anyOf(["pending", "deleted"])
        .toArray(),
    ]);
    return { cards, folders, tiptaps };
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
      this.db.cards,
      this.db.folders,
      this.db.tiptaps,
      this.db.syncMeta,
      async () => {
        await Promise.all([
          this.db.cards.clear(),
          this.db.folders.clear(),
          this.db.tiptaps.clear(),
          this.db.syncMeta.clear(),
        ]);
      },
    );
  }
}

// Export singleton instance
export const flomoDatabase = new DexieFlomoDatabase(db);
