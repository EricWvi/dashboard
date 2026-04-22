import { v4 as uuidv4 } from "uuid";
import Dexie, { type EntityTable } from "dexie";
import {
  SchemaVersion,
  WatchStatus,
  type Blog,
  type BlogField,
  type Bookmark,
  type BookmarkField,
  type Collection,
  type CollectionField,
  type DashboardData,
  type Echo,
  type EchoField,
  type EchoType,
  type QuickNote,
  type QuickNoteField,
  type Todo,
  type TodoField,
  type Watch,
  type WatchField,
} from "./model";
import {
  SyncStatus,
  type SyncMeta,
  type Tag,
  type TagField,
  type TiptapV2,
  type TiptapV2Field,
  type User,
  type UserField,
} from "@/lib/model";
import type { IDashboardDatabase } from "./db-interface";
import { todayStart, tomorrowStart, ZERO_UUID } from "@/lib/utils";

const USER_KEY = "current_user";
const NO_PLAN_TS = 5000000000000;

// Database interface for type safety
export interface DashboardDB {
  user: EntityTable<User, "key">;
  tags: EntityTable<Tag, "id">;
  blogs: EntityTable<Blog, "id">;
  bookmarks: EntityTable<Bookmark, "id">;
  collections: EntityTable<Collection, "id">;
  echoes: EntityTable<Echo, "id">;
  quickNotes: EntityTable<QuickNote, "id">;
  todos: EntityTable<Todo, "id">;
  watches: EntityTable<Watch, "id">;
  tiptaps: EntityTable<TiptapV2, "id">;
  syncMeta: EntityTable<SyncMeta, "key">;
}

function createBaseMeta() {
  const now = Date.now();
  return {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    syncStatus: SyncStatus.Pending,
  };
}

// Dexie implementation
export class DexieDashboardDatabase implements IDashboardDatabase {
  private db: Dexie & DashboardDB;

  constructor() {
    this.db = new Dexie("DashboardDB") as Dexie & DashboardDB;
    this.initSchema();
  }

