use only_cache_journal::{EntryFilter, SyncStatus};
use only_contracts::EntryView;
use only_logging::clock;
use only_sync_schema::EntrySchemaV1;
use serde_json::Value;
use uuid::Uuid;

use crate::{CommandError, JournalCommands};

const PAGE_SIZE: usize = 8;

fn schema_to_view(e: EntrySchemaV1) -> EntryView {
    EntryView {
        id: e.id,
        draft: e.draft,
        payload: e.payload,
        word_count: e.word_count,
        raw_text: e.raw_text,
        bookmark: e.bookmark,
        created_at: e.created_at,
        updated_at: e.updated_at,
    }
}

impl JournalCommands {
    /// Returns the entry with the given id, or None if it does not exist or has been deleted.
    pub fn get_entry(&self, id: &str) -> Result<Option<EntryView>, CommandError> {
        Ok(self
            .db
            .entries()
            .find_by_id(id)?
            .filter(|e| !e.is_deleted)
            .map(schema_to_view))
    }

    /// Returns a page of non-deleted entries matching the filter, ordered by creation time
    /// descending, along with a flag indicating whether more pages exist.
    pub fn list_entries(
        &self,
        filter: &EntryFilter,
        page: u32,
    ) -> Result<(Vec<EntryView>, bool), CommandError> {
        let all = self.db.entries().list(filter)?;
        let page = page.max(1) as usize;
        let start = (page - 1) * PAGE_SIZE;
        let has_more = start + PAGE_SIZE < all.len();
        let entries = all
            .into_iter()
            .skip(start)
            .take(PAGE_SIZE)
            .map(schema_to_view)
            .collect();
        Ok((entries, has_more))
    }

    /// Returns non-deleted entries whose raw_text matches the FTS5 `query`,
    /// further filtered by `filter`, ordered by creation time descending.
    pub fn search_entries(
        &self,
        query: &str,
        filter: &EntryFilter,
    ) -> Result<Vec<EntryView>, CommandError> {
        Ok(self
            .db
            .entries()
            .search(query, filter)?
            .into_iter()
            .map(schema_to_view)
            .collect())
    }

    /// Creates a new entry and returns its generated id.
    pub fn add_entry(
        &self,
        draft: Option<String>,
        payload: Value,
        word_count: i32,
        raw_text: String,
    ) -> Result<String, CommandError> {
        let now = clock::now_millis();
        let id = Uuid::new_v4().to_string();
        let entry = EntrySchemaV1 {
            id: id.clone(),
            draft,
            payload,
            word_count,
            raw_text,
            bookmark: false,
            created_at: now,
            updated_at: now,
            is_deleted: false,
        };
        self.db.entries().upsert(&entry, SyncStatus::Pending)?;
        Ok(id)
    }

    /// Replaces the content fields of an existing entry. Returns NotFound if absent.
    pub fn update_entry(
        &self,
        id: &str,
        draft: Option<String>,
        payload: Value,
        word_count: i32,
        raw_text: String,
    ) -> Result<(), CommandError> {
        let mut entry = self
            .db
            .entries()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        entry.draft = draft;
        entry.payload = payload;
        entry.word_count = word_count;
        entry.raw_text = raw_text;
        entry.updated_at = clock::now_millis();
        self.db.entries().upsert(&entry, SyncStatus::Pending)?;
        Ok(())
    }

    /// Marks an entry as bookmarked. Returns NotFound if absent.
    pub fn bookmark_entry(&self, id: &str) -> Result<(), CommandError> {
        let mut entry = self
            .db
            .entries()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        entry.bookmark = true;
        entry.updated_at = clock::now_millis();
        self.db.entries().upsert(&entry, SyncStatus::Pending)?;
        Ok(())
    }

    /// Clears the bookmark on an entry. Returns NotFound if absent.
    pub fn unbookmark_entry(&self, id: &str) -> Result<(), CommandError> {
        let mut entry = self
            .db
            .entries()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        entry.bookmark = false;
        entry.updated_at = clock::now_millis();
        self.db.entries().upsert(&entry, SyncStatus::Pending)?;
        Ok(())
    }

    /// Soft-deletes an entry. Returns NotFound if absent.
    pub fn delete_entry(&self, id: &str) -> Result<(), CommandError> {
        let mut entry = self
            .db
            .entries()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        entry.is_deleted = true;
        entry.updated_at = clock::now_millis();
        self.db.entries().upsert(&entry, SyncStatus::Pending)?;
        Ok(())
    }
}
