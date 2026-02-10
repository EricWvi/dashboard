import type { IFlomoDatabase, Card, Folder, TiptapV2 } from "./flomo-db";
import { getRequest, postRequest } from "./queryClient";

// API response types
interface FlomoSyncResponse {
  card: Card[];
  folder: Folder[];
  tiptap: TiptapV2[];
}

interface FlomoPushRequest {
  card: Card[];
  folder: Folder[];
  tiptap: TiptapV2[];
}

// Sync status
export type SyncStatus =
  | "idle"
  | "syncing"
  | "full-sync"
  | "push"
  | "pull"
  | "error";

export interface SyncProgress {
  status: SyncStatus;
  error?: string;
  lastSyncTime?: number;
}

/**
 * SyncManager handles bidirectional synchronization between local database and server
 * Decoupled from database implementation for future Tauri support
 */
export class SyncManager {
  private db: IFlomoDatabase;
  private isSyncing = false;
  private syncIntervalId?: number;
  private listeners = new Set<(progress: SyncProgress) => void>();
  private currentProgress: SyncProgress = { status: "idle" };

  constructor(db: IFlomoDatabase) {
    this.db = db;
  }

  /**
   * Subscribe to sync progress updates
   */
  subscribe(listener: (progress: SyncProgress) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current progress
    listener(this.currentProgress);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateProgress(progress: SyncProgress) {
    this.currentProgress = progress;
    this.listeners.forEach((listener) => listener(progress));
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
    this.updateProgress({ status: "full-sync" });

    try {
      console.log("Starting full sync...");

      // Fetch all data from server
      const response = await getRequest("/api/flomo?Action=FullSync");
      const data = await response.json();
      const serverData = data.message as FlomoSyncResponse;

      // Clear existing data
      await this.db.clearAllData();

      // Convert and store cards
      const cards: Card[] = serverData.card.map((card) => ({
        id: card.id,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        serverVersion: card.serverVersion,
        isDeleted: card.isDeleted,
        folderId: card.folderId,
        title: card.title,
        draft: card.draft,
        payload: card.payload,
        rawText: card.rawText,
        syncStatus: "synced",
      }));

      // Convert and store folders
      const folders: Folder[] = serverData.folder.map((folder) => ({
        id: folder.id,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        serverVersion: folder.serverVersion,
        isDeleted: folder.isDeleted,
        parentId: folder.parentId,
        title: folder.title,
        payload: folder.payload,
        syncStatus: "synced",
      }));

      // Convert and store tiptaps
      const tiptaps: TiptapV2[] = serverData.tiptap.map((tiptap) => ({
        id: tiptap.id,
        createdAt: tiptap.createdAt,
        updatedAt: tiptap.updatedAt,
        serverVersion: tiptap.serverVersion,
        isDeleted: tiptap.isDeleted,
        content: tiptap.content,
        history: tiptap.history,
        syncStatus: "synced",
      }));

      // Bulk insert
      await Promise.all([
        this.db.putCards(cards),
        this.db.putFolders(folders),
        this.db.putTiptaps(tiptaps),
      ]);

      // Update last server version
      const maxVersion = Math.max(
        ...cards.map((c) => c.serverVersion),
        ...folders.map((f) => f.serverVersion),
        ...tiptaps.map((t) => t.serverVersion),
        0,
      );
      await this.db.setSyncMeta("lastServerVersion", maxVersion);
      await this.db.setSyncMeta("lastSyncTime", Date.now());

      console.log(
        `Full sync complete: ${cards.length} cards, ${folders.length} folders, ${tiptaps.length} tiptaps`,
      );

      this.updateProgress({
        status: "idle",
        lastSyncTime: Date.now(),
      });
    } catch (error) {
      console.error("Full sync failed:", error);
      this.updateProgress({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push local changes to server
   */
  async pushChanges(): Promise<void> {
    this.updateProgress({ status: "push" });

    try {
      const pending = await this.db.getPendingChanges();

      // Filter out items that should be pushed
      const cardsToSync = pending.cards.filter(
        (c) => c.syncStatus === "pending" || c.syncStatus === "deleted",
      );
      const foldersToSync = pending.folders.filter(
        (f) => f.syncStatus === "pending" || f.syncStatus === "deleted",
      );
      const tiptapsToSync = pending.tiptaps.filter(
        (t) => t.syncStatus === "pending" || t.syncStatus === "deleted",
      );

      if (
        cardsToSync.length === 0 &&
        foldersToSync.length === 0 &&
        tiptapsToSync.length === 0
      ) {
        console.log("No pending changes to push");
        return;
      }

      // Prepare push request (remove syncStatus field)
      const pushData: FlomoPushRequest = {
        card: cardsToSync,
        folder: foldersToSync,
        tiptap: tiptapsToSync,
      };

      // Send to server
      const response = await postRequest("/api/flomo?Action=Push", pushData);

      if (response.ok) {
        // Mark as synced locally
        const updates: Array<Promise<void>> = [];

        for (const card of cardsToSync) {
          if (card.syncStatus === "deleted") {
            updates.push(this.db.deleteCard(card.id));
          } else {
            updates.push(this.db.putCard({ ...card, syncStatus: "synced" }));
          }
        }

        for (const folder of foldersToSync) {
          if (folder.syncStatus === "deleted") {
            updates.push(this.db.deleteFolder(folder.id));
          } else {
            updates.push(
              this.db.putFolder({ ...folder, syncStatus: "synced" }),
            );
          }
        }

        for (const tiptap of tiptapsToSync) {
          if (tiptap.syncStatus === "deleted") {
            // Tiptaps are typically not deleted from local DB
            updates.push(
              this.db.putTiptap({ ...tiptap, syncStatus: "synced" }),
            );
          } else {
            updates.push(
              this.db.putTiptap({ ...tiptap, syncStatus: "synced" }),
            );
          }
        }

        await Promise.all(updates);

        console.log(
          `Pushed ${cardsToSync.length} cards, ${foldersToSync.length} folders, ${tiptapsToSync.length} tiptaps`,
        );
      } else {
        throw new Error(`Push failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Push failed:", error);
      throw error;
    }
  }

  /**
   * Pull changes from server (incremental sync)
   */
  async pullChanges(): Promise<void> {
    this.updateProgress({ status: "pull" });

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
        console.log("No changes to pull");
        return;
      }

      // Apply changes using Last-Write-Wins (LWW) strategy
      const updates: Array<Promise<void>> = [];

      for (const remoteCard of serverData.card) {
        const localCard = await this.db.getCard(remoteCard.id);

        // Only update if remote is newer or local doesn't exist
        if (
          !localCard ||
          remoteCard.updatedAt > localCard.updatedAt ||
          (remoteCard.updatedAt === localCard.updatedAt &&
            remoteCard.serverVersion > localCard.serverVersion)
        ) {
          const card: Card = {
            id: remoteCard.id,
            createdAt: remoteCard.createdAt,
            updatedAt: remoteCard.updatedAt,
            serverVersion: remoteCard.serverVersion,
            isDeleted: remoteCard.isDeleted,
            folderId: remoteCard.folderId,
            title: remoteCard.title,
            draft: remoteCard.draft,
            payload: remoteCard.payload,
            rawText: remoteCard.rawText,
            syncStatus: "synced",
          };
          updates.push(this.db.putCard(card));
        }
      }

      for (const remoteFolder of serverData.folder) {
        const localFolder = await this.db.getFolder(remoteFolder.id);

        if (
          !localFolder ||
          remoteFolder.updatedAt > localFolder.updatedAt ||
          (remoteFolder.updatedAt === localFolder.updatedAt &&
            remoteFolder.serverVersion > localFolder.serverVersion)
        ) {
          const folder: Folder = {
            id: remoteFolder.id,
            createdAt: remoteFolder.createdAt,
            updatedAt: remoteFolder.updatedAt,
            serverVersion: remoteFolder.serverVersion,
            isDeleted: remoteFolder.isDeleted,
            parentId: remoteFolder.parentId,
            title: remoteFolder.title,
            payload: remoteFolder.payload,
            syncStatus: "synced",
          };
          updates.push(this.db.putFolder(folder));
        }
      }

      for (const remoteTiptap of serverData.tiptap) {
        const localTiptap = await this.db.getTiptap(remoteTiptap.id);

        if (
          !localTiptap ||
          remoteTiptap.updatedAt > localTiptap.updatedAt ||
          (remoteTiptap.updatedAt === localTiptap.updatedAt &&
            remoteTiptap.serverVersion > localTiptap.serverVersion)
        ) {
          const tiptap: TiptapV2 = {
            id: remoteTiptap.id,
            createdAt: remoteTiptap.createdAt,
            updatedAt: remoteTiptap.updatedAt,
            serverVersion: remoteTiptap.serverVersion,
            isDeleted: remoteTiptap.isDeleted,
            content: remoteTiptap.content,
            history: remoteTiptap.history,
            syncStatus: "synced",
          };
          updates.push(this.db.putTiptap(tiptap));
        }
      }

      await Promise.all(updates);

      // Update last server version
      const maxVersion = Math.max(
        ...serverData.card.map((c) => c.serverVersion),
        ...serverData.folder.map((f) => f.serverVersion),
        ...serverData.tiptap.map((t) => t.serverVersion),
        lastVersion,
      );

      await this.db.setSyncMeta("lastServerVersion", maxVersion);

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
    this.updateProgress({ status: "syncing" });

    try {
      // Push local changes first
      await this.pushChanges();

      // Then pull remote changes
      await this.pullChanges();

      await this.db.setSyncMeta("lastSyncTime", Date.now());

      this.updateProgress({
        status: "idle",
        lastSyncTime: Date.now(),
      });
    } catch (error) {
      console.error("Sync failed:", error);
      this.updateProgress({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Don't throw - we'll retry on next interval
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Start automatic sync at specified interval
   */
  startAutoSync(intervalMs: number = 30000): void {
    this.stopAutoSync();
    console.log(`Starting auto-sync every ${intervalMs}ms`);

    // Run initial sync
    this.sync();

    // Set up interval
    this.syncIntervalId = window.setInterval(() => {
      this.sync();
    }, intervalMs);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncIntervalId !== undefined) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
      console.log("Auto-sync stopped");
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncProgress {
    return this.currentProgress;
  }
}
