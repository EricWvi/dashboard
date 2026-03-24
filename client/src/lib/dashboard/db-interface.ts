import { tiptapRefresh, triggerRefresh } from "@/hooks/dashboard/query-keys";
import { DexieDashboardDatabase } from "./dexie";
import { SqliteDashboardDatabase } from "./sqlite";
import {
  type Blog,
  type BlogField,
  type Bookmark,
  type BookmarkField,
  type Collection,
  type CollectionField,
  type DashboardData,
  type Echo,
  type EchoField,
  type QuickNote,
  type QuickNoteField,
  type Todo,
  type TodoField,
  type Watch,
  type WatchField,
} from "./model";
import {
  type SyncMeta,
  type Tag,
  type TagField,
  type TiptapV2,
  type TiptapV2Field,
  type User,
  type UserField,
} from "@/lib/model";
import { isTauri } from "@/lib/utils";

// Database abstraction interface
export interface IDashboardDatabase {
  // User
  getUser(): Promise<User | undefined>;
  putUser(user: Omit<User, "key">): Promise<void>;
  updateUser(updates: Partial<UserField>): Promise<void>;

  // Tags
  getTag(id: string): Promise<Tag | undefined>;
  getAllTags(): Promise<Tag[]>;
  addTag(tag: TagField): Promise<string>;
  putTag(tag: Tag): Promise<void>;
  putTags(tags: Tag[]): Promise<void>;
  updateTag(id: string, updates: Partial<TagField>): Promise<void>;
  deleteTag(id: string): Promise<void>;
  softDeleteTag(id: string): Promise<void>;
  markTagSynced(id: string, updatedAt: number): Promise<void>;

  // Blogs
  getBlog(id: string): Promise<Blog | undefined>;
  getBlogs(): Promise<Blog[]>;
  addBlog(blog: BlogField): Promise<string>;
  putBlog(blog: Blog): Promise<void>;
  putBlogs(blogs: Blog[]): Promise<void>;
  updateBlog(id: string, updates: Partial<BlogField>): Promise<void>;
  deleteBlog(id: string): Promise<void>;
  softDeleteBlog(id: string): Promise<void>;
  markBlogSynced(id: string, updatedAt: number): Promise<void>;

  // Bookmarks
  getBookmark(id: string): Promise<Bookmark | undefined>;
  getBookmarks(): Promise<Bookmark[]>;
  addBookmark(bookmark: BookmarkField): Promise<string>;
  putBookmark(bookmark: Bookmark): Promise<void>;
  putBookmarks(bookmarks: Bookmark[]): Promise<void>;
  updateBookmark(id: string, updates: Partial<BookmarkField>): Promise<void>;
  deleteBookmark(id: string): Promise<void>;
  softDeleteBookmark(id: string): Promise<void>;
  markBookmarkSynced(id: string, updatedAt: number): Promise<void>;

  // Collections
  getCollection(id: string): Promise<Collection | undefined>;
  getCollections(): Promise<Collection[]>;
  addCollection(collection: CollectionField): Promise<string>;
  putCollection(collection: Collection): Promise<void>;
  putCollections(collections: Collection[]): Promise<void>;
  updateCollection(
    id: string,
    updates: Partial<CollectionField>,
  ): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  softDeleteCollection(id: string): Promise<void>;
  markCollectionSynced(id: string, updatedAt: number): Promise<void>;

  // Echoes
  getEcho(id: string): Promise<Echo | undefined>;
  getEchoes(): Promise<Echo[]>;
  addEcho(echo: EchoField): Promise<string>;
  putEcho(echo: Echo): Promise<void>;
  putEchoes(echoes: Echo[]): Promise<void>;
  updateEcho(id: string, updates: Partial<EchoField>): Promise<void>;
  deleteEcho(id: string): Promise<void>;
  softDeleteEcho(id: string): Promise<void>;
  markEchoSynced(id: string, updatedAt: number): Promise<void>;

