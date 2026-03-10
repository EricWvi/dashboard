import {
  SchemaVersion,
  type Blog,
  type Bookmark,
  type Collection,
  type Echo,
  type QuickNote,
  type Tag,
  type Todo,
  type Watch,
} from "./model";
import { type TiptapV2, SyncStatus, type User } from "@/lib/model";
import { getRequest, postRequest } from "@/lib/queryClient";
import { dashboardDatabase, type IDashboardDatabase } from "./db-interface";
import { syncEvents } from "@/lib/sync-events";

// API response types
interface DashboardSyncResponse {
  serverVersion: number;
  users: Omit<User, "key" | "syncStatus">[];
  tags: Omit<Tag, "syncStatus">[];
  blogs: Omit<Blog, "syncStatus">[];
  bookmarks: Omit<Bookmark, "syncStatus">[];
  collections: Omit<Collection, "syncStatus">[];
  echoes: Omit<Echo, "syncStatus">[];
  quickNotes: Omit<QuickNote, "syncStatus">[];
  todos: Omit<Todo, "syncStatus">[];
  watches: Omit<Watch, "syncStatus">[];
  tiptaps: Omit<TiptapV2, "syncStatus">[];
}

/**
 * SyncManager handles bidirectional synchronization between local database and server
 */
export class SyncManager {
  private db: IDashboardDatabase;
  private isSyncing = false;
  private intervalMs: number = 3000;
  private syncTimeout: NodeJS.Timeout | undefined = undefined;

