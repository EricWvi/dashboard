use only_cache_sqlite::RepositoryPool;
use only_sync_schema::EntrySchemaV1;
use rusqlite::params;

use crate::{JournalError, SyncStatus};

/// Provides CRUD access to the entries table backed by a shared connection pool.
pub struct EntryRepository<'a> {
    pool: &'a RepositoryPool,
}

impl<'a> EntryRepository<'a> {
    pub(crate) fn new(pool: &'a RepositoryPool) -> Self {
        Self { pool }
    }

    /// Inserts or replaces an entry record with the given sync state.
    pub fn upsert(
        &self,
        entry: &EntrySchemaV1,
        sync_status: SyncStatus,
    ) -> Result<(), JournalError> {
        let draft = entry.draft.as_deref().unwrap_or("");
        let payload = serde_json::to_string(&entry.payload)?;
        self.pool.with_connection(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO entries \
                 (id, draft, payload, word_count, raw_text, bookmark, \
                  created_at, updated_at, is_deleted, sync_status) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    entry.id,
                    draft,
                    payload,
                    entry.word_count,
                    entry.raw_text,
                    entry.bookmark as i64,
                    entry.created_at,
                    entry.updated_at,
                    entry.is_deleted as i64,
                    sync_status as i64,
                ],
            )?;
            Ok(())
        })?;
        Ok(())
    }

    /// Returns the entry with the given id, or None if it does not exist.
    pub fn find_by_id(&self, id: &str) -> Result<Option<EntrySchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, draft, payload, word_count, raw_text, bookmark, \
                 created_at, updated_at, is_deleted \
                 FROM entries WHERE id = ?1",
            )?;
            let mut rows = stmt.query_map(params![id], map_row)?;
            Ok(rows.next().transpose()?)
        })?)
    }

    /// Returns all non-deleted entries ordered by creation time descending.
    pub fn list(&self) -> Result<Vec<EntrySchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, draft, payload, word_count, raw_text, bookmark, \
                 created_at, updated_at, is_deleted \
                 FROM entries WHERE is_deleted = 0 ORDER BY created_at DESC",
            )?;
            Ok(stmt
                .query_map([], map_row)?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }

    /// Returns all entries (including deleted) with the given sync state.
    pub fn list_by_sync_status(
        &self,
        sync_status: SyncStatus,
    ) -> Result<Vec<EntrySchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, draft, payload, word_count, raw_text, bookmark, \
                 created_at, updated_at, is_deleted \
                 FROM entries WHERE sync_status = ?1",
            )?;
            Ok(stmt
                .query_map(params![sync_status as i64], map_row)?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }

    /// Updates the sync state of a single entry identified by id.
    pub fn update_sync_status(
        &self,
        id: &str,
        sync_status: SyncStatus,
    ) -> Result<(), JournalError> {
        self.pool.with_connection(|conn| {
            conn.execute(
                "UPDATE entries SET sync_status = ?1 WHERE id = ?2",
                params![sync_status as i64, id],
            )?;
            Ok(())
        })?;
        Ok(())
    }

    /// Returns entries whose raw_text matches the FTS5 trigram query.
    pub fn search(&self, query: &str) -> Result<Vec<EntrySchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT e.id, e.draft, e.payload, e.word_count, e.raw_text, e.bookmark, \
                 e.created_at, e.updated_at, e.is_deleted \
                 FROM entries e \
                 JOIN entries_fts f ON e.id = f.id \
                 WHERE entries_fts MATCH ?1 AND e.is_deleted = 0 \
                 ORDER BY e.created_at DESC",
            )?;
            Ok(stmt
                .query_map(params![query], map_row)?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }
}

fn json_from_str<T: serde::de::DeserializeOwned>(s: &str) -> rusqlite::Result<T> {
    serde_json::from_str(s).map_err(|e| {
        rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e))
    })
}

fn map_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<EntrySchemaV1> {
    let draft: String = row.get(1)?;
    let payload_str: String = row.get(2)?;
    Ok(EntrySchemaV1 {
        id: row.get(0)?,
        draft: if draft.is_empty() { None } else { Some(draft) },
        payload: json_from_str(&payload_str)?,
        word_count: row.get::<_, i32>(3)?,
        raw_text: row.get(4)?,
        bookmark: row.get::<_, i64>(5)? != 0,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
        is_deleted: row.get::<_, i64>(8)? != 0,
    })
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;
    use serde_json::json;

    use crate::{JournalDb, SyncStatus};

    fn entry(id: &str, created_at: i64) -> only_sync_schema::EntrySchemaV1 {
        only_sync_schema::EntrySchemaV1 {
            id: id.to_string(),
            draft: None,
            payload: json!({}),
            word_count: 3,
            raw_text: "hello world test".to_string(),
            bookmark: false,
            created_at,
            updated_at: created_at,
            is_deleted: false,
        }
    }

    #[test]
    fn upsert_and_find_by_id() {
        let db = JournalDb::in_memory().unwrap();
        let e = entry("e1", 1000);
        db.entries().upsert(&e, SyncStatus::Synced).unwrap();
        assert_eq!(db.entries().find_by_id("e1").unwrap(), Some(e));
    }

    #[test]
    fn find_by_id_returns_none_for_missing_entry() {
        let db = JournalDb::in_memory().unwrap();
        assert_eq!(db.entries().find_by_id("missing").unwrap(), None);
    }

    #[test]
    fn list_excludes_deleted_entries() {
        let db = JournalDb::in_memory().unwrap();
        db.entries()
            .upsert(&entry("e1", 1000), SyncStatus::Synced)
            .unwrap();
        let mut deleted = entry("e2", 2000);
        deleted.is_deleted = true;
        db.entries().upsert(&deleted, SyncStatus::Synced).unwrap();
        let ids: Vec<_> = db
            .entries()
            .list()
            .unwrap()
            .into_iter()
            .map(|e| e.id)
            .collect();
        assert_eq!(ids, vec!["e1"]);
    }

    #[test]
    fn upsert_twice_overwrites_entry() {
        let db = JournalDb::in_memory().unwrap();
        db.entries()
            .upsert(&entry("e1", 1000), SyncStatus::Synced)
            .unwrap();
        let mut updated = entry("e1", 1000);
        updated.word_count = 99;
        db.entries().upsert(&updated, SyncStatus::Synced).unwrap();
        assert_eq!(
            db.entries().find_by_id("e1").unwrap().unwrap().word_count,
            99
        );
    }

    #[test]
    fn list_by_sync_status_filters_correctly() {
        let db = JournalDb::in_memory().unwrap();
        db.entries()
            .upsert(&entry("e1", 1000), SyncStatus::Synced)
            .unwrap();
        db.entries()
            .upsert(&entry("e2", 2000), SyncStatus::Pending)
            .unwrap();
        let ids: Vec<_> = db
            .entries()
            .list_by_sync_status(SyncStatus::Pending)
            .unwrap()
            .into_iter()
            .map(|e| e.id)
            .collect();
        assert_eq!(ids, vec!["e2"]);
    }

    #[test]
    fn search_finds_entries_by_raw_text() {
        let db = JournalDb::in_memory().unwrap();
        db.entries()
            .upsert(&entry("e1", 1000), SyncStatus::Synced)
            .unwrap();
        let results = db.entries().search("hello").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "e1");
    }
}
