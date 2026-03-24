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
} from "@/lib/model";
import { isTauri } from "@/lib/utils";

// Database abstraction interface
export interface IDashboardDatabase {
  // User
  getUser(): Promise<User | undefined>;
  putUser(user: Omit<User, "key">): Promise<void>;

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
  updateQuickNote(
    id: string,
    updates: Partial<QuickNoteField>,
  ): Promise<void>;
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

// Create base database based on runtime environment
function createBaseDatabase(): IDashboardDatabase {
  if (isTauri()) {
    return new SqliteDashboardDatabase();
  }
  return new DexieDashboardDatabase();
}

// Export singleton instance
export const dashboardDatabase: IDashboardDatabase = createBaseDatabase();
