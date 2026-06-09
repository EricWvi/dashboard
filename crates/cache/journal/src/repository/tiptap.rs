use only_cache_sqlite::RepositoryPool;
use only_sync_schema::TiptapSchemaV1;
use rusqlite::params;

use crate::{JournalError, SyncStatus};

/// Provides CRUD access to the tiptaps table backed by a shared connection pool.
pub struct TiptapRepository<'a> {
    pool: &'a RepositoryPool,
}

impl<'a> TiptapRepository<'a> {
    pub(crate) fn new(pool: &'a RepositoryPool) -> Self {
        Self { pool }
    }

    /// Inserts or replaces a tiptap document record with the given sync state.
    pub fn upsert(
        &self,
        tiptap: &TiptapSchemaV1,
        sync_status: SyncStatus,
    ) -> Result<(), JournalError> {
        let content = serde_json::to_string(&tiptap.content)?;
        let history = serde_json::to_string(&tiptap.history)?;
        self.pool.with_connection(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO tiptaps \
                 (id, content, history, created_at, updated_at, is_deleted, sync_status) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    tiptap.id,
                    content,
                    history,
                    tiptap.created_at,
                    tiptap.updated_at,
                    tiptap.is_deleted as i64,
                    sync_status as i64,
                ],
            )?;
            Ok(())
        })?;
        Ok(())
    }

    /// Returns the tiptap document with the given id, or None if it does not exist.
    pub fn find_by_id(&self, id: &str) -> Result<Option<TiptapSchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, content, history, created_at, updated_at, is_deleted \
                 FROM tiptaps WHERE id = ?1",
            )?;
            let mut rows = stmt.query_map(params![id], map_row)?;
            Ok(rows.next().transpose()?)
        })?)
    }

    /// Returns all non-deleted tiptap documents.
    pub fn list(&self) -> Result<Vec<TiptapSchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, content, history, created_at, updated_at, is_deleted \
                 FROM tiptaps WHERE is_deleted = 0",
            )?;
            Ok(stmt
                .query_map([], map_row)?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }

    /// Returns all tiptap documents (including deleted) with the given sync state.
    pub fn list_by_sync_status(
        &self,
        sync_status: SyncStatus,
    ) -> Result<Vec<TiptapSchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, content, history, created_at, updated_at, is_deleted \
                 FROM tiptaps WHERE sync_status = ?1",
            )?;
            Ok(stmt
                .query_map(params![sync_status as i64], map_row)?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }

    /// Updates the sync state of a single tiptap document identified by id.
    pub fn update_sync_status(
        &self,
        id: &str,
        sync_status: SyncStatus,
    ) -> Result<(), JournalError> {
        self.pool.with_connection(|conn| {
            conn.execute(
                "UPDATE tiptaps SET sync_status = ?1 WHERE id = ?2",
                params![sync_status as i64, id],
            )?;
            Ok(())
        })?;
        Ok(())
    }
}

fn json_from_str<T: serde::de::DeserializeOwned>(s: &str) -> rusqlite::Result<T> {
    serde_json::from_str(s).map_err(|e| {
        rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e))
    })
}

fn map_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TiptapSchemaV1> {
    let content_str: String = row.get(1)?;
    let history_str: String = row.get(2)?;
    Ok(TiptapSchemaV1 {
        id: row.get(0)?,
        content: json_from_str(&content_str)?,
        history: json_from_str(&history_str)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
        is_deleted: row.get::<_, i64>(5)? != 0,
    })
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;
    use serde_json::json;

    use crate::{JournalDb, SyncStatus};

    fn tiptap(id: &str) -> only_sync_schema::TiptapSchemaV1 {
        only_sync_schema::TiptapSchemaV1 {
            id: id.to_string(),
            content: json!({}),
            history: vec![],
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
        }
    }

    #[test]
    fn upsert_and_find_by_id() {
        let db = JournalDb::in_memory().unwrap();
        let t = tiptap("tip1");
        db.tiptaps().upsert(&t, SyncStatus::Synced).unwrap();
        assert_eq!(db.tiptaps().find_by_id("tip1").unwrap(), Some(t));
    }

    #[test]
    fn find_by_id_returns_none_for_missing() {
        let db = JournalDb::in_memory().unwrap();
        assert_eq!(db.tiptaps().find_by_id("none").unwrap(), None);
    }
}
