mod error;
mod migration;
mod model;
mod repository;
mod sync;

pub use error::JournalError;
pub use model::{
    Entry, EntryField, EntryMeta, GetEntriesResult, HistoryEntry, JournalData, QueryCondition,
    Statistic, SyncMeta, Tag, TagField, TiptapV2, TiptapV2Field, User,
};
pub use repository::JournalRepository;

use app_sqlite::{DatabaseBootstrapper, DatabaseLocation};

pub struct JournalApp {
    repository: JournalRepository,
    sync_client: sync::JournalSyncClient,
}

impl JournalApp {
    pub fn open(
        database_path: impl Into<std::path::PathBuf>,
        backend_url: String,
    ) -> Result<Self, JournalError> {
        let database = DatabaseBootstrapper::new().bootstrap(
            DatabaseLocation::path(database_path.into()),
            &migration::catalog()?,
        )?;
        let repository = JournalRepository::new(database.repository_pool()?);
        let sync_client = sync::JournalSyncClient::new(reqwest::Client::new(), backend_url);

        Ok(Self {
            repository,
            sync_client,
        })
    }

    pub fn get_user(&self) -> Result<Option<User>, JournalError> {
        self.repository.get_user()
    }

    pub fn put_user(&self, user: &User) -> Result<(), JournalError> {
        self.repository.put_user(user)
    }

    pub fn get_entry(&self, id: &str) -> Result<Option<Entry>, JournalError> {
        self.repository.get_entry(id)
    }

    pub async fn get_entries(
        &self,
        page: i64,
        condition: &[QueryCondition],
        auth_token: Option<&str>,
    ) -> Result<GetEntriesResult, JournalError> {
        if condition.iter().any(|item| item.operator == "random") {
            return self
                .sync_client
                .get_entries(page, condition, auth_token)
                .await;
        }

        self.repository.get_entries(page, condition)
    }

    pub fn add_entry(&self, entry: &EntryField) -> Result<String, JournalError> {
        self.repository.add_entry(entry)
    }

    pub fn put_entry(&self, entry: &Entry) -> Result<(), JournalError> {
        self.repository.put_entry(entry)
    }

    pub fn put_entries(&self, entries: &[Entry]) -> Result<(), JournalError> {
        self.repository.put_entries(entries)
    }

    pub fn update_entry(&self, id: &str, updates: &serde_json::Value) -> Result<(), JournalError> {
        self.repository.update_entry(id, updates)
    }

    pub fn delete_entry(&self, id: &str) -> Result<(), JournalError> {
        self.repository.delete_entry(id)
    }

    pub fn soft_delete_entry(&self, id: &str) -> Result<(), JournalError> {
        self.repository.soft_delete_entry(id)
    }

    pub fn mark_entry_synced(&self, id: &str, updated_at: i64) -> Result<(), JournalError> {
        self.repository.mark_entry_synced(id, updated_at)
    }

    pub fn get_tag(&self, id: &str) -> Result<Option<Tag>, JournalError> {
        self.repository.get_tag(id)
    }

    pub fn get_all_tags(&self) -> Result<Vec<Tag>, JournalError> {
        self.repository.get_all_tags()
    }

    pub fn add_tag(&self, tag: &TagField) -> Result<String, JournalError> {
        self.repository.add_tag(tag)
    }

    pub fn put_tag(&self, tag: &Tag) -> Result<(), JournalError> {
        self.repository.put_tag(tag)
    }

    pub fn put_tags(&self, tags: &[Tag]) -> Result<(), JournalError> {
        self.repository.put_tags(tags)
    }

    pub fn update_tag(&self, id: &str, updates: &serde_json::Value) -> Result<(), JournalError> {
        self.repository.update_tag(id, updates)
    }

    pub fn delete_tag(&self, id: &str) -> Result<(), JournalError> {
        self.repository.delete_tag(id)
    }

    pub fn soft_delete_tag(&self, id: &str) -> Result<(), JournalError> {
        self.repository.soft_delete_tag(id)
    }

