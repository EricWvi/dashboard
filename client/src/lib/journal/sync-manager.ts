import { SchemaVersion, type Entry } from "./model";
import { type Tag, type TiptapV2, SyncStatus } from "@/lib/model";
import { journalDatabase, type IJournalDatabase } from "./db-interface";
import { syncClient, type ISyncClient } from "./sync-client";
import { syncEvents } from "@/lib/sync-events";

/**
 * SyncManager handles bidirectional synchronization between local database and server
 */
export class SyncManager {
  private static readonly MAX_WAIT_MS = 30 * 1000;
  private db: IJournalDatabase;
  private client: ISyncClient;
  private isSyncing = false;
  private intervalMs: number = 3000;
  private waitMs: number;
  private nextPull: number;
  private syncTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

  constructor(db: IJournalDatabase, client: ISyncClient) {
    this.db = db;
    this.client = client;
    this.waitMs = this.intervalMs;
    this.nextPull = Date.now() + this.intervalMs;
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

      const entries: Entry[] = serverData.entries.map((entry) => ({
        ...entry,
        syncStatus: SyncStatus.Synced,
      }));
      const tags: Tag[] = serverData.tags.map((tag) => ({
        ...tag,
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
        this.db.putEntries(entries),
        this.db.putTags(tags),
        this.db.putTiptaps(tiptaps),
        this.db.putStatistics(serverData.statistics),
      ]);

      await this.db.setSyncMeta("schemaVersion", SchemaVersion);
      await this.db.setSyncMeta("lastServerVersion", serverData.serverVersion);

      console.log(
        `Full sync complete: ${serverData.users?.length || 0} user, ${entries.length} entries, ${tags.length} tags, ${tiptaps.length} tiptaps`,
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
        allData.entries.length === 0 &&
        allData.tags.length === 0 &&
        allData.tiptaps.length === 0
      ) {
        return;
      }

      // Send to server
      const response = await this.client.Push(allData);

      if (response.ok) {
        console.log(
          `Manually pushed ${allData.entries.length} entries, ${allData.tags.length} tags, ${allData.tiptaps.length} tiptaps`,
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
        pending.entries.length === 0 &&
        pending.tags.length === 0 &&
        pending.tiptaps.length === 0
      ) {
        return;
      }

      this.nextPull = 0;
      this.waitMs = this.intervalMs;

      // Send to server
      const response = await this.client.Push(pending);

      if (response.ok) {
        // Mark as synced locally
        const updates: Array<Promise<void>> = [];

        for (const entry of pending.entries) {
          updates.push(this.db.markEntrySynced(entry.id, entry.updatedAt));
        }

        for (const tag of pending.tags) {
          updates.push(this.db.markTagSynced(tag.id, tag.updatedAt));
        }

        for (const tiptap of pending.tiptaps) {
          updates.push(this.db.markTiptapSynced(tiptap.id, tiptap.updatedAt));
        }

        await Promise.all(updates);

        console.log(
          `Pushed ${pending.entries.length} entries, ${pending.tags.length} tags, ${pending.tiptaps.length} tiptaps`,
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
      if (Date.now() < this.nextPull) return;

      const lastVersion = await this.db.getLastServerVersion();

      // Fetch changes since last version
      const serverData = await this.client.Pull(lastVersion);

      if (
        serverData.users.length === 0 &&
        serverData.entries.length === 0 &&
        serverData.tags.length === 0 &&
        serverData.tiptaps.length === 0 &&
        serverData.statistics.length === 0
      ) {
        this.waitMs = Math.min(this.waitMs * 2, SyncManager.MAX_WAIT_MS);
        this.nextPull = Date.now() + this.waitMs;
        return;
      }

      this.waitMs = this.intervalMs;

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

      let entryApplied = 0;
      for (const remoteEntry of serverData.entries) {
        if (remoteEntry.isDeleted) {
          // If server says it's deleted, delete locally
          updates.push(this.db.deleteEntry(remoteEntry.id));
          continue;
        }

        const localEntry = await this.db.getEntry(remoteEntry.id);
        // Only update if remote is newer or local doesn't exist
        if (!localEntry || remoteEntry.updatedAt > localEntry.updatedAt) {
          updates.push(
            this.db.putEntry({
              ...remoteEntry,
              syncStatus: SyncStatus.Synced,
            }),
          );
          entryApplied++;
        }
      }

      let tagApplied = 0;
      for (const remoteTag of serverData.tags) {
        if (remoteTag.isDeleted) {
          updates.push(this.db.deleteTag(remoteTag.id));
          continue;
        }
        const localTag = await this.db.getTag(remoteTag.id);
        if (!localTag || remoteTag.updatedAt > localTag.updatedAt) {
          updates.push(
            this.db.putTag({ ...remoteTag, syncStatus: SyncStatus.Synced }),
          );
          tagApplied++;
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

      updates.push(this.db.putStatistics(serverData.statistics));

      await Promise.all(updates);

      // Emit events for updated tiptaps
      if (updatedTiptapIds.length > 0) {
        syncEvents.emitMany(updatedTiptapIds);
      }

      // Update last server version
      await this.db.setSyncMeta("lastServerVersion", serverData.serverVersion);

      if (
        userApplied > 0 ||
        entryApplied > 0 ||
        tagApplied > 0 ||
        tiptapApplied > 0
      ) {
        console.log(
          `Pulled ${userApplied} user, ${entryApplied} entries, ${tagApplied} tags, ${tiptapApplied} tiptaps`,
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
      this.waitMs = Math.min(this.waitMs * 2, SyncManager.MAX_WAIT_MS);
      this.nextPull = Date.now() + this.waitMs;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Start automatic sync at specified interval
   */
  startAutoSync(): void {
    this.stopAutoSync();
    this.waitMs = this.intervalMs;
    this.nextPull = Date.now() + this.intervalMs;
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
    syncManager = new SyncManager(journalDatabase, syncClient);
  }
  return syncManager;
}
