import { invoke } from "@tauri-apps/api/core";
import type { IDashboardDatabase } from "./db-interface";
import type {
  Blog,
  BlogField,
  Bookmark,
  BookmarkField,
  Collection,
  CollectionField,
  DashboardData,
  Echo,
  EchoField,
  QuickNote,
  QuickNoteField,
  Todo,
  TodoField,
  Watch,
  WatchField,
} from "./model";
import type {
  SyncMeta,
  Tag,
  TagField,
  TiptapV2,
  TiptapV2Field,
  User,
  UserField,
} from "@/lib/model";

// SQLite implementation via Tauri commands
export class SqliteDashboardDatabase implements IDashboardDatabase {
  // User
  async getUser(): Promise<User | undefined> {
    return (await invoke<User | null>("dashboard_get_user")) ?? undefined;
  }

  async putUser(user: Omit<User, "key">): Promise<void> {
    await invoke("dashboard_put_user", {
      user: { ...user, key: "current_user" },
    });
  }

  async updateUser(updates: Partial<UserField>): Promise<void> {
    await invoke("dashboard_update_user", { updates });
  }

  // Tags
  async getTag(id: string): Promise<Tag | undefined> {
    return (await invoke("dashboard_get_tag", { id })) ?? undefined;
  }

  async getAllTags(): Promise<Tag[]> {
    return invoke("dashboard_get_all_tags");
  }

  async addTag(tag: TagField): Promise<string> {
    return invoke("dashboard_add_tag", { tag });
  }

  async putTag(tag: Tag): Promise<void> {
    await invoke("dashboard_put_tag", { tag });
  }

  async putTags(tags: Tag[]): Promise<void> {
    await invoke("dashboard_put_tags", { tags });
  }

  async updateTag(id: string, updates: Partial<TagField>): Promise<void> {
    await invoke("dashboard_update_tag", { id, updates });
  }

  async deleteTag(id: string): Promise<void> {
    await invoke("dashboard_delete_tag", { id });
  }

  async softDeleteTag(id: string): Promise<void> {
    await invoke("dashboard_soft_delete_tag", { id });
  }