    pub fn mark_tag_synced(&self, id: &str, updated_at: i64) -> Result<(), JournalError> {
        self.repository.mark_tag_synced(id, updated_at)
    }

    pub fn get_tiptap(&self, id: &str) -> Result<Option<TiptapV2>, JournalError> {
        self.repository.get_tiptap(id)
    }

    pub fn add_tiptap(&self, tiptap: &TiptapV2Field) -> Result<String, JournalError> {
        self.repository.add_tiptap(tiptap)
    }

    pub fn put_tiptap(&self, tiptap: &TiptapV2) -> Result<(), JournalError> {
        self.repository.put_tiptap(tiptap)
    }

    pub fn put_tiptaps(&self, tiptaps: &[TiptapV2]) -> Result<(), JournalError> {
        self.repository.put_tiptaps(tiptaps)
    }

    pub fn sync_tiptap(&self, id: &str, content: &serde_json::Value) -> Result<(), JournalError> {
        self.repository.sync_tiptap(id, content)
    }

    pub fn update_tiptap(&self, id: &str, updates: &serde_json::Value) -> Result<(), JournalError> {
        self.repository.update_tiptap(id, updates)
    }

    pub fn delete_tiptap(&self, id: &str) -> Result<(), JournalError> {
        self.repository.delete_tiptap(id)
    }

    pub fn soft_delete_tiptap(&self, id: &str) -> Result<(), JournalError> {
        self.repository.soft_delete_tiptap(id)
    }

    pub fn mark_tiptap_synced(&self, id: &str, updated_at: i64) -> Result<(), JournalError> {
        self.repository.mark_tiptap_synced(id, updated_at)
    }

    pub fn list_tiptap_history(&self, id: &str) -> Result<Vec<i64>, JournalError> {
        self.repository.list_tiptap_history(id)
    }

    pub fn get_tiptap_history(&self, id: &str, ts: i64) -> Result<serde_json::Value, JournalError> {
        self.repository.get_tiptap_history(id, ts)
    }

    pub fn restore_tiptap_history(&self, id: &str, ts: i64) -> Result<(), JournalError> {
        self.repository.restore_tiptap_history(id, ts)
    }

    pub fn get_pending_changes(&self) -> Result<JournalData, JournalError> {
        self.repository.get_pending_changes()
    }

    pub fn get_local_data_for_sync(&self) -> Result<JournalData, JournalError> {
        self.repository.get_local_data_for_sync()
    }

    pub fn get_sync_meta(&self, key: &str) -> Result<Option<SyncMeta>, JournalError> {
        self.repository.get_sync_meta(key)
    }

    pub fn set_sync_meta(&self, key: &str, value: &serde_json::Value) -> Result<(), JournalError> {
        self.repository.set_sync_meta(key, value)
    }

    pub fn get_last_server_version(&self) -> Result<i64, JournalError> {
        self.repository.get_last_server_version()
    }

    pub fn clear_all_data(&self) -> Result<(), JournalError> {
        self.repository.clear_all_data()
    }

    pub fn get_statistic(&self, key: &str) -> Result<Option<Statistic>, JournalError> {
        self.repository.get_statistic(key)
    }

    pub fn set_statistic(&self, key: &str, value: &serde_json::Value) -> Result<(), JournalError> {
        self.repository.set_statistic(key, value)
    }

    pub fn put_statistics(&self, statistics: &[Statistic]) -> Result<(), JournalError> {
        self.repository.put_statistics(statistics)
    }

    pub async fn full_sync(
        &self,
        auth_token: Option<&str>,
    ) -> Result<serde_json::Value, JournalError> {
        self.sync_client.full_sync(auth_token).await
    }

    pub async fn push(
        &self,
        data: JournalData,
        auth_token: Option<&str>,
    ) -> Result<serde_json::Value, JournalError> {
        self.sync_client.push(data, auth_token).await
    }

    pub async fn pull(
        &self,
        version: i64,
        auth_token: Option<&str>,
    ) -> Result<serde_json::Value, JournalError> {
        self.sync_client.pull(version, auth_token).await
    }
}
