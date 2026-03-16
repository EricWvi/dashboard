import { v4 as uuidv4 } from "uuid";
import Dexie, { type EntityTable } from "dexie";
import {
  ArchiveFolderId,
  SchemaVersion,
  type Card,
  type CardField,
  type CardPayload,
  type FlomoData,
  type Folder,
  type FolderField,
  type FolderPayload,
} from "./model";
import {
  SyncStatus,
  type SyncMeta,
  type TiptapV2,
  type TiptapV2Field,
  type User,
} from "@/lib/model";
import type { IFlomoDatabase } from "./db-interface";

const USER_KEY = "current_user";

// Database interface for type safety
export interface FlomoDB {
  user: EntityTable<User, "key">;
  cards: EntityTable<Card, "id">;
  folders: EntityTable<Folder, "id">;
  tiptaps: EntityTable<TiptapV2, "id">;
  syncMeta: EntityTable<SyncMeta, "key">;
}

// Dexie implementation
export class DexieFlomoDatabase implements IFlomoDatabase {
  private db: Dexie & FlomoDB;

  constructor() {
    this.db = new Dexie("FlomoDB") as Dexie & FlomoDB;
    this.initSchema();
  }

  private initSchema() {
    this.db.version(SchemaVersion).stores({
      user: "key",
      cards: "id, syncStatus, folderId, updatedAt, isBookmarked, isArchived",
      folders: "id, syncStatus, parentId, updatedAt, isBookmarked, isArchived",
      tiptaps: "id, syncStatus, updatedAt",
      syncMeta: "key",
    });
  }

  // User
  async getUser(): Promise<User | undefined> {
    return this.db.user.get(USER_KEY);
  }

  async putUser(user: User): Promise<void> {
    await this.db.user.put({ ...user, key: USER_KEY });
  }

  // Cards
  async getCard(id: string): Promise<Omit<Card, "rawText"> | undefined> {
    return this.db.cards.get(id);
  }

  async getFullCard(id: string): Promise<Card | undefined> {
    return this.db.cards.get(id);
  }

  async getCardsInFolder(folderId: string): Promise<Omit<Card, "rawText">[]> {
    if (folderId === ArchiveFolderId) {
      return this.db.cards
        .where("isArchived")
        .equals(1)
        .and((card) => !card.isDeleted)
        .toArray();
    }
    return this.db.cards
      .where("folderId")
      .equals(folderId)
      .and((card) => !card.isDeleted && card.isArchived === 0)
      .toArray();
  }

  async addCard(card: CardField): Promise<string> {
    const id = uuidv4();
    await this.db.cards.add({
      ...card,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
      syncStatus: SyncStatus.Pending,
    });
    return id;
  }

  async putCard(card: Card): Promise<void> {
    await this.db.cards.put(card);
  }

  async putCards(cards: Card[]): Promise<void> {
    await this.db.cards.bulkPut(cards);
  }

  async updateCard(id: string, updates: Partial<CardField>): Promise<void> {
    await this.db.cards.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteCard(id: string): Promise<void> {
    await this.db.cards.delete(id);
  }

  async softDeleteCard(id: string): Promise<void> {
    await this.db.cards.update(id, {
      updatedAt: Date.now(),
      isDeleted: true,
      syncStatus: SyncStatus.Pending,
    });
  }

  async markCardSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.cards
      .where("id")
      .equals(id)
      .and((card) => card.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  async getBookmarkedCards(): Promise<Omit<Card, "rawText">[]> {
    return this.db.cards
      .where("isBookmarked")
      .equals(1)
      .and((card) => !card.isDeleted && card.isArchived === 0)
      .toArray();
  }

  async getRecentCards(limit: number): Promise<Card[]> {
    return this.db.cards
      .orderBy("updatedAt")
      .reverse()
      .filter((card) => !card.isDeleted && card.isArchived === 0)
      .limit(limit)
      .toArray();
  }

  // Folders
  async getFolder(id: string): Promise<Folder | undefined> {
    return this.db.folders.get(id);
  }

  async getFoldersInParent(parentId: string): Promise<Folder[]> {
    if (parentId === ArchiveFolderId) {
      return this.db.folders
        .where("isArchived")
        .equals(1)
        .and((folder) => !folder.isDeleted)
        .toArray();
    }
    return this.db.folders
      .where("parentId")
      .equals(parentId)
      .and((folder) => !folder.isDeleted && folder.isArchived === 0)
      .toArray();
  }

  async addFolder(folder: FolderField): Promise<string> {
    const id = uuidv4();
    await this.db.folders.add({
      ...folder,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
      syncStatus: SyncStatus.Pending,
    });
    return id;
  }

  async putFolder(folder: Folder): Promise<void> {
    await this.db.folders.put(folder);
  }

  async putFolders(folders: Folder[]): Promise<void> {
    await this.db.folders.bulkPut(folders);
  }

  async updateFolder(id: string, updates: Partial<FolderField>): Promise<void> {
    await this.db.folders.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteFolder(id: string): Promise<void> {
    await this.db.folders.delete(id);
  }

  async softDeleteFolder(id: string): Promise<void> {
    await this.db.folders.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markFolderSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.folders
      .where("id")
      .equals(id)
      .and((folder) => folder.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  async getBookmarkedFolders(): Promise<Folder[]> {
    return this.db.folders
      .where("isBookmarked")
      .equals(1)
      .and((folder) => !folder.isDeleted && folder.isArchived === 0)
      .toArray();
  }

  // Order
  async lastOrderInFolder(
    folderId: string,
    type: "card" | "folder",
  ): Promise<string | null> {
    if (type === "card") {
      const cards = await this.db.cards
        .where("folderId")
        .equals(folderId)
        .and((card) => !card.isDeleted && card.isArchived === 0)
        .toArray();
      const orders = cards
        .map((c) => (c.payload as CardPayload).sortOrder)
        .filter(Boolean);
      if (orders.length === 0) return null;
      orders.sort();
      return orders[orders.length - 1];
    } else {
      const folders = await this.db.folders
        .where("parentId")
        .equals(folderId)
        .and((folder) => !folder.isDeleted && folder.isArchived === 0)
        .toArray();
      const orders = folders
        .map((f) => (f.payload as FolderPayload).sortOrder)
        .filter(Boolean);
      if (orders.length === 0) return null;
      orders.sort();
      return orders[orders.length - 1];
    }
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
  async getPendingChanges(): Promise<FlomoData> {
    const [cards, folders, tiptaps] = await Promise.all([
      this.db.cards.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.folders.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.tiptaps.where("syncStatus").equals(SyncStatus.Pending).toArray(),
    ]);
    return { cards, folders, tiptaps };
  }

  async getLocalDataForSync(): Promise<FlomoData> {
    const [cards, folders, tiptaps] = await Promise.all([
      this.db.cards.toArray(),
      this.db.folders.toArray(),
      this.db.tiptaps.toArray(),
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
      [
        this.db.user,
        this.db.cards,
        this.db.folders,
        this.db.tiptaps,
        this.db.syncMeta,
      ],
      async () => {
        await Promise.all([
          this.db.user.clear(),
          this.db.cards.clear(),
          this.db.folders.clear(),
          this.db.tiptaps.clear(),
          this.db.syncMeta.clear(),
        ]);
      },
    );
  }
}
