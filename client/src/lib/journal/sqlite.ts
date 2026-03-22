import { invoke } from "@tauri-apps/api/core";
import type { IJournalDatabase } from "./db-interface";
import type { Entry, EntryField, JournalData, Tag, TagField } from "./model";
import type { SyncMeta, TiptapV2, TiptapV2Field, User } from "@/lib/model";

// SQLite implementation via Tauri commands
export class SqliteJournalDatabase implements IJournalDatabase {
  // User
  async getUser(): Promise<User | undefined> {
    return (await invoke<User | null>("journal_get_user")) ?? undefined;
  }

  async putUser(user: Omit<User, "key">): Promise<void> {
    await invoke("journal_put_user", {
      user: { ...user, key: "current_user" },
    });
  }

  // Entries
  async getEntry(id: string): Promise<Entry | undefined> {
    return (
      (await invoke<Entry | null>("journal_get_entry", { id })) ?? undefined
    );
  }

  async getAllEntries(): Promise<Entry[]> {
    return invoke("journal_get_all_entries");
  }

  async addEntry(entry: EntryField): Promise<string> {
    return invoke("journal_add_entry", { entry });
  }

  async putEntry(entry: Entry): Promise<void> {
    await invoke("journal_put_entry", { entry });
  }

  async putEntries(entries: Entry[]): Promise<void> {
    await invoke("journal_put_entries", { entries });
  }

  async updateEntry(id: string, updates: Partial<EntryField>): Promise<void> {
    await invoke("journal_update_entry", { id, updates });
  }

  async deleteEntry(id: string): Promise<void> {
    await invoke("journal_delete_entry", { id });
  }

  async softDeleteEntry(id: string): Promise<void> {
    await invoke("journal_soft_delete_entry", { id });
  }

  async markEntrySynced(id: string, updatedAt: number): Promise<void> {
    await invoke("journal_mark_entry_synced", { id, updatedAt });
  }

  // Tags
  async getTag(id: string): Promise<Tag | undefined> {
    return (await invoke<Tag | null>("journal_get_tag", { id })) ?? undefined;
  }

  async getAllTags(): Promise<Tag[]> {
    return invoke("journal_get_all_tags");
  }

  async addTag(tag: TagField): Promise<string> {
    return invoke("journal_add_tag", { tag });
  }

  async putTag(tag: Tag): Promise<void> {
    await invoke("journal_put_tag", { tag });
  }

  async putTags(tags: Tag[]): Promise<void> {
    await invoke("journal_put_tags", { tags });
  }

  async updateTag(id: string, updates: Partial<TagField>): Promise<void> {
    await invoke("journal_update_tag", { id, updates });
  }

  async deleteTag(id: string): Promise<void> {
    await invoke("journal_delete_tag", { id });
  }

  async softDeleteTag(id: string): Promise<void> {
    await invoke("journal_soft_delete_tag", { id });
  }

  async markTagSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("journal_mark_tag_synced", { id, updatedAt });
  }

  // Tiptaps
  async getTiptap(id: string): Promise<TiptapV2 | undefined> {
    return (
      (await invoke<TiptapV2 | null>("journal_get_tiptap", { id })) ?? undefined
    );
  }

  async addTiptap(tiptap: TiptapV2Field): Promise<string> {
    return invoke("journal_add_tiptap", { tiptap });
  }

  async putTiptap(tiptap: TiptapV2): Promise<void> {
    await invoke("journal_put_tiptap", { tiptap });
  }

  async putTiptaps(tiptaps: TiptapV2[]): Promise<void> {
    await invoke("journal_put_tiptaps", { tiptaps });
  }

  async syncTiptap(
    id: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    await invoke("journal_sync_tiptap", { id, content });
  }

  async updateTiptap(
    id: string,
    updates: Partial<TiptapV2Field>,
  ): Promise<void> {
    await invoke("journal_update_tiptap", { id, updates });
  }

  async deleteTiptap(id: string): Promise<void> {
    await invoke("journal_delete_tiptap", { id });
  }

  async softDeleteTiptap(id: string): Promise<void> {
    await invoke("journal_soft_delete_tiptap", { id });
  }

  async markTiptapSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("journal_mark_tiptap_synced", { id, updatedAt });
  }

  async listTiptapHistory(id: string): Promise<number[]> {
    return invoke("journal_list_tiptap_history", { id });
  }

  async getTiptapHistory(
    id: string,
    ts: number,
  ): Promise<Record<string, unknown>> {
    return invoke("journal_get_tiptap_history", { id, ts });
  }

  async restoreTiptapHistory(id: string, ts: number): Promise<void> {
    await invoke("journal_restore_tiptap_history", { id, ts });
  }

  // Sync
  async getPendingChanges(): Promise<JournalData> {
    return invoke("journal_get_pending_changes");
  }

  async getLocalDataForSync(): Promise<JournalData> {
    return invoke("journal_get_local_data_for_sync");
  }

  async getSyncMeta(key: string): Promise<SyncMeta | undefined> {
    return (
      (await invoke<SyncMeta | null>("journal_get_sync_meta", { key })) ??
      undefined
    );
  }

  async setSyncMeta(key: string, value: number | string): Promise<void> {
    await invoke("journal_set_sync_meta", { key, value });
  }

  async getLastServerVersion(): Promise<number> {
    return invoke("journal_get_last_server_version");
  }

  async clearAllData(): Promise<void> {
    await invoke("journal_clear_all_data");
  }
}