  // Quick Notes
  getQuickNote(id: string): Promise<QuickNote | undefined>;
  getQuickNotes(): Promise<QuickNote[]>;
  addQuickNote(quickNote: QuickNoteField): Promise<string>;
  putQuickNote(quickNote: QuickNote): Promise<void>;
  putQuickNotes(quickNotes: QuickNote[]): Promise<void>;
  updateQuickNote(id: string, updates: Partial<QuickNoteField>): Promise<void>;
  deleteQuickNote(id: string): Promise<void>;
  softDeleteQuickNote(id: string): Promise<void>;
  markQuickNoteSynced(id: string, updatedAt: number): Promise<void>;

  // Todos
  getTodo(id: string): Promise<Todo | undefined>;
  getTodos(): Promise<Todo[]>;
  addTodo(todo: TodoField): Promise<string>;
  putTodo(todo: Todo): Promise<void>;
  putTodos(todos: Todo[]): Promise<void>;
  updateTodo(id: string, updates: Partial<TodoField>): Promise<void>;
  deleteTodo(id: string): Promise<void>;
  softDeleteTodo(id: string): Promise<void>;
  markTodoSynced(id: string, updatedAt: number): Promise<void>;

  // Watches
  getWatch(id: string): Promise<Watch | undefined>;
  getWatches(): Promise<Watch[]>;
  addWatch(watch: WatchField): Promise<string>;
  putWatch(watch: Watch): Promise<void>;
  putWatches(watches: Watch[]): Promise<void>;
  updateWatch(id: string, updates: Partial<WatchField>): Promise<void>;
  deleteWatch(id: string): Promise<void>;
  softDeleteWatch(id: string): Promise<void>;
  markWatchSynced(id: string, updatedAt: number): Promise<void>;

  // Tiptaps
  getTiptap(id: string): Promise<TiptapV2 | undefined>;
  addTiptap(tiptap: TiptapV2Field): Promise<string>;
  putTiptap(tiptap: TiptapV2): Promise<void>;
  putTiptaps(tiptaps: TiptapV2[]): Promise<void>;
  syncTiptap(id: string, content: Record<string, unknown>): Promise<void>;
  updateTiptap(id: string, updates: Partial<TiptapV2Field>): Promise<void>;
  deleteTiptap(id: string): Promise<void>;
  softDeleteTiptap(id: string): Promise<void>;
  markTiptapSynced(id: string, updatedAt: number): Promise<void>;
  listTiptapHistory(id: string): Promise<number[]>;
  getTiptapHistory(id: string, ts: number): Promise<Record<string, unknown>>;
  restoreTiptapHistory(id: string, ts: number): Promise<void>;

  // Sync
  getPendingChanges(): Promise<DashboardData>;
  getLocalDataForSync(): Promise<DashboardData>;
  getSyncMeta(key: string): Promise<SyncMeta | undefined>;
  setSyncMeta(key: string, value: number | string): Promise<void>;
  getLastServerVersion(): Promise<number>;
  clearAllData(): Promise<void>;
}

export class RefreshDecorator implements IDashboardDatabase {
  private baseDb: IDashboardDatabase;
  private onTableChange: (table: string, id?: string) => void;

  constructor(
    baseDb: IDashboardDatabase,
    onTableChange: (table: string, id?: string) => void,
  ) {
    this.baseDb = baseDb;
    this.onTableChange = onTableChange;
  }

  // User
  async getUser(): Promise<User | undefined> {
    return this.baseDb.getUser();
  }

  async putUser(user: Omit<User, "key">): Promise<void> {
    await this.baseDb.putUser(user);
    this.onTableChange("user");
  }

  async updateUser(updates: Partial<UserField>): Promise<void> {
    await this.baseDb.updateUser(updates);
    this.onTableChange("user");
  }

  // Tags
  async getTag(id: string): Promise<Tag | undefined> {
    return this.baseDb.getTag(id);
  }

  async getAllTags(): Promise<Tag[]> {
    return this.baseDb.getAllTags();
  }

  async addTag(tag: TagField): Promise<string> {
    const id = await this.baseDb.addTag(tag);
    this.onTableChange("tags");
    return id;
  }

  async putTag(tag: Tag): Promise<void> {
    await this.baseDb.putTag(tag);
    this.onTableChange("tags");
  }

  async putTags(tags: Tag[]): Promise<void> {
    await this.baseDb.putTags(tags);
    this.onTableChange("tags");
  }