  async markTagSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("dashboard_mark_tag_synced", { id, updatedAt });
  }

  // Blogs
  async getBlog(id: string): Promise<Blog | undefined> {
    return (await invoke("dashboard_get_blog", { id })) ?? undefined;
  }

  async getBlogs(): Promise<Blog[]> {
    return invoke("dashboard_get_blogs");
  }

  async addBlog(blog: BlogField): Promise<string> {
    return invoke("dashboard_add_blog", { blog });
  }

  async putBlog(blog: Blog): Promise<void> {
    await invoke("dashboard_put_blog", { blog });
  }

  async putBlogs(blogs: Blog[]): Promise<void> {
    await invoke("dashboard_put_blogs", { blogs });
  }

  async updateBlog(id: string, updates: Partial<BlogField>): Promise<void> {
    await invoke("dashboard_update_blog", { id, updates });
  }

  async deleteBlog(id: string): Promise<void> {
    await invoke("dashboard_delete_blog", { id });
  }

  async softDeleteBlog(id: string): Promise<void> {
    await invoke("dashboard_soft_delete_blog", { id });
  }

  async markBlogSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("dashboard_mark_blog_synced", { id, updatedAt });
  }

  // Bookmarks
  async getBookmark(id: string): Promise<Bookmark | undefined> {
    return (await invoke("dashboard_get_bookmark", { id })) ?? undefined;
  }

  async getBookmarks(): Promise<Bookmark[]> {
    return invoke("dashboard_get_bookmarks");
  }

  async addBookmark(bookmark: BookmarkField): Promise<string> {
    return invoke("dashboard_add_bookmark", { bookmark });
  }

  async putBookmark(bookmark: Bookmark): Promise<void> {
    await invoke("dashboard_put_bookmark", { bookmark });
  }

  async putBookmarks(bookmarks: Bookmark[]): Promise<void> {
    await invoke("dashboard_put_bookmarks", { bookmarks });
  }

  async updateBookmark(
    id: string,
    updates: Partial<BookmarkField>,
  ): Promise<void> {
    await invoke("dashboard_update_bookmark", { id, updates });
  }

  async deleteBookmark(id: string): Promise<void> {
    await invoke("dashboard_delete_bookmark", { id });
  }

  async softDeleteBookmark(id: string): Promise<void> {
    await invoke("dashboard_soft_delete_bookmark", { id });
  }

  async markBookmarkSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("dashboard_mark_bookmark_synced", { id, updatedAt });
  }

  // Collections
  async getCollection(id: string): Promise<Collection | undefined> {
    return (
      (await invoke<Collection | null>("dashboard_get_collection", { id })) ??
      undefined
    );
  }

  async getCollections(): Promise<Collection[]> {
    return invoke("dashboard_get_collections");
  }

  async addCollection(collection: CollectionField): Promise<string> {
    return invoke("dashboard_add_collection", { collection });
  }

  async putCollection(collection: Collection): Promise<void> {
    await invoke("dashboard_put_collection", { collection });
  }

  async putCollections(collections: Collection[]): Promise<void> {
    await invoke("dashboard_put_collections", { collections });
  }

  async updateCollection(
    id: string,
    updates: Partial<CollectionField>,
  ): Promise<void> {
    await invoke("dashboard_update_collection", { id, updates });
  }

  async deleteCollection(id: string): Promise<void> {
    await invoke("dashboard_delete_collection", { id });
  }

  async softDeleteCollection(id: string): Promise<void> {
    await invoke("dashboard_soft_delete_collection", { id });
  }

  async markCollectionSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("dashboard_mark_collection_synced", { id, updatedAt });
  }

  // Echoes
  async getEcho(id: string): Promise<Echo | undefined> {
    return (await invoke("dashboard_get_echo", { id })) ?? undefined;
  }

  async getEchoes(): Promise<Echo[]> {
    return invoke("dashboard_get_echoes");
  }

  async addEcho(echo: EchoField): Promise<string> {
    return invoke("dashboard_add_echo", { echo });
  }

  async putEcho(echo: Echo): Promise<void> {
    await invoke("dashboard_put_echo", { echo });
  }

  async putEchoes(echoes: Echo[]): Promise<void> {
    await invoke("dashboard_put_echoes", { echoes });
  }

  async updateEcho(id: string, updates: Partial<EchoField>): Promise<void> {
    await invoke("dashboard_update_echo", { id, updates });
  }

  async deleteEcho(id: string): Promise<void> {
    await invoke("dashboard_delete_echo", { id });
  }

  async softDeleteEcho(id: string): Promise<void> {
    await invoke("dashboard_soft_delete_echo", { id });
  }

  async markEchoSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("dashboard_mark_echo_synced", { id, updatedAt });
  }

  // Quick Notes
  async getQuickNote(id: string): Promise<QuickNote | undefined> {
    return (
      (await invoke<QuickNote | null>("dashboard_get_quick_note", { id })) ??
      undefined
    );
  }

  async getQuickNotes(): Promise<QuickNote[]> {
    return invoke("dashboard_get_quick_notes");
  }

  async addQuickNote(quickNote: QuickNoteField): Promise<string> {
    return invoke("dashboard_add_quick_note", { quickNote });
  }

  async putQuickNote(quickNote: QuickNote): Promise<void> {
    await invoke("dashboard_put_quick_note", { quickNote });
  }

  async putQuickNotes(quickNotes: QuickNote[]): Promise<void> {
    await invoke("dashboard_put_quick_notes", { quickNotes });
  }

  async updateQuickNote(
    id: string,
    updates: Partial<QuickNoteField>,
  ): Promise<void> {
    await invoke("dashboard_update_quick_note", { id, updates });
  }

  async deleteQuickNote(id: string): Promise<void> {
    await invoke("dashboard_delete_quick_note", { id });
  }

  async softDeleteQuickNote(id: string): Promise<void> {
    await invoke("dashboard_soft_delete_quick_note", { id });
  }

  async markQuickNoteSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("dashboard_mark_quick_note_synced", { id, updatedAt });
  }

  // Todos
  async getTodo(id: string): Promise<Todo | undefined> {
    return (await invoke("dashboard_get_todo", { id })) ?? undefined;
  }

  async getTodos(): Promise<Todo[]> {
    return invoke("dashboard_get_todos");
  }

  async addTodo(todo: TodoField): Promise<string> {
    return invoke("dashboard_add_todo", { todo });
  }

  async putTodo(todo: Todo): Promise<void> {
    await invoke("dashboard_put_todo", { todo });
  }

  async putTodos(todos: Todo[]): Promise<void> {
    await invoke("dashboard_put_todos", { todos });
  }

  async updateTodo(id: string, updates: Partial<TodoField>): Promise<void> {
    await invoke("dashboard_update_todo", { id, updates });
  }

  async deleteTodo(id: string): Promise<void> {
    await invoke("dashboard_delete_todo", { id });
  }

  async softDeleteTodo(id: string): Promise<void> {
    await invoke("dashboard_soft_delete_todo", { id });
  }

  async markTodoSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("dashboard_mark_todo_synced", { id, updatedAt });
  }

  // Watches
  async getWatch(id: string): Promise<Watch | undefined> {
    return (await invoke("dashboard_get_watch", { id })) ?? undefined;
  }

  async getWatches(): Promise<Watch[]> {
    return invoke("dashboard_get_watches");
  }

  async addWatch(watch: WatchField): Promise<string> {
    return invoke("dashboard_add_watch", { watch });
  }

  async putWatch(watch: Watch): Promise<void> {
    await invoke("dashboard_put_watch", { watch });
  }

  async putWatches(watches: Watch[]): Promise<void> {
    await invoke("dashboard_put_watches", { watches });
  }

  async updateWatch(id: string, updates: Partial<WatchField>): Promise<void> {
    await invoke("dashboard_update_watch", { id, updates });
  }

  async deleteWatch(id: string): Promise<void> {
    await invoke("dashboard_delete_watch", { id });
  }

  async softDeleteWatch(id: string): Promise<void> {
    await invoke("dashboard_soft_delete_watch", { id });
  }

  async markWatchSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("dashboard_mark_watch_synced", { id, updatedAt });
  }

  // Tiptaps
  async getTiptap(id: string): Promise<TiptapV2 | undefined> {
    return (
      (await invoke<TiptapV2 | null>("dashboard_get_tiptap", { id })) ??
      undefined
    );
  }

  async addTiptap(tiptap: TiptapV2Field): Promise<string> {
    return invoke("dashboard_add_tiptap", { tiptap });
  }

  async putTiptap(tiptap: TiptapV2): Promise<void> {
    await invoke("dashboard_put_tiptap", { tiptap });
  }

  async putTiptaps(tiptaps: TiptapV2[]): Promise<void> {
    await invoke("dashboard_put_tiptaps", { tiptaps });
  }

  async syncTiptap(
    id: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    await invoke("dashboard_sync_tiptap", { id, content });
  }

  async updateTiptap(
    id: string,
    updates: Partial<TiptapV2Field>,
  ): Promise<void> {
    await invoke("dashboard_update_tiptap", { id, updates });
  }

  async deleteTiptap(id: string): Promise<void> {
    await invoke("dashboard_delete_tiptap", { id });
  }

  async softDeleteTiptap(id: string): Promise<void> {
    await invoke("dashboard_soft_delete_tiptap", { id });
  }

  async markTiptapSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("dashboard_mark_tiptap_synced", { id, updatedAt });
  }

  async listTiptapHistory(id: string): Promise<number[]> {
    return invoke("dashboard_list_tiptap_history", { id });
  }

  async getTiptapHistory(
    id: string,
    ts: number,
  ): Promise<Record<string, unknown>> {
    return invoke("dashboard_get_tiptap_history", { id, ts });
  }

  async restoreTiptapHistory(id: string, ts: number): Promise<void> {
    await invoke("dashboard_restore_tiptap_history", { id, ts });
  }

  // Sync
  async getPendingChanges(): Promise<DashboardData> {
    return invoke("dashboard_get_pending_changes");
  }

  async getLocalDataForSync(): Promise<DashboardData> {
    return invoke("dashboard_get_local_data_for_sync");
  }

  async getSyncMeta(key: string): Promise<SyncMeta | undefined> {
    return (
      (await invoke<SyncMeta | null>("dashboard_get_sync_meta", { key })) ??
      undefined
    );
  }

  async setSyncMeta(key: string, value: number | string): Promise<void> {
    await invoke("dashboard_set_sync_meta", { key, value });
  }

  async getLastServerVersion(): Promise<number> {
    return invoke("dashboard_get_last_server_version");
  }

  async clearAllData(): Promise<void> {
    await invoke("dashboard_clear_all_data");
  }
}
