use std::sync::OnceLock;

use app_journal::{
    Entry, EntryField, GetEntriesResult, JournalApp, JournalData, QueryCondition, Statistic,
    SyncMeta, Tag, TagField, TiptapV2, TiptapV2Field, User,
};
use tauri::{AppHandle, Manager};

use crate::media_cache::{backend_url, current_auth_token};

static JOURNAL_APP: OnceLock<JournalApp> = OnceLock::new();

pub fn init(app: &AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    let database_path = app_data_dir.join("journal.db");
    let app = JournalApp::open(database_path, backend_url()).map_err(|error| error.to_string())?;
    JOURNAL_APP
        .set(app)
        .map_err(|_| "journal app already initialized".to_string())
}

fn journal_app() -> Result<&'static JournalApp, String> {
    JOURNAL_APP
        .get()
        .ok_or_else(|| "journal app not initialized".to_string())
}

fn auth_token() -> Option<String> {
    current_auth_token().filter(|value| !value.is_empty())
}

#[tauri::command]
pub fn journal_get_user() -> Result<Option<User>, String> {
    journal_app()?.get_user().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_put_user(user: User) -> Result<(), String> {
    journal_app()?
        .put_user(&user)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_get_entry(id: String) -> Result<Option<Entry>, String> {
    journal_app()?
        .get_entry(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn journal_get_entries(
    page: i64,
    condition: Vec<QueryCondition>,
) -> Result<GetEntriesResult, String> {
    let token = auth_token();
    journal_app()?
        .get_entries(page, &condition, token.as_deref())
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_add_entry(entry: EntryField) -> Result<String, String> {
    journal_app()?
        .add_entry(&entry)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_put_entry(entry: Entry) -> Result<(), String> {
    journal_app()?
        .put_entry(&entry)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_put_entries(entries: Vec<Entry>) -> Result<(), String> {
    journal_app()?
        .put_entries(&entries)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_update_entry(id: String, updates: serde_json::Value) -> Result<(), String> {
    journal_app()?
        .update_entry(&id, &updates)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_delete_entry(id: String) -> Result<(), String> {
    journal_app()?
        .delete_entry(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_soft_delete_entry(id: String) -> Result<(), String> {
    journal_app()?
        .soft_delete_entry(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_mark_entry_synced(id: String, updated_at: i64) -> Result<(), String> {
    journal_app()?
        .mark_entry_synced(&id, updated_at)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_get_tag(id: String) -> Result<Option<Tag>, String> {
    journal_app()?
        .get_tag(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_get_all_tags() -> Result<Vec<Tag>, String> {
    journal_app()?
        .get_all_tags()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_add_tag(tag: TagField) -> Result<String, String> {
    journal_app()?
        .add_tag(&tag)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_put_tag(tag: Tag) -> Result<(), String> {
    journal_app()?
        .put_tag(&tag)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_put_tags(tags: Vec<Tag>) -> Result<(), String> {
    journal_app()?
        .put_tags(&tags)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_update_tag(id: String, updates: serde_json::Value) -> Result<(), String> {
    journal_app()?
        .update_tag(&id, &updates)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_delete_tag(id: String) -> Result<(), String> {
    journal_app()?
        .delete_tag(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_soft_delete_tag(id: String) -> Result<(), String> {
    journal_app()?
        .soft_delete_tag(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_mark_tag_synced(id: String, updated_at: i64) -> Result<(), String> {
    journal_app()?
        .mark_tag_synced(&id, updated_at)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_get_tiptap(id: String) -> Result<Option<TiptapV2>, String> {
    journal_app()?
        .get_tiptap(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_add_tiptap(tiptap: TiptapV2Field) -> Result<String, String> {
    journal_app()?
        .add_tiptap(&tiptap)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_put_tiptap(tiptap: TiptapV2) -> Result<(), String> {
    journal_app()?
        .put_tiptap(&tiptap)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_put_tiptaps(tiptaps: Vec<TiptapV2>) -> Result<(), String> {
    journal_app()?
        .put_tiptaps(&tiptaps)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_sync_tiptap(id: String, content: serde_json::Value) -> Result<(), String> {
    journal_app()?
        .sync_tiptap(&id, &content)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_update_tiptap(id: String, updates: serde_json::Value) -> Result<(), String> {
    journal_app()?
        .update_tiptap(&id, &updates)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_delete_tiptap(id: String) -> Result<(), String> {
    journal_app()?
        .delete_tiptap(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_soft_delete_tiptap(id: String) -> Result<(), String> {
    journal_app()?
        .soft_delete_tiptap(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_mark_tiptap_synced(id: String, updated_at: i64) -> Result<(), String> {
    journal_app()?
        .mark_tiptap_synced(&id, updated_at)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_list_tiptap_history(id: String) -> Result<Vec<i64>, String> {
    journal_app()?
        .list_tiptap_history(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_get_tiptap_history(id: String, ts: i64) -> Result<serde_json::Value, String> {
    journal_app()?
        .get_tiptap_history(&id, ts)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_restore_tiptap_history(id: String, ts: i64) -> Result<(), String> {
    journal_app()?
        .restore_tiptap_history(&id, ts)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_get_pending_changes() -> Result<JournalData, String> {
    journal_app()?
        .get_pending_changes()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_get_local_data_for_sync() -> Result<JournalData, String> {
    journal_app()?
        .get_local_data_for_sync()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_get_sync_meta(key: String) -> Result<Option<SyncMeta>, String> {
    journal_app()?
        .get_sync_meta(&key)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_set_sync_meta(key: String, value: serde_json::Value) -> Result<(), String> {
    journal_app()?
        .set_sync_meta(&key, &value)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_get_last_server_version() -> Result<i64, String> {
    journal_app()?
        .get_last_server_version()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_clear_all_data() -> Result<(), String> {
    journal_app()?
        .clear_all_data()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_get_statistic(key: String) -> Result<Option<Statistic>, String> {
    journal_app()?
        .get_statistic(&key)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_set_statistic(key: String, value: serde_json::Value) -> Result<(), String> {
    journal_app()?
        .set_statistic(&key, &value)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn journal_put_statistics(statistics: Vec<Statistic>) -> Result<(), String> {
    journal_app()?
        .put_statistics(&statistics)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn journal_full_sync() -> Result<serde_json::Value, String> {
    let token = auth_token();
    journal_app()?
        .full_sync(token.as_deref())
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn journal_push(data: JournalData) -> Result<serde_json::Value, String> {
    let token = auth_token();
    journal_app()?
        .push(data, token.as_deref())
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn journal_pull(version: i64) -> Result<serde_json::Value, String> {
    let token = auth_token();
    journal_app()?
        .pull(version, token.as_deref())
        .await
        .map_err(|error| error.to_string())
}