  private initSchema() {
    // TODO 不同 model 的查询利用索引
    this.db.version(SchemaVersion).stores({
      user: "key",
      tags: "id, syncStatus, updatedAt",
      blogs: "id, syncStatus, updatedAt, createdAt",
      bookmarks: "id, syncStatus, updatedAt, createdAt",
      collections: "id, syncStatus, updatedAt, createdAt",
      echoes: "id, syncStatus, updatedAt, [type+sub], [type+year]",
      quickNotes: "id, syncStatus, updatedAt",
      todos: "id, syncStatus, updatedAt, collectionId, schedule",
      watches: "id, syncStatus, updatedAt, [status+createdAt]",
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

  async updateUser(updates: Partial<UserField>): Promise<void> {
    await this.db.user.update(USER_KEY, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  // Tags
  async getTag(id: string): Promise<Tag | undefined> {
    return this.db.tags.get(id);
  }

  async getAllTags(): Promise<Tag[]> {
    return this.db.tags.filter((tag) => !tag.isDeleted).toArray();
  }

  async addTag(tag: TagField): Promise<string> {
    const meta = createBaseMeta();
    await this.db.tags.add({ ...tag, ...meta });
    return meta.id;
  }

  async putTag(tag: Tag): Promise<void> {
    await this.db.tags.put(tag);
  }

  async putTags(tags: Tag[]): Promise<void> {
    await this.db.tags.bulkPut(tags);
  }

  async updateTag(id: string, updates: Partial<TagField>): Promise<void> {
    await this.db.tags.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteTag(id: string): Promise<void> {
    await this.db.tags.delete(id);
  }

  async softDeleteTag(id: string): Promise<void> {
    await this.db.tags.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markTagSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.tags
      .where("id")
      .equals(id)
      .and((tag) => tag.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  // Blogs
  async getBlog(id: string): Promise<Blog | undefined> {
    return this.db.blogs.get(id);
  }

  async getBlogs(): Promise<Blog[]> {
    return this.db.blogs.filter((blog) => !blog.isDeleted).toArray();
  }

  async addBlog(blog: BlogField): Promise<string> {
    const meta = createBaseMeta();
    await this.db.blogs.add({ ...blog, ...meta });
    return meta.id;
  }

  async putBlog(blog: Blog): Promise<void> {
    await this.db.blogs.put(blog);
  }

  async putBlogs(blogs: Blog[]): Promise<void> {
    await this.db.blogs.bulkPut(blogs);
  }

  async updateBlog(id: string, updates: Partial<BlogField>): Promise<void> {
    await this.db.blogs.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteBlog(id: string): Promise<void> {
    await this.db.blogs.delete(id);
  }

  async softDeleteBlog(id: string): Promise<void> {
    await this.db.blogs.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markBlogSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.blogs
      .where("id")
      .equals(id)
      .and((blog) => blog.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  // Bookmarks
  async getBookmark(id: string): Promise<Bookmark | undefined> {
    return this.db.bookmarks.get(id);
  }

  async getBookmarks(): Promise<Bookmark[]> {
    return this.db.bookmarks
      .filter((bookmark) => !bookmark.isDeleted)
      .toArray();
  }

  async addBookmark(bookmark: BookmarkField): Promise<string> {
    const meta = createBaseMeta();
    await this.db.bookmarks.add({ ...bookmark, ...meta });
    return meta.id;
  }

  async putBookmark(bookmark: Bookmark): Promise<void> {
    await this.db.bookmarks.put(bookmark);
  }

  async putBookmarks(bookmarks: Bookmark[]): Promise<void> {
    await this.db.bookmarks.bulkPut(bookmarks);
  }

  async updateBookmark(
    id: string,
    updates: Partial<BookmarkField>,
  ): Promise<void> {
    await this.db.bookmarks.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.db.bookmarks.delete(id);
  }

  async softDeleteBookmark(id: string): Promise<void> {
    await this.db.bookmarks.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markBookmarkSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.bookmarks
      .where("id")
      .equals(id)
      .and((bookmark) => bookmark.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  // Collections
  async getCollection(id: string): Promise<Collection | undefined> {
    return this.db.collections.get(id);
  }

  async getCollections(): Promise<Collection[]> {
    return this.db.collections
      .filter((collection) => !collection.isDeleted)
      .toArray();
  }

  async addCollection(collection: CollectionField): Promise<string> {
    const meta = createBaseMeta();
    await this.db.collections.add({ ...collection, ...meta });
    return meta.id;
  }

  async putCollection(collection: Collection): Promise<void> {
    await this.db.collections.put(collection);
  }

  async putCollections(collections: Collection[]): Promise<void> {
    await this.db.collections.bulkPut(collections);
  }

  async updateCollection(
    id: string,
    updates: Partial<CollectionField>,
  ): Promise<void> {
    await this.db.collections.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteCollection(id: string): Promise<void> {
    await this.db.collections.delete(id);
  }

  async softDeleteCollection(id: string): Promise<void> {
    await this.db.collections.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markCollectionSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.collections
      .where("id")
      .equals(id)
      .and((collection) => collection.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  // Echoes
  async getEcho(id: string): Promise<Echo | undefined> {
    return this.db.echoes.get(id);
  }

  async getEchoesOfYear(type: EchoType, year: number): Promise<Echo[]> {
    return this.db.echoes
      .where("[type+year]")
      .equals([type, year])
      .filter((echo) => !echo.isDeleted)
      .toArray();
  }

  async getEchoesOfQuestion(type: EchoType, sub: number): Promise<Echo[]> {
    return this.db.echoes
      .where("[type+sub]")
      .equals([type, sub])
      .filter((echo) => !echo.isDeleted)
      .toArray();
  }

  async getYearsOfEchoType(type: EchoType): Promise<number[]> {
    const keys = await this.db.echoes
      .where("[type+year]")
      .between([type, Dexie.minKey], [type, Dexie.maxKey])
      .uniqueKeys();

    return keys.map((key) => (key as unknown as [EchoType, number])[1]);
  }

  async addEcho(echo: EchoField): Promise<string> {
    const meta = createBaseMeta();
    await this.db.echoes.add({ ...echo, ...meta });
    return meta.id;
  }

  async putEcho(echo: Echo): Promise<void> {
    await this.db.echoes.put(echo);
  }

  async putEchoes(echoes: Echo[]): Promise<void> {
    await this.db.echoes.bulkPut(echoes);
  }

  async updateEcho(id: string, updates: Partial<EchoField>): Promise<void> {
    await this.db.echoes.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteEcho(id: string): Promise<void> {
    await this.db.echoes.delete(id);
  }

  async softDeleteEcho(id: string): Promise<void> {
    await this.db.echoes.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markEchoSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.echoes
      .where("id")
      .equals(id)
      .and((echo) => echo.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  // Quick Notes
  async getQuickNote(id: string): Promise<QuickNote | undefined> {
    return this.db.quickNotes.get(id);
  }

  async getQuickNotes(): Promise<QuickNote[]> {
    return this.db.quickNotes
      .filter((quickNote) => !quickNote.isDeleted)
      .toArray();
  }

  async addQuickNote(quickNote: QuickNoteField): Promise<string> {
    const meta = createBaseMeta();
    await this.db.quickNotes.add({ ...quickNote, ...meta });
    return meta.id;
  }

  async putQuickNote(quickNote: QuickNote): Promise<void> {
    await this.db.quickNotes.put(quickNote);
  }

  async putQuickNotes(quickNotes: QuickNote[]): Promise<void> {
    await this.db.quickNotes.bulkPut(quickNotes);
  }

  async updateQuickNote(
    id: string,
    updates: Partial<QuickNoteField>,
  ): Promise<void> {
    await this.db.quickNotes.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteQuickNote(id: string): Promise<void> {
    await this.db.quickNotes.delete(id);
  }

  async softDeleteQuickNote(id: string): Promise<void> {
    await this.db.quickNotes.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markQuickNoteSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.quickNotes
      .where("id")
      .equals(id)
      .and((quickNote) => quickNote.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  // Todos
  async getTodo(id: string): Promise<Todo | undefined> {
    return this.db.todos.get(id);
  }

  async getTodos(collectionId: string): Promise<Todo[]> {
    return this.db.todos
      .where("collectionId")
      .equals(collectionId)
      .filter((todo) => !todo.isDeleted && !todo.completed)
      .toArray();
  }

  async getCompletedTodos(collectionId: string): Promise<Todo[]> {
    return this.db.todos
      .where("collectionId")
      .equals(collectionId)
      .filter((todo) => todo.completed && !todo.isDeleted)
      .toArray();
  }

  async getTodayTodos(): Promise<Todo[]> {
    return this.db.todos
      .where("schedule")
      .between(todayStart(), tomorrowStart())
      .filter((todo) => !todo.isDeleted && !todo.completed)
      .toArray();
  }

  async listAllTodos(): Promise<Todo[]> {
    return this.db.todos
      .filter(
        (todo) =>
          !todo.isDeleted &&
          !todo.completed &&
          todo.collectionId !== ZERO_UUID &&
          (todo.schedule === null || todo.schedule !== NO_PLAN_TS),
      )
      .toArray();
  }

  async addTodo(todo: TodoField): Promise<string> {
    const meta = createBaseMeta();
    await this.db.todos.add({ ...todo, ...meta });
    return meta.id;
  }

  async putTodo(todo: Todo): Promise<void> {
    await this.db.todos.put(todo);
  }

  async putTodos(todos: Todo[]): Promise<void> {
    await this.db.todos.bulkPut(todos);
  }

  async updateTodo(id: string, updates: Partial<TodoField>): Promise<void> {
    await this.db.todos.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteTodo(id: string): Promise<void> {
    await this.db.todos.delete(id);
  }

  async softDeleteTodo(id: string): Promise<void> {
    await this.db.todos.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markTodoSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.todos
      .where("id")
      .equals(id)
      .and((todo) => todo.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  // Watches
  async getWatch(id: string): Promise<Watch | undefined> {
    return this.db.watches.get(id);
  }

  async getWatches(status: WatchStatus): Promise<Watch[]> {
    return this.db.watches
      .where("[status+createdAt]")
      .between([status, Dexie.minKey], [status, Dexie.maxKey])
      .reverse()
      .filter((watch) => !watch.isDeleted)
      .toArray();
  }

  async addWatch(watch: WatchField): Promise<string> {
    const meta = createBaseMeta();
    await this.db.watches.add({ ...watch, ...meta });
    return meta.id;
  }

  async addWatched(watch: WatchField, createdAt: number): Promise<string> {
    const meta = createBaseMeta();
    meta.createdAt = createdAt;
    await this.db.watches.add({ ...watch, ...meta });
    return meta.id;
  }

  async putWatch(watch: Watch): Promise<void> {
    await this.db.watches.put(watch);
  }

  async putWatches(watches: Watch[]): Promise<void> {
    await this.db.watches.bulkPut(watches);
  }

  async updateWatch(id: string, updates: Partial<Watch>): Promise<void> {
    await this.db.watches.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async deleteWatch(id: string): Promise<void> {
    await this.db.watches.delete(id);
  }

  async softDeleteWatch(id: string): Promise<void> {
    await this.db.watches.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: SyncStatus.Pending,
    });
  }

  async markWatchSynced(id: string, updatedAt: number): Promise<void> {
    await this.db.watches
      .where("id")
      .equals(id)
      .and((watch) => watch.updatedAt === updatedAt)
      .modify({ syncStatus: SyncStatus.Synced });
  }

  // Tiptaps
  async getTiptap(id: string): Promise<TiptapV2 | undefined> {
    return this.db.tiptaps.get(id);
  }

  async addTiptap(tiptap: TiptapV2Field): Promise<string> {
    const meta = createBaseMeta();
    await this.db.tiptaps.add({ ...tiptap, ...meta });
    return meta.id;
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
  async getPendingChanges(): Promise<DashboardData> {
    const [
      users,
      tags,
      blogs,
      bookmarks,
      collections,
      echoes,
      quickNotes,
      todos,
      watches,
      tiptaps,
    ] = await Promise.all([
      this.db.user.get(USER_KEY).then((u) => (u ? [u] : [])),
      this.db.tags.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.blogs.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.bookmarks
        .where("syncStatus")
        .equals(SyncStatus.Pending)
        .toArray(),
      this.db.collections
        .where("syncStatus")
        .equals(SyncStatus.Pending)
        .toArray(),
      this.db.echoes.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.quickNotes
        .where("syncStatus")
        .equals(SyncStatus.Pending)
        .toArray(),
      this.db.todos.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.watches.where("syncStatus").equals(SyncStatus.Pending).toArray(),
      this.db.tiptaps.where("syncStatus").equals(SyncStatus.Pending).toArray(),
    ]);

    return {
      users,
      tags,
      blogs,
      bookmarks,
      collections,
      echoes,
      quickNotes,
      todos,
      watches,
      tiptaps,
    };
  }

  async getLocalDataForSync(): Promise<DashboardData> {
    const [
      users,
      tags,
      blogs,
      bookmarks,
      collections,
      echoes,
      quickNotes,
      todos,
      watches,
      tiptaps,
    ] = await Promise.all([
      this.db.user.toArray(),
      this.db.tags.toArray(),
      this.db.blogs.toArray(),
      this.db.bookmarks.toArray(),
      this.db.collections.toArray(),
      this.db.echoes.toArray(),
      this.db.quickNotes.toArray(),
      this.db.todos.toArray(),
      this.db.watches.toArray(),
      this.db.tiptaps.toArray(),
    ]);

    return {
      users,
      tags,
      blogs,
      bookmarks,
      collections,
      echoes,
      quickNotes,
      todos,
      watches,
      tiptaps,
    };
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
        this.db.tags,
        this.db.blogs,
        this.db.bookmarks,
        this.db.collections,
        this.db.echoes,
        this.db.quickNotes,
        this.db.todos,
        this.db.watches,
        this.db.tiptaps,
        this.db.syncMeta,
      ],
      async () => {
        await Promise.all([
          this.db.user.clear(),
          this.db.tags.clear(),
          this.db.blogs.clear(),
          this.db.bookmarks.clear(),
          this.db.collections.clear(),
          this.db.echoes.clear(),
          this.db.quickNotes.clear(),
          this.db.todos.clear(),
          this.db.watches.clear(),
          this.db.tiptaps.clear(),
          this.db.syncMeta.clear(),
        ]);
      },
    );
  }
}
