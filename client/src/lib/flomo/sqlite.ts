import { invoke } from "@tauri-apps/api/core";
import type { IFlomoDatabase } from "./db-interface";
import type { Card, CardField, FlomoData, Folder, FolderField } from "./model";
import type { SyncMeta, TiptapV2, TiptapV2Field, User } from "@/lib/model";

// SQLite implementation via Tauri commands
export class SqliteFlomoDatabase implements IFlomoDatabase {
  // User
  async getUser(): Promise<User | undefined> {
    return (await invoke<User | null>("flomo_get_user")) ?? undefined;
  }

  async putUser(user: Omit<User, "key">): Promise<void> {
    await invoke("flomo_put_user", { user: { ...user, key: "current_user" } });
  }

  // Cards
  async getCard(id: string): Promise<Omit<Card, "rawText"> | undefined> {
    return (await invoke("flomo_get_card", { id })) ?? undefined;
  }

  async getFullCard(id: string): Promise<Card | undefined> {
    return (await invoke("flomo_get_full_card", { id })) ?? undefined;
  }

  async getCardsInFolder(folderId: string): Promise<Omit<Card, "rawText">[]> {
    return invoke("flomo_get_cards_in_folder", { folderId });
  }

  async addCard(card: CardField): Promise<string> {
    return invoke("flomo_add_card", { card });
  }

  async putCard(card: Card): Promise<void> {
    await invoke("flomo_put_card", { card });
  }

  async putCards(cards: Card[]): Promise<void> {
    await invoke("flomo_put_cards", { cards });
  }

  async updateCard(id: string, updates: Partial<CardField>): Promise<void> {
    await invoke("flomo_update_card", { id, updates });
  }

  async deleteCard(id: string): Promise<void> {
    await invoke("flomo_delete_card", { id });
  }

  async softDeleteCard(id: string): Promise<void> {
    await invoke("flomo_soft_delete_card", { id });
  }

  async markCardSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("flomo_mark_card_synced", { id, updatedAt });
  }

  async getBookmarkedCards(): Promise<Omit<Card, "rawText">[]> {
    return invoke("flomo_get_bookmarked_cards");
  }

  async getRecentCards(limit: number): Promise<Card[]> {
    return invoke("flomo_get_recent_cards", { limit });
  }

  // Folders
  async getFolder(id: string): Promise<Folder | undefined> {
    return (
      (await invoke<Folder | null>("flomo_get_folder", { id })) ?? undefined
    );
  }

  async getFoldersInParent(parentId: string): Promise<Folder[]> {
    return invoke("flomo_get_folders_in_parent", { parentId });
  }

  async addFolder(folder: FolderField): Promise<string> {
    return invoke("flomo_add_folder", { folder });
  }

  async putFolder(folder: Folder): Promise<void> {
    await invoke("flomo_put_folder", { folder });
  }

  async putFolders(folders: Folder[]): Promise<void> {
    await invoke("flomo_put_folders", { folders });
  }

  async updateFolder(id: string, updates: Partial<FolderField>): Promise<void> {
    await invoke("flomo_update_folder", { id, updates });
  }

  async deleteFolder(id: string): Promise<void> {
    await invoke("flomo_delete_folder", { id });
  }

  async softDeleteFolder(id: string): Promise<void> {
    await invoke("flomo_soft_delete_folder", { id });
  }

  async markFolderSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("flomo_mark_folder_synced", { id, updatedAt });
  }

  async getBookmarkedFolders(): Promise<Folder[]> {
    return invoke("flomo_get_bookmarked_folders");
  }

  // Order
  async lastOrderInFolder(
    folderId: string,
    type: "card" | "folder",
  ): Promise<string | null> {
    return invoke("flomo_last_order_in_folder", { folderId, itemType: type });
  }

  // Tiptaps
  async getTiptap(id: string): Promise<TiptapV2 | undefined> {
    return (
      (await invoke<TiptapV2 | null>("flomo_get_tiptap", { id })) ?? undefined
    );
  }

  async addTiptap(tiptap: TiptapV2Field): Promise<string> {
    return invoke("flomo_add_tiptap", { tiptap });
  }

  async putTiptap(tiptap: TiptapV2): Promise<void> {
    await invoke("flomo_put_tiptap", { tiptap });
  }

  async putTiptaps(tiptaps: TiptapV2[]): Promise<void> {
    await invoke("flomo_put_tiptaps", { tiptaps });
  }

  async syncTiptap(
    id: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    await invoke("flomo_sync_tiptap", { id, content });
  }

  async updateTiptap(
    id: string,
    updates: Partial<TiptapV2Field>,
  ): Promise<void> {
    await invoke("flomo_update_tiptap", { id, updates });
  }

  async deleteTiptap(id: string): Promise<void> {
    await invoke("flomo_delete_tiptap", { id });
  }

  async softDeleteTiptap(id: string): Promise<void> {
    await invoke("flomo_soft_delete_tiptap", { id });
  }

  async markTiptapSynced(id: string, updatedAt: number): Promise<void> {
    await invoke("flomo_mark_tiptap_synced", { id, updatedAt });
  }

  async listTiptapHistory(id: string): Promise<number[]> {
    return invoke("flomo_list_tiptap_history", { id });
  }

  async getTiptapHistory(
    id: string,
    ts: number,
  ): Promise<Record<string, unknown>> {
    return invoke("flomo_get_tiptap_history", { id, ts });
  }

  async restoreTiptapHistory(id: string, ts: number): Promise<void> {
    await invoke("flomo_restore_tiptap_history", { id, ts });
  }

  // Sync
  async getPendingChanges(): Promise<FlomoData> {
    return invoke("flomo_get_pending_changes");
  }

  async getLocalDataForSync(): Promise<FlomoData> {
    return invoke("flomo_get_local_data_for_sync");
  }

  async getSyncMeta(key: string): Promise<SyncMeta | undefined> {
    return (
      (await invoke<SyncMeta | null>("flomo_get_sync_meta", { key })) ??
      undefined
    );
  }

  async setSyncMeta(key: string, value: number | string): Promise<void> {
    await invoke("flomo_set_sync_meta", { key, value });
  }

  async getLastServerVersion(): Promise<number> {
    return invoke("flomo_get_last_server_version");
  }

  async clearAllData(): Promise<void> {
    await invoke("flomo_clear_all_data");
  }
}