  constructor(db: IDashboardDatabase) {
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
      const response = await getRequest("/api/dashboard?Action=FullSync");
      const data = await response.json();
      const serverData = data.message as DashboardSyncResponse;

      // Clear existing data
      await this.db.clearAllData();

      const tags: Tag[] = serverData.tags.map((tag) => ({
        ...tag,
        syncStatus: SyncStatus.Synced,
      }));
      const blogs: Blog[] = serverData.blogs.map((blog) => ({
        ...blog,
        syncStatus: SyncStatus.Synced,
      }));
      const bookmarks: Bookmark[] = serverData.bookmarks.map((bookmark) => ({
        ...bookmark,
        syncStatus: SyncStatus.Synced,
      }));
      const collections: Collection[] = serverData.collections.map(
        (collection) => ({
          ...collection,
          syncStatus: SyncStatus.Synced,
        }),
      );
      const echoes: Echo[] = serverData.echoes.map((echo) => ({
        ...echo,
        syncStatus: SyncStatus.Synced,
      }));
      const quickNotes: QuickNote[] = serverData.quickNotes.map(
        (quickNote) => ({
          ...quickNote,
          syncStatus: SyncStatus.Synced,
        }),
      );
      const todos: Todo[] = serverData.todos.map((todo) => ({
        ...todo,
        syncStatus: SyncStatus.Synced,
      }));
      const watches: Watch[] = serverData.watches.map((watch) => ({
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
        `Full sync complete: ${serverData.users?.length || 0} user, ${tags.length} tags, ${blogs.length} blogs, ${bookmarks.length} bookmarks, ${collections.length} collections, ${echoes.length} echoes, ${quickNotes.length} quickNotes, ${todos.length} todos, ${watches.length} watches, ${tiptaps.length} tiptaps`,
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
        allData.tags.length === 0 &&
        allData.blogs.length === 0 &&
        allData.bookmarks.length === 0 &&
        allData.collections.length === 0 &&
        allData.echoes.length === 0 &&
        allData.quickNotes.length === 0 &&
        allData.todos.length === 0 &&
        allData.watches.length === 0 &&
        allData.tiptaps.length === 0
      ) {
        return;
      }

      // Send to server
      const response = await postRequest(
        "/api/dashboard?Action=Push",
        allData,
      );

      if (response.ok) {
        console.log(
          `Manually pushed ${allData.tags.length} tags, ${allData.blogs.length} blogs, ${allData.bookmarks.length} bookmarks, ${allData.collections.length} collections, ${allData.echoes.length} echoes, ${allData.quickNotes.length} quickNotes, ${allData.todos.length} todos, ${allData.watches.length} watches, ${allData.tiptaps.length} tiptaps`,
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
        pending.tags.length === 0 &&
        pending.blogs.length === 0 &&
        pending.bookmarks.length === 0 &&
        pending.collections.length === 0 &&
        pending.echoes.length === 0 &&
        pending.quickNotes.length === 0 &&
        pending.todos.length === 0 &&
        pending.watches.length === 0 &&
        pending.tiptaps.length === 0
      ) {
        return;
      }

      // Send to server
      const response = await postRequest(
        "/api/dashboard?Action=Push",
        pending,
      );

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
          updates.push(
            this.db.markBookmarkSynced(bookmark.id, bookmark.updatedAt),
          );
        }

        for (const collection of pending.collections) {
          updates.push(
            this.db.markCollectionSynced(
              collection.id,
              collection.updatedAt,
            ),
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

        console.log(
          `Pushed ${pending.tags.length} tags, ${pending.blogs.length} blogs, ${pending.bookmarks.length} bookmarks, ${pending.collections.length} collections, ${pending.echoes.length} echoes, ${pending.quickNotes.length} quickNotes, ${pending.todos.length} todos, ${pending.watches.length} watches, ${pending.tiptaps.length} tiptaps`,
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
        `/api/dashboard?Action=Pull&since=${lastVersion}`,
      );
      const data = await response.json();
      const serverData = data.message as DashboardSyncResponse;

      if (
        serverData.users.length === 0 &&
        serverData.tags.length === 0 &&
        serverData.blogs.length === 0 &&
        serverData.bookmarks.length === 0 &&
        serverData.collections.length === 0 &&
        serverData.echoes.length === 0 &&
        serverData.quickNotes.length === 0 &&
        serverData.todos.length === 0 &&
        serverData.watches.length === 0 &&
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
        if (!localUser || remoteUser.updatedAt > localUser.updatedAt) {
          updates.push(
            this.db.putUser({ ...remoteUser, syncStatus: SyncStatus.Synced }),
          );
          userApplied++;
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
            this.db.putTag({
              ...remoteTag,
              syncStatus: SyncStatus.Synced,
            }),
          );
          tagApplied++;
        }
      }

      let blogApplied = 0;
      for (const remoteBlog of serverData.blogs) {
        if (remoteBlog.isDeleted) {
          updates.push(this.db.deleteBlog(remoteBlog.id));
          continue;
        }
        const localBlog = await this.db.getBlog(remoteBlog.id);
        if (!localBlog || remoteBlog.updatedAt > localBlog.updatedAt) {
          updates.push(
            this.db.putBlog({
              ...remoteBlog,
              syncStatus: SyncStatus.Synced,
            }),
          );
          blogApplied++;
        }
      }

      let bookmarkApplied = 0;
      for (const remoteBookmark of serverData.bookmarks) {
        if (remoteBookmark.isDeleted) {
          updates.push(this.db.deleteBookmark(remoteBookmark.id));
          continue;
        }
        const localBookmark = await this.db.getBookmark(remoteBookmark.id);
        if (
          !localBookmark ||
          remoteBookmark.updatedAt > localBookmark.updatedAt
        ) {
          updates.push(
            this.db.putBookmark({
              ...remoteBookmark,
              syncStatus: SyncStatus.Synced,
            }),
          );
          bookmarkApplied++;
        }
      }

      let collectionApplied = 0;
      for (const remoteCollection of serverData.collections) {
        if (remoteCollection.isDeleted) {
          updates.push(this.db.deleteCollection(remoteCollection.id));
          continue;
        }
        const localCollection = await this.db.getCollection(
          remoteCollection.id,
        );
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
          collectionApplied++;
        }
      }

      let echoApplied = 0;
      for (const remoteEcho of serverData.echoes) {
        if (remoteEcho.isDeleted) {
          updates.push(this.db.deleteEcho(remoteEcho.id));
          continue;
        }
        const localEcho = await this.db.getEcho(remoteEcho.id);
        if (!localEcho || remoteEcho.updatedAt > localEcho.updatedAt) {
          updates.push(
            this.db.putEcho({
              ...remoteEcho,
              syncStatus: SyncStatus.Synced,
            }),
          );
          echoApplied++;
        }
      }

      let quickNoteApplied = 0;
      for (const remoteQuickNote of serverData.quickNotes) {
        if (remoteQuickNote.isDeleted) {
          updates.push(this.db.deleteQuickNote(remoteQuickNote.id));
          continue;
        }
        const localQuickNote = await this.db.getQuickNote(remoteQuickNote.id);
        if (
          !localQuickNote ||
          remoteQuickNote.updatedAt > localQuickNote.updatedAt
        ) {
          updates.push(
            this.db.putQuickNote({
              ...remoteQuickNote,
              syncStatus: SyncStatus.Synced,
            }),
          );
          quickNoteApplied++;
        }
      }

      let todoApplied = 0;
      for (const remoteTodo of serverData.todos) {
        if (remoteTodo.isDeleted) {
          updates.push(this.db.deleteTodo(remoteTodo.id));
          continue;
        }
        const localTodo = await this.db.getTodo(remoteTodo.id);
        if (!localTodo || remoteTodo.updatedAt > localTodo.updatedAt) {
          updates.push(
            this.db.putTodo({
              ...remoteTodo,
              syncStatus: SyncStatus.Synced,
            }),
          );
          todoApplied++;
        }
      }

      let watchApplied = 0;
      for (const remoteWatch of serverData.watches) {
        if (remoteWatch.isDeleted) {
          updates.push(this.db.deleteWatch(remoteWatch.id));
          continue;
        }
        const localWatch = await this.db.getWatch(remoteWatch.id);
        if (!localWatch || remoteWatch.updatedAt > localWatch.updatedAt) {
          updates.push(
            this.db.putWatch({
              ...remoteWatch,
              syncStatus: SyncStatus.Synced,
            }),
          );
          watchApplied++;
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
        tagApplied > 0 ||
        blogApplied > 0 ||
        bookmarkApplied > 0 ||
        collectionApplied > 0 ||
        echoApplied > 0 ||
        quickNoteApplied > 0 ||
        todoApplied > 0 ||
        watchApplied > 0 ||
        tiptapApplied > 0
      ) {
        console.log(
          `Pulled ${userApplied} user, ${tagApplied} tags, ${blogApplied} blogs, ${bookmarkApplied} bookmarks, ${collectionApplied} collections, ${echoApplied} echoes, ${quickNoteApplied} quickNotes, ${todoApplied} todos, ${watchApplied} watches, ${tiptapApplied} tiptaps`,
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
    syncManager = new SyncManager(dashboardDatabase);
  }
  return syncManager;
}
