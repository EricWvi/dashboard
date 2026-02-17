import { SchemaVersion, type Card, type Folder } from "./model";
import { type TiptapV2, SyncStatus } from "@/lib/model";
import { getRequest, postRequest } from "@/lib/queryClient";
import type { IFlomoDatabase } from "./db-interface";

// API response types
interface FlomoSyncResponse {
  serverVersion: number;
  card: Omit<Card, "syncStatus">[];
  folder: Omit<Folder, "syncStatus">[];
  tiptap: Omit<TiptapV2, "syncStatus">[];
}

/**
 * SyncManager handles bidirectional synchronization between local database and server
 */
export class SyncManager {
  private db: IFlomoDatabase;
  private isSyncing = false;
  private intervalMs: number = 3000;
  private syncTimeout: NodeJS.Timeout | undefined = undefined;

  constructor(db: IFlomoDatabase) {
    this.db = db;
  }

  async needFullSync(): Promise<boolean> {
    const lastServerVersion = await this.db.getLastServerVersion();
    if (lastServerVersion === 0) {
      return true;
    }
    const schemaVersion = await this.db.getSyncMeta("schemaVersion");
    return schemaVersion!.value !== SchemaVersion;
  }

  /**
   * Perform full synchronization (initial sync)
   * Downloads all data from server and replaces local database
   */
  async fullSync(): Promise<void> {
    if (this.isSyncing) {
      console.log("Sync already in progress");
      return;
    }

    this.isSyncing = true;

    this.db.clearAllData().catch((error) => {
      console.error("Failed to clear local database during full sync:", error);
    });

    try {
      console.log("Starting full sync...");

      // Fetch all data from server
      const response = await getRequest("/api/flomo?Action=FullSync");
      const data = await response.json();
      const serverData = data.message as FlomoSyncResponse;

      // Clear existing data
      await this.db.clearAllData();

      const cards: Card[] = serverData.card.map((card) => ({
        ...card,
        syncStatus: SyncStatus.Synced,
      }));
      const folders: Folder[] = serverData.folder.map((folder) => ({
        ...folder,
        syncStatus: SyncStatus.Synced,
      }));
      const tiptaps: TiptapV2[] = serverData.tiptap.map((tiptap) => ({
        ...tiptap,
        syncStatus: SyncStatus.Synced,
      }));

      // Bulk insert
      await Promise.all([
        this.db.putCards(cards),
        this.db.putFolders(folders),
        this.db.putTiptaps(tiptaps),
      ]);

      await this.db.setSyncMeta("schemaVersion", SchemaVersion);
      await this.db.setSyncMeta("lastServerVersion", serverData.serverVersion);

      console.log(
        `Full sync complete: ${cards.length} cards, ${folders.length} folders, ${tiptaps.length} tiptaps`,
      );
    } catch (error) {
      console.error("Full sync failed:", error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push local changes to server
   */
  async pushChanges(): Promise<void> {
    try {
      const pending = await this.db.getPendingChanges();

      if (
        pending.cards.length === 0 &&
        pending.folders.length === 0 &&
        pending.tiptaps.length === 0
      ) {
        return;
      }

      // Send to server
      const response = await postRequest("/api/flomo?Action=Push", pending);

      if (response.ok) {
        // Mark as synced locally
        const updates: Array<Promise<void>> = [];

        for (const card of pending.cards) {
          updates.push(this.db.markCardSynced(card.id));
        }

        for (const folder of pending.folders) {
          updates.push(this.db.markFolderSynced(folder.id));
        }

        for (const tiptap of pending.tiptaps) {
          updates.push(this.db.markTiptapSynced(tiptap.id));
        }

        await Promise.all(updates);

        console.log(
          `Pushed ${pending.cards.length} cards, ${pending.folders.length} folders, ${pending.tiptaps.length} tiptaps`,
        );
      } else {
        throw new Error(`Push failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error("pushChanges failed:", error);
      throw error;
    }
  }

  /**
   * Pull changes from server (incremental sync)
   */
  async pullChanges(): Promise<void> {
    try {
      const lastVersion = await this.db.getLastServerVersion();

      // Fetch changes since last version
      const response = await getRequest(
        `/api/flomo?Action=Pull&since=${lastVersion}`,
      );
      const data = await response.json();
      const serverData = data.message as FlomoSyncResponse;

      if (
        serverData.card.length === 0 &&
        serverData.folder.length === 0 &&
        serverData.tiptap.length === 0
      ) {
        return;
      }

      // Apply changes using Last-Write-Wins (LWW) strategy
      const updates: Array<Promise<void>> = [];

      for (const remoteCard of serverData.card) {
        if (remoteCard.isDeleted) {
          // If server says it's deleted, delete locally
          updates.push(this.db.deleteCard(remoteCard.id));
          continue;
        }

        const localCard = await this.db.getCard(remoteCard.id);
        // Only update if remote is newer or local doesn't exist
        if (!localCard || remoteCard.updatedAt > localCard.updatedAt) {
          updates.push(
            this.db.putCard({
              ...remoteCard,
              syncStatus: SyncStatus.Synced,
            }),
          );
        }
      }

      for (const remoteFolder of serverData.folder) {
        if (remoteFolder.isDeleted) {
          updates.push(this.db.deleteFolder(remoteFolder.id));
          continue;
        }

        const localFolder = await this.db.getFolder(remoteFolder.id);
        if (!localFolder || remoteFolder.updatedAt > localFolder.updatedAt) {
          updates.push(
            this.db.putFolder({
              ...remoteFolder,
              syncStatus: SyncStatus.Synced,
            }),
          );
        }
      }

      for (const remoteTiptap of serverData.tiptap) {
        if (remoteTiptap.isDeleted) {
          updates.push(this.db.deleteTiptap(remoteTiptap.id));
          continue;
        }

        const localTiptap = await this.db.getTiptap(remoteTiptap.id);
        if (!localTiptap || remoteTiptap.updatedAt > localTiptap.updatedAt) {
          updates.push(
            this.db.putTiptap({
              ...remoteTiptap,
              syncStatus: SyncStatus.Synced,
            }),
          );
        }
      }

      await Promise.all(updates);

      // Update last server version
      await this.db.setSyncMeta("lastServerVersion", serverData.serverVersion);

      console.log(
        `Pulled ${serverData.card.length} cards, ${serverData.folder.length} folders, ${serverData.tiptap.length} tiptaps`,
      );
    } catch (error) {
      console.error("Pull failed:", error);
      throw error;
    }
  }

  /**
   * Perform bidirectional sync (push then pull)
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log("Sync already in progress");
      return;
    }

    this.isSyncing = true;

    try {
      // Push local changes first
      await this.pushChanges();
      // Then pull remote changes
      await this.pullChanges();
    } catch (error) {
      console.error("Sync failed:", error);
      // Don't throw - we'll retry on next interval
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Start automatic sync at specified interval
   */
  startAutoSync(): void {
    this.stopAutoSync();
    console.log(`Starting auto-sync`);
    this.autoSync();
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncTimeout !== undefined) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = undefined;
    }
  }

  autoSync(): void {
    this.sync().finally(() => {
      if (this.syncTimeout !== undefined) {
        clearTimeout(this.syncTimeout);
      }
      // Set up interval
      this.syncTimeout = setTimeout(() => {
        this.autoSync();
      }, this.intervalMs);
    });
  }
}
