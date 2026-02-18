import { v4 as uuidv4 } from "uuid";
import Dexie, { type EntityTable } from "dexie";
import {
  SchemaVersion,
  type Card,
  type CardField,
  type Folder,
  type FolderField,
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

// Database instance
export const db = new Dexie("FlomoDB") as Dexie & FlomoDB;

// Schema definition
db.version(SchemaVersion).stores({
  user: "key",
  cards: "id, syncStatus, folderId, updatedAt",
  folders: "id, syncStatus, parentId, updatedAt",
  tiptaps: "id, syncStatus, updatedAt",
  syncMeta: "key",
});

// Dexie implementation
export class DexieFlomoDatabase implements IFlomoDatabase {
  private db: Dexie & FlomoDB;

  constructor(db: Dexie & FlomoDB) {
    this.db = db;
  }

  async getUser(): Promise<User | undefined> {
    return this.db.user.get(USER_KEY);
  }

  async putUser(user: User): Promise<void> {
    await this.db.user.put({ ...user, key: USER_KEY });
  }

  async getCard(id: string): Promise<Card | undefined> {
    return this.db.cards.get(id);
  }

  async getCardsInFolder(folderId: string): Promise<Card[]> {
    return this.db.cards
      .where("folderId")
      .equals(folderId)
      .and((card) => !card.isDeleted)
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

  async markCardSynced(id: string): Promise<void> {
    await this.db.cards.update(id, { syncStatus: SyncStatus.Synced });
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    return this.db.folders.get(id);
  }

  async getFoldersInParent(parentId: string): Promise<Folder[]> {
    return this.db.folders
      .where("parentId")
      .equals(parentId)
      .and((folder) => !folder.isDeleted)
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

  async markFolderSynced(id: string): Promise<void> {
    await this.db.folders.update(id, { syncStatus: SyncStatus.Synced });
  }

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

  async markTiptapSynced(id: string): Promise<void> {
    await this.db.tiptaps.update(id, { syncStatus: SyncStatus.Synced });
  }

  async getPendingChanges(): Promise<{
    cards: Card[];
    folders: Folder[];
    tiptaps: TiptapV2[];
  }> {
    const [cards, folders, tiptaps] = await Promise.all([
      this.db.cards.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.folders.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.tiptaps.where("syncStatus").equals(SyncStatus.Pending).toArray(),
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
