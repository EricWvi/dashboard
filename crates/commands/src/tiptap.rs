use only_logging::clock;
use only_sync_schema::{HistoryEntryV1, TiptapSchemaV1};
use serde_json::Value;
use uuid::Uuid;

use crate::{CommandError, JournalCommands};

impl JournalCommands {
    /// Returns the tiptap document with the given id, or None if it does not exist.
    pub fn get_tiptap(&self, id: &str) -> Result<Option<TiptapSchemaV1>, CommandError> {
        Ok(self.db.tiptaps().find_by_id(id)?)
    }

    /// Returns all non-deleted tiptap documents.
    pub fn list_tiptaps(&self) -> Result<Vec<TiptapSchemaV1>, CommandError> {
        Ok(self.db.tiptaps().list()?)
    }

    /// Creates a new tiptap document and returns its generated id.
    pub fn add_tiptap(&self, content: Value) -> Result<String, CommandError> {
        let now = clock::now_millis();
        let id = Uuid::new_v4().to_string();
        let tiptap = TiptapSchemaV1 {
            id: id.clone(),
            content,
            history: vec![],
            created_at: now,
            updated_at: now,
            is_deleted: false,
        };
        self.db
            .tiptaps()
            .upsert(&tiptap, only_cache_journal::SyncStatus::Pending)?;
        Ok(id)
    }

    /// Replaces the content of an existing tiptap document, snapshotting the previous content
    /// into history before overwriting. Returns NotFound if the document does not exist.
    pub fn update_tiptap(&self, id: &str, content: Value) -> Result<(), CommandError> {
        let mut tiptap = self
            .db
            .tiptaps()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        let snapshot = HistoryEntryV1 {
            time: tiptap.updated_at,
            content: tiptap.content,
        };
        tiptap.history.insert(0, snapshot);
        tiptap.content = content;
        tiptap.updated_at = clock::now_millis();
        self.db
            .tiptaps()
            .upsert(&tiptap, only_cache_journal::SyncStatus::Pending)?;
        Ok(())
    }

    /// Returns the history timestamps for a tiptap document ordered ascending.
    pub fn list_tiptap_history(&self, id: &str) -> Result<Vec<i64>, CommandError> {
        let tiptap = self
            .db
            .tiptaps()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        let mut timestamps: Vec<i64> = tiptap.history.iter().map(|h| h.time).collect();
        timestamps.sort_unstable();
        Ok(timestamps)
    }

    /// Returns the content snapshot at the given timestamp. Returns NotFound if the timestamp
    /// does not exist in the history.
    pub fn get_tiptap_history(&self, id: &str, ts: i64) -> Result<Value, CommandError> {
        let tiptap = self
            .db
            .tiptaps()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        tiptap
            .history
            .into_iter()
            .find(|h| h.time == ts)
            .map(|h| h.content)
            .ok_or_else(|| CommandError::NotFound(format!("{id}@{ts}")))
    }

    /// Restores a tiptap document to a historical snapshot, saving the current content to history
    /// first. Returns NotFound if the document or timestamp does not exist.
    pub fn restore_tiptap_history(&self, id: &str, ts: i64) -> Result<(), CommandError> {
        let mut tiptap = self
            .db
            .tiptaps()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        let snapshot_content = tiptap
            .history
            .iter()
            .find(|h| h.time == ts)
            .map(|h| h.content.clone())
            .ok_or_else(|| CommandError::NotFound(format!("{id}@{ts}")))?;
        let current_snapshot = HistoryEntryV1 {
            time: tiptap.updated_at,
            content: tiptap.content,
        };
        tiptap.history.insert(0, current_snapshot);
        tiptap.content = snapshot_content;
        tiptap.updated_at = clock::now_millis();
        self.db
            .tiptaps()
            .upsert(&tiptap, only_cache_journal::SyncStatus::Pending)?;
        Ok(())
    }

    /// Soft-deletes a tiptap document. Returns NotFound if absent.
    pub fn delete_tiptap(&self, id: &str) -> Result<(), CommandError> {
        let mut tiptap = self
            .db
            .tiptaps()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        tiptap.is_deleted = true;
        tiptap.updated_at = clock::now_millis();
        self.db
            .tiptaps()
            .upsert(&tiptap, only_cache_journal::SyncStatus::Pending)?;
        Ok(())
    }
}
