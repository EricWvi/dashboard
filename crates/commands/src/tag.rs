use only_logging::clock;
use only_sync_schema::TagSchemaV1;
use uuid::Uuid;

use crate::{CommandError, JournalCommands};

impl JournalCommands {
    /// Returns the tag with the given id, or None if it does not exist or has been deleted.
    pub fn get_tag(&self, id: &str) -> Result<Option<TagSchemaV1>, CommandError> {
        Ok(self.db.tags().find_by_id(id)?.filter(|t| !t.is_deleted))
    }

    /// Returns all non-deleted tags ordered by creation time ascending.
    pub fn list_tags(&self) -> Result<Vec<TagSchemaV1>, CommandError> {
        Ok(self.db.tags().list()?)
    }

    /// Creates a new tag with the given name and returns its generated id.
    pub fn add_tag(&self, name: String) -> Result<String, CommandError> {
        let now = clock::now_millis();
        let id = Uuid::new_v4().to_string();
        let tag = TagSchemaV1 {
            id: id.clone(),
            name,
            created_at: now,
            updated_at: now,
            is_deleted: false,
        };
        self.db
            .tags()
            .upsert(&tag, only_cache_journal::SyncStatus::Pending)?;
        Ok(id)
    }

    /// Renames a tag by id. Returns NotFound if the tag does not exist.
    pub fn rename_tag(&self, id: &str, name: String) -> Result<(), CommandError> {
        let mut tag = self
            .db
            .tags()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        tag.name = name;
        tag.updated_at = clock::now_millis();
        self.db
            .tags()
            .upsert(&tag, only_cache_journal::SyncStatus::Pending)?;
        Ok(())
    }

    /// Soft-deletes a tag by id. Returns NotFound if the tag does not exist.
    pub fn delete_tag(&self, id: &str) -> Result<(), CommandError> {
        let mut tag = self
            .db
            .tags()
            .find_by_id(id)?
            .ok_or_else(|| CommandError::NotFound(id.to_string()))?;
        tag.is_deleted = true;
        tag.updated_at = clock::now_millis();
        self.db
            .tags()
            .upsert(&tag, only_cache_journal::SyncStatus::Pending)?;
        Ok(())
    }
}
