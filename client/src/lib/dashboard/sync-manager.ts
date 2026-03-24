import { SchemaVersion, type DashboardData } from "./model";
import { type Tag, type TiptapV2, SyncStatus } from "@/lib/model";
import { dashboardDatabase, type IDashboardDatabase } from "./db-interface";
import { syncClient, type ISyncClient } from "./sync-client";

/**
 * SyncManager handles bidirectional synchronization between local database and server
 */
export class SyncManager {
  private db: IDashboardDatabase;
  private client: ISyncClient;
  private isSyncing = false;
  private intervalMs: number;
  private syncTimeout: NodeJS.Timeout | undefined = undefined;

  constructor(
    db: IDashboardDatabase,
    client: ISyncClient,
    options?: { intervalMs?: number },
  ) {
    this.db = db;
    this.client = client;
    this.intervalMs = options?.intervalMs ?? 3000;
  }

  async needFullSync(): Promise<boolean> {
    const lastServerVersion = await this.db.getLastServerVersion();
    if (lastServerVersion === 0) {
      return true;
    }
    const schemaVersion = await this.db.getSyncMeta("schemaVersion");
    return !schemaVersion || Number(schemaVersion.value) !== SchemaVersion;
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

    try {
      console.log("Starting full sync...");

      // Fetch all data from server
      const serverData = await this.client.FullSync();

      // Clear existing data
      await this.db.clearAllData();

      const tags: Tag[] = serverData.tags.map((tag) => ({
        ...tag,
        syncStatus: SyncStatus.Synced,
      }));
      const blogs = serverData.blogs.map((blog) => ({
        ...blog,
        syncStatus: SyncStatus.Synced,
      }));
      const bookmarks = serverData.bookmarks.map((bookmark) => ({
        ...bookmark,
        syncStatus: SyncStatus.Synced,
      }));
      const collections = serverData.collections.map((collection) => ({
        ...collection,
        syncStatus: SyncStatus.Synced,
      }));
      const echoes = serverData.echoes.map((echo) => ({
        ...echo,
        syncStatus: SyncStatus.Synced,
      }));
      const quickNotes = serverData.quickNotes.map((quickNote) => ({
        ...quickNote,
        syncStatus: SyncStatus.Synced,
      }));
      const todos = serverData.todos.map((todo) => ({
        ...todo,
        syncStatus: SyncStatus.Synced,
      }));
      const watches = serverData.watches.map((watch) => ({
        ...watch,
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
        this.db.putTags(tags),
        this.db.putBlogs(blogs),
        this.db.putBookmarks(bookmarks),
        this.db.putCollections(collections),
        this.db.putEchoes(echoes),
        this.db.putQuickNotes(quickNotes),
        this.db.putTodos(todos),
        this.db.putWatches(watches),
        this.db.putTiptaps(tiptaps),
      ]);

      await this.db.setSyncMeta("schemaVersion", SchemaVersion);
      await this.db.setSyncMeta("lastServerVersion", serverData.serverVersion);

      console.log(
        `Full sync complete: ${serverData.users?.length || 0} user, ${tags.length} tags, ${blogs.length} blogs, ${bookmarks.length} bookmarks, ${collections.length} collections, ${echoes.length} echoes, ${quickNotes.length} quick notes, ${todos.length} todos, ${watches.length} watches, ${tiptaps.length} tiptaps`,
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

      if (this.isEmptyData(allData)) {
        return;
      }

      // Send to server
      const response = await this.client.Push(allData);

      if (response.ok) {
        console.log(`Manually pushed dashboard data`);
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

      if (this.isEmptyData(pending)) {
        return;
      }

      // Send to server
      const response = await this.client.Push(pending);

      if (response.ok) {
        // Mark as synced locally
        const updates: Array<Promise<void>> = [];

        for (const tag of pending.tags) {
          updates.push(this.db.markTagSynced(tag.id, tag.updatedAt));
        }
        for (const blog of pending.blogs) {
          updates.push(this.db.markBlogSynced(blog.id, blog.updatedAt));
        }
        for (const bookmark of pending.bookmarks) {
          updates.push(this.db.markBookmarkSynced(bookmark.id, bookmark.updatedAt));
        }
        for (const collection of pending.collections) {
          updates.push(
            this.db.markCollectionSynced(collection.id, collection.updatedAt),
          );
        }
        for (const echo of pending.echoes) {
          updates.push(this.db.markEchoSynced(echo.id, echo.updatedAt));
        }
        for (const quickNote of pending.quickNotes) {
          updates.push(
            this.db.markQuickNoteSynced(quickNote.id, quickNote.updatedAt),
          );
        }
        for (const todo of pending.todos) {
          updates.push(this.db.markTodoSynced(todo.id, todo.updatedAt));
        }
        for (const watch of pending.watches) {
          updates.push(this.db.markWatchSynced(watch.id, watch.updatedAt));
        }
        for (const tiptap of pending.tiptaps) {
          updates.push(this.db.markTiptapSynced(tiptap.id, tiptap.updatedAt));
        }

        await Promise.all(updates);

        console.log(`Pushed dashboard changes`);
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

      if (serverData.users.length === 0 && this.isEmptyRemoteData(serverData)) {
        return;
      }

      // Apply changes using Last-Write-Wins (LWW) strategy
      const updates: Array<Promise<void>> = [];

      if (serverData.users.length > 0) {
        const remoteUser = serverData.users[0];
        const localUser = await this.db.getUser();
        if (!localUser || remoteUser.updatedAt > localUser.updatedAt) {
          updates.push(
            this.db.putUser({ ...remoteUser, syncStatus: SyncStatus.Synced }),
          );
        }
      }

      for (const remoteTag of serverData.tags) {
        if (remoteTag.isDeleted) {
          updates.push(this.db.deleteTag(remoteTag.id));
          continue;
        }
        const localTag = await this.db.getTag(remoteTag.id);
        if (!localTag || remoteTag.updatedAt > localTag.updatedAt) {
          updates.push(this.db.putTag({ ...remoteTag, syncStatus: SyncStatus.Synced }));
        }
      }

      for (const remoteBlog of serverData.blogs) {
        if (remoteBlog.isDeleted) {
          updates.push(this.db.deleteBlog(remoteBlog.id));
          continue;
        }
        const localBlog = await this.db.getBlog(remoteBlog.id);
        if (!localBlog || remoteBlog.updatedAt > localBlog.updatedAt) {
          updates.push(
            this.db.putBlog({ ...remoteBlog, syncStatus: SyncStatus.Synced }),
          );
        }
      }

      for (const remoteBookmark of serverData.bookmarks) {
        if (remoteBookmark.isDeleted) {
          updates.push(this.db.deleteBookmark(remoteBookmark.id));
          continue;
        }
        const localBookmark = await this.db.getBookmark(remoteBookmark.id);
        if (!localBookmark || remoteBookmark.updatedAt > localBookmark.updatedAt) {
          updates.push(
            this.db.putBookmark({
              ...remoteBookmark,
              syncStatus: SyncStatus.Synced,
            }),
          );
        }
      }

      for (const remoteCollection of serverData.collections) {
        if (remoteCollection.isDeleted) {
          updates.push(this.db.deleteCollection(remoteCollection.id));
          continue;
        }
        const localCollection = await this.db.getCollection(remoteCollection.id);
        if (
          !localCollection ||
          remoteCollection.updatedAt > localCollection.updatedAt
        ) {
          updates.push(
            this.db.putCollection({
              ...remoteCollection,
              syncStatus: SyncStatus.Synced,
            }),
          );
        }
      }

      for (const remoteEcho of serverData.echoes) {
        if (remoteEcho.isDeleted) {
          updates.push(this.db.deleteEcho(remoteEcho.id));
          continue;
        }
        const localEcho = await this.db.getEcho(remoteEcho.id);
        if (!localEcho || remoteEcho.updatedAt > localEcho.updatedAt) {
          updates.push(this.db.putEcho({ ...remoteEcho, syncStatus: SyncStatus.Synced }));
        }
      }

      for (const remoteQuickNote of serverData.quickNotes) {
        if (remoteQuickNote.isDeleted) {
          updates.push(this.db.deleteQuickNote(remoteQuickNote.id));
          continue;
        }
        const localQuickNote = await this.db.getQuickNote(remoteQuickNote.id);
        if (!localQuickNote || remoteQuickNote.updatedAt > localQuickNote.updatedAt) {
          updates.push(
            this.db.putQuickNote({
              ...remoteQuickNote,
              syncStatus: SyncStatus.Synced,
            }),
          );
        }
      }

      for (const remoteTodo of serverData.todos) {
        if (remoteTodo.isDeleted) {
          updates.push(this.db.deleteTodo(remoteTodo.id));
          continue;
        }
        const localTodo = await this.db.getTodo(remoteTodo.id);
        if (!localTodo || remoteTodo.updatedAt > localTodo.updatedAt) {
          updates.push(this.db.putTodo({ ...remoteTodo, syncStatus: SyncStatus.Synced }));
        }
      }

      for (const remoteWatch of serverData.watches) {
        if (remoteWatch.isDeleted) {
          updates.push(this.db.deleteWatch(remoteWatch.id));
          continue;
        }
        const localWatch = await this.db.getWatch(remoteWatch.id);
        if (!localWatch || remoteWatch.updatedAt > localWatch.updatedAt) {
          updates.push(
            this.db.putWatch({ ...remoteWatch, syncStatus: SyncStatus.Synced }),
          );
        }
      }

      for (const remoteTiptap of serverData.tiptaps) {
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

  private isEmptyData(data: DashboardData): boolean {
    return (
      data.tags.length === 0 &&
      data.blogs.length === 0 &&
      data.bookmarks.length === 0 &&
      data.collections.length === 0 &&
      data.echoes.length === 0 &&
      data.quickNotes.length === 0 &&
      data.todos.length === 0 &&
      data.watches.length === 0 &&
      data.tiptaps.length === 0
    );
  }

  private isEmptyRemoteData(data: {
    tags: { length: number };
    blogs: { length: number };
    bookmarks: { length: number };
    collections: { length: number };
    echoes: { length: number };
    quickNotes: { length: number };
    todos: { length: number };
    watches: { length: number };
    tiptaps: { length: number };
  }): boolean {
    return (
      data.tags.length === 0 &&
      data.blogs.length === 0 &&
      data.bookmarks.length === 0 &&
      data.collections.length === 0 &&
      data.echoes.length === 0 &&
      data.quickNotes.length === 0 &&
      data.todos.length === 0 &&
      data.watches.length === 0 &&
      data.tiptaps.length === 0
    );
  }
}

// Create singleton sync manager
let syncManager: SyncManager | null = null;

export function getSyncManager() {
  if (!syncManager) {
    syncManager = new SyncManager(dashboardDatabase, syncClient);
  }
  return syncManager;
}
