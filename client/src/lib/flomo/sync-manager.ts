import { SchemaVersion, type Card, type Folder } from "./model";
import { type TiptapV2, SyncStatus } from "@/lib/model";
import { flomoDatabase, type IFlomoDatabase } from "./db-interface";
import { syncClient, type ISyncClient } from "./sync-client";
import { syncEvents } from "@/lib/sync-events";

/**
 * SyncManager handles bidirectional synchronization between local database and server
 */
export class SyncManager {
  private db: IFlomoDatabase;
  private client: ISyncClient;
  private isSyncing = false;
  private intervalMs: number = 3000;
  private syncTimeout: NodeJS.Timeout | undefined = undefined;

  constructor(db: IFlomoDatabase, client: ISyncClient) {
    this.db = db;
    this.client = client;
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
      const serverData = await this.client.FullSync();

      // Clear existing data
      await this.db.clearAllData();

      const cards: Card[] = serverData.cards.map((card) => ({
        ...card,
        syncStatus: SyncStatus.Synced,
      }));
      const folders: Folder[] = serverData.folders.map((folder) => ({
        ...folder,
        syncStatus: SyncStatus.Synced,
      }));
      const tiptaps: TiptapV2[] = serverData.tiptaps.map((tiptap) => ({
        ...tiptap,
        syncStatus: SyncStatus.Synced,
      }));

      // Bulk insert
      await Promise.all([
        this.db.putUser({
          ...serverData.users[0],
          syncStatus: SyncStatus.Synced,
        }),
        this.db.putCards(cards),
        this.db.putFolders(folders),
        this.db.putTiptaps(tiptaps),
      ]);

      await this.db.setSyncMeta("schemaVersion", SchemaVersion);
      await this.db.setSyncMeta("lastServerVersion", serverData.serverVersion);

      console.log(
        `Full sync complete: ${serverData.users?.length || 0} user, ${cards.length} cards, ${folders.length} folders, ${tiptaps.length} tiptaps`,
      );
    } catch (error) {
      console.error("Full sync failed:", error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async pushLocalData(): Promise<void> {
    try {
      const allData = await this.db.getLocalDataForSync();

      if (
        allData.cards.length === 0 &&
        allData.folders.length === 0 &&
        allData.tiptaps.length === 0
      ) {
        return;
      }

      // Send to server
      const response = await this.client.Push(allData);

      if (response.ok) {
        console.log(
          `Manually pushed ${allData.cards.length} cards, ${allData.folders.length} folders, ${allData.tiptaps.length} tiptaps`,
        );
      } else {
        throw new Error(`Push failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error("pushLocalData failed:", error);
      throw error;
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
      const response = await this.client.Push(pending);

      if (response.ok) {
        // Mark as synced locally
        const updates: Array<Promise<void>> = [];

        for (const card of pending.cards) {
          updates.push(this.db.markCardSynced(card.id, card.updatedAt));
        }

        for (const folder of pending.folders) {
          updates.push(this.db.markFolderSynced(folder.id, folder.updatedAt));
        }

        for (const tiptap of pending.tiptaps) {
          updates.push(this.db.markTiptapSynced(tiptap.id, tiptap.updatedAt));
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
      const serverData = await this.client.Pull(lastVersion);

      if (
        serverData.users.length === 0 &&
        serverData.cards.length === 0 &&
        serverData.folders.length === 0 &&
        serverData.tiptaps.length === 0
      ) {
        return;
      }

      // Apply changes using Last-Write-Wins (LWW) strategy
      const updates: Array<Promise<void>> = [];

      // Handle user data
      let userApplied = 0;
      if (serverData.users && serverData.users.length > 0) {
        const remoteUser = serverData.users[0];
        const localUser = await this.db.getUser();
        // Only update if remote is newer or local doesn't exist
        if (!localUser || remoteUser.updatedAt > localUser.updatedAt) {
          updates.push(
            this.db.putUser({ ...remoteUser, syncStatus: SyncStatus.Synced }),
          );
          userApplied++;
        }
      }

      let cardApplied = 0;
      for (const remoteCard of serverData.cards) {
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
          cardApplied++;
        }
      }

      let folderApplied = 0;
      for (const remoteFolder of serverData.folders) {
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
          folderApplied++;
        }
      }

      let tiptapApplied = 0;
      const updatedTiptapIds: string[] = [];
      for (const remoteTiptap of serverData.tiptaps) {
        if (remoteTiptap.isDeleted) {
          updates.push(this.db.deleteTiptap(remoteTiptap.id));
          continue;
        }

        const localTiptap = await this.db.getTiptap(remoteTiptap.id);
        if (!localTiptap || remoteTiptap.updatedAt > localTiptap.updatedAt) {
          updatedTiptapIds.push(remoteTiptap.id);
          updates.push(
            this.db.putTiptap({
              ...remoteTiptap,
              syncStatus: SyncStatus.Synced,
            }),
          );
          tiptapApplied++;
        }
      }

      await Promise.all(updates);

      // Emit events for updated tiptaps
      if (updatedTiptapIds.length > 0) {
        syncEvents.emitMany(updatedTiptapIds);
      }

      // Update last server version
      await this.db.setSyncMeta("lastServerVersion", serverData.serverVersion);

      if (
        userApplied > 0 ||
        cardApplied > 0 ||
        folderApplied > 0 ||
        tiptapApplied > 0
      ) {
        console.log(
          `Pulled ${userApplied} user, ${cardApplied} cards, ${folderApplied} folders, ${tiptapApplied} tiptaps`,
        );
      }
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

// Create singleton sync manager
let syncManager: SyncManager | null = null;

export function getSyncManager() {
  if (!syncManager) {
    syncManager = new SyncManager(flomoDatabase, syncClient);
  }
  return syncManager;
}