  async updateTag(id: string, updates: Partial<TagField>): Promise<void> {
    await this.baseDb.updateTag(id, updates);
    this.onTableChange("tags");
  }

  async deleteTag(id: string): Promise<void> {
    await this.baseDb.deleteTag(id);
    this.onTableChange("tags");
  }

  async softDeleteTag(id: string): Promise<void> {
    await this.baseDb.softDeleteTag(id);
    this.onTableChange("tags");
  }

  async markTagSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markTagSynced(id, updatedAt);
  }

  // Blogs
  async getBlog(id: string): Promise<Blog | undefined> {
    return this.baseDb.getBlog(id);
  }

  async getBlogs(): Promise<Blog[]> {
    return this.baseDb.getBlogs();
  }

  async addBlog(blog: BlogField): Promise<string> {
    const id = await this.baseDb.addBlog(blog);
    this.onTableChange("blogs");
    return id;
  }

  async putBlog(blog: Blog): Promise<void> {
    await this.baseDb.putBlog(blog);
    this.onTableChange("blogs");
  }

  async putBlogs(blogs: Blog[]): Promise<void> {
    await this.baseDb.putBlogs(blogs);
    this.onTableChange("blogs");
  }

  async updateBlog(id: string, updates: Partial<BlogField>): Promise<void> {
    await this.baseDb.updateBlog(id, updates);
    this.onTableChange("blogs");
  }

  async deleteBlog(id: string): Promise<void> {
    await this.baseDb.deleteBlog(id);
    this.onTableChange("blogs");
  }

  async softDeleteBlog(id: string): Promise<void> {
    await this.baseDb.softDeleteBlog(id);
    this.onTableChange("blogs");
  }

  async markBlogSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markBlogSynced(id, updatedAt);
  }

  // Bookmarks
  async getBookmark(id: string): Promise<Bookmark | undefined> {
    return this.baseDb.getBookmark(id);
  }

  async getBookmarks(): Promise<Bookmark[]> {
    return this.baseDb.getBookmarks();
  }

  async addBookmark(bookmark: BookmarkField): Promise<string> {
    const id = await this.baseDb.addBookmark(bookmark);
    this.onTableChange("bookmarks");
    return id;
  }

  async putBookmark(bookmark: Bookmark): Promise<void> {
    await this.baseDb.putBookmark(bookmark);
    this.onTableChange("bookmarks");
  }

  async putBookmarks(bookmarks: Bookmark[]): Promise<void> {
    await this.baseDb.putBookmarks(bookmarks);
    this.onTableChange("bookmarks");
  }

  async updateBookmark(
    id: string,
    updates: Partial<BookmarkField>,
  ): Promise<void> {
    await this.baseDb.updateBookmark(id, updates);
    this.onTableChange("bookmarks");
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.baseDb.deleteBookmark(id);
    this.onTableChange("bookmarks");
  }

  async softDeleteBookmark(id: string): Promise<void> {
    await this.baseDb.softDeleteBookmark(id);
    this.onTableChange("bookmarks");
  }

  async markBookmarkSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markBookmarkSynced(id, updatedAt);
  }

  // Collections
  async getCollection(id: string): Promise<Collection | undefined> {
    return this.baseDb.getCollection(id);
  }

  async getCollections(): Promise<Collection[]> {
    return this.baseDb.getCollections();
  }

  async addCollection(collection: CollectionField): Promise<string> {
    const id = await this.baseDb.addCollection(collection);
    this.onTableChange("collections");
    return id;
  }

  async putCollection(collection: Collection): Promise<void> {
    await this.baseDb.putCollection(collection);
    this.onTableChange("collections");
  }

  async putCollections(collections: Collection[]): Promise<void> {
    await this.baseDb.putCollections(collections);
    this.onTableChange("collections");
  }

  async updateCollection(
    id: string,
    updates: Partial<CollectionField>,
  ): Promise<void> {
    await this.baseDb.updateCollection(id, updates);
    this.onTableChange("collections");
  }

  async deleteCollection(id: string): Promise<void> {
    await this.baseDb.deleteCollection(id);
    this.onTableChange("collections");
  }

  async softDeleteCollection(id: string): Promise<void> {
    await this.baseDb.softDeleteCollection(id);
    this.onTableChange("collections");
  }

  async markCollectionSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markCollectionSynced(id, updatedAt);
  }

  // Echoes
  async getEcho(id: string): Promise<Echo | undefined> {
    return this.baseDb.getEcho(id);
  }

  async getEchoes(): Promise<Echo[]> {
    return this.baseDb.getEchoes();
  }

  async addEcho(echo: EchoField): Promise<string> {
    const id = await this.baseDb.addEcho(echo);
    this.onTableChange("echoes");
    return id;
  }

  async putEcho(echo: Echo): Promise<void> {
    await this.baseDb.putEcho(echo);
    this.onTableChange("echoes");
  }

  async putEchoes(echoes: Echo[]): Promise<void> {
    await this.baseDb.putEchoes(echoes);
    this.onTableChange("echoes");
  }

  async updateEcho(id: string, updates: Partial<EchoField>): Promise<void> {
    await this.baseDb.updateEcho(id, updates);
    this.onTableChange("echoes");
  }

  async deleteEcho(id: string): Promise<void> {
    await this.baseDb.deleteEcho(id);
    this.onTableChange("echoes");
  }

  async softDeleteEcho(id: string): Promise<void> {
    await this.baseDb.softDeleteEcho(id);
    this.onTableChange("echoes");
  }

  async markEchoSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markEchoSynced(id, updatedAt);
  }

  // Quick Notes
  async getQuickNote(id: string): Promise<QuickNote | undefined> {
    return this.baseDb.getQuickNote(id);
  }

  async getQuickNotes(): Promise<QuickNote[]> {
    return this.baseDb.getQuickNotes();
  }

  async addQuickNote(quickNote: QuickNoteField): Promise<string> {
    const id = await this.baseDb.addQuickNote(quickNote);
    this.onTableChange("quickNotes");
    return id;
  }

  async putQuickNote(quickNote: QuickNote): Promise<void> {
    await this.baseDb.putQuickNote(quickNote);
    this.onTableChange("quickNotes");
  }

  async putQuickNotes(quickNotes: QuickNote[]): Promise<void> {
    await this.baseDb.putQuickNotes(quickNotes);
    this.onTableChange("quickNotes");
  }

  async updateQuickNote(
    id: string,
    updates: Partial<QuickNoteField>,
  ): Promise<void> {
    await this.baseDb.updateQuickNote(id, updates);
    this.onTableChange("quickNotes");
  }

  async deleteQuickNote(id: string): Promise<void> {
    await this.baseDb.deleteQuickNote(id);
    this.onTableChange("quickNotes");
  }

  async softDeleteQuickNote(id: string): Promise<void> {
    await this.baseDb.softDeleteQuickNote(id);
    this.onTableChange("quickNotes");
  }

  async markQuickNoteSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markQuickNoteSynced(id, updatedAt);
  }

  // Todos
  async getTodo(id: string): Promise<Todo | undefined> {
    return this.baseDb.getTodo(id);
  }

  async getTodos(): Promise<Todo[]> {
    return this.baseDb.getTodos();
  }

  async addTodo(todo: TodoField): Promise<string> {
    const id = await this.baseDb.addTodo(todo);
    this.onTableChange("todos");
    return id;
  }

  async putTodo(todo: Todo): Promise<void> {
    await this.baseDb.putTodo(todo);
    this.onTableChange("todos");
  }

  async putTodos(todos: Todo[]): Promise<void> {
    await this.baseDb.putTodos(todos);
    this.onTableChange("todos");
  }

  async updateTodo(id: string, updates: Partial<TodoField>): Promise<void> {
    await this.baseDb.updateTodo(id, updates);
    this.onTableChange("todos");
  }

  async deleteTodo(id: string): Promise<void> {
    await this.baseDb.deleteTodo(id);
    this.onTableChange("todos");
  }

  async softDeleteTodo(id: string): Promise<void> {
    await this.baseDb.softDeleteTodo(id);
    this.onTableChange("todos");
  }

  async markTodoSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markTodoSynced(id, updatedAt);
  }

  // Watches
  async getWatch(id: string): Promise<Watch | undefined> {
    return this.baseDb.getWatch(id);
  }

  async getWatches(): Promise<Watch[]> {
    return this.baseDb.getWatches();
  }

  async addWatch(watch: WatchField): Promise<string> {
    const id = await this.baseDb.addWatch(watch);
    this.onTableChange("watches");
    return id;
  }

  async putWatch(watch: Watch): Promise<void> {
    await this.baseDb.putWatch(watch);
    this.onTableChange("watches");
  }

  async putWatches(watches: Watch[]): Promise<void> {
    await this.baseDb.putWatches(watches);
    this.onTableChange("watches");
  }

  async updateWatch(id: string, updates: Partial<WatchField>): Promise<void> {
    await this.baseDb.updateWatch(id, updates);
    this.onTableChange("watches");
  }

  async deleteWatch(id: string): Promise<void> {
    await this.baseDb.deleteWatch(id);
    this.onTableChange("watches");
  }

  async softDeleteWatch(id: string): Promise<void> {
    await this.baseDb.softDeleteWatch(id);
    this.onTableChange("watches");
  }

  async markWatchSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markWatchSynced(id, updatedAt);
  }

  // Tiptaps
  async getTiptap(id: string): Promise<TiptapV2 | undefined> {
    return this.baseDb.getTiptap(id);
  }

  async addTiptap(tiptap: TiptapV2Field): Promise<string> {
    return this.baseDb.addTiptap(tiptap);
  }

  async putTiptap(tiptap: TiptapV2): Promise<void> {
    await this.baseDb.putTiptap(tiptap);
    this.onTableChange("tiptap", tiptap.id);
  }

  async putTiptaps(tiptaps: TiptapV2[]): Promise<void> {
    await this.baseDb.putTiptaps(tiptaps);
    this.onTableChange("tiptaps");
  }

  async syncTiptap(
    id: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    return this.baseDb.syncTiptap(id, content);
  }

  async updateTiptap(
    id: string,
    updates: Partial<TiptapV2Field>,
  ): Promise<void> {
    await this.baseDb.updateTiptap(id, updates);
    this.onTableChange("tiptap", id);
  }

  async deleteTiptap(id: string): Promise<void> {
    return this.baseDb.deleteTiptap(id);
  }

  async softDeleteTiptap(id: string): Promise<void> {
    return this.baseDb.softDeleteTiptap(id);
  }

  async markTiptapSynced(id: string, updatedAt: number): Promise<void> {
    return this.baseDb.markTiptapSynced(id, updatedAt);
  }

  async listTiptapHistory(id: string): Promise<number[]> {
    return this.baseDb.listTiptapHistory(id);
  }

  async getTiptapHistory(
    id: string,
    ts: number,
  ): Promise<Record<string, unknown>> {
    return this.baseDb.getTiptapHistory(id, ts);
  }

  async restoreTiptapHistory(id: string, ts: number): Promise<void> {
    await this.baseDb.restoreTiptapHistory(id, ts);
    this.onTableChange("tiptap", id);
  }

  // Sync
  async getPendingChanges(): Promise<DashboardData> {
    return this.baseDb.getPendingChanges();
  }

  async getLocalDataForSync(): Promise<DashboardData> {
    return this.baseDb.getLocalDataForSync();
  }

  async getSyncMeta(key: string): Promise<SyncMeta | undefined> {
    return this.baseDb.getSyncMeta(key);
  }

  async setSyncMeta(key: string, value: number | string): Promise<void> {
    return this.baseDb.setSyncMeta(key, value);
  }

  async getLastServerVersion(): Promise<number> {
    return this.baseDb.getLastServerVersion();
  }

  async clearAllData(): Promise<void> {
    return this.baseDb.clearAllData();
  }
}

// Create base database based on runtime environment
function createBaseDatabase(): IDashboardDatabase {
  if (isTauri()) {
    return new SqliteDashboardDatabase();
  }
  return new DexieDashboardDatabase();
}

// Export singleton instance
export const dashboardDatabase: IDashboardDatabase = new RefreshDecorator(
  createBaseDatabase(),
  (table, id?: string) => {
    if (table === "tiptap") {
      tiptapRefresh(id!);
    }
    triggerRefresh(table);
  },
);
