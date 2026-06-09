use only_cache_sqlite::RepositoryPool;
use only_sync_schema::TagSchemaV1;
use rusqlite::params;

use crate::{JournalError, SyncStatus};

/// Provides CRUD access to the tags table backed by a shared connection pool.
pub struct TagRepository<'a> {
    pool: &'a RepositoryPool,
}

impl<'a> TagRepository<'a> {
    pub(crate) fn new(pool: &'a RepositoryPool) -> Self {
        Self { pool }
    }

    /// Inserts or replaces a tag record with the given sync state.
    pub fn upsert(&self, tag: &TagSchemaV1, sync_status: SyncStatus) -> Result<(), JournalError> {
        self.pool.with_connection(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO tags \
                 (id, name, created_at, updated_at, is_deleted, sync_status) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    tag.id,
                    tag.name,
                    tag.created_at,
                    tag.updated_at,
                    tag.is_deleted as i64,
                    sync_status as i64,
                ],
            )?;
            Ok(())
        })?;
        Ok(())
    }

    /// Returns the tag with the given id, or None if it does not exist.
    pub fn find_by_id(&self, id: &str) -> Result<Option<TagSchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, created_at, updated_at, is_deleted \
                 FROM tags WHERE id = ?1",
            )?;
            let mut rows = stmt.query_map(params![id], map_row)?;
            Ok(rows.next().transpose()?)
        })?)
    }

    /// Returns all non-deleted tags ordered by creation time ascending.
    pub fn list(&self) -> Result<Vec<TagSchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, created_at, updated_at, is_deleted \
                 FROM tags WHERE is_deleted = 0 ORDER BY created_at ASC",
            )?;
            Ok(stmt
                .query_map([], map_row)?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }

    /// Returns all tags (including deleted) with the given sync state.
    pub fn list_by_sync_status(
        &self,
        sync_status: SyncStatus,
    ) -> Result<Vec<TagSchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, created_at, updated_at, is_deleted \
                 FROM tags WHERE sync_status = ?1",
            )?;
            Ok(stmt
                .query_map(params![sync_status as i64], map_row)?
                .collect::<Result<Vec<_>, _>>()?)
        })?)
    }

    /// Updates the sync state of a single tag identified by id.
    pub fn update_sync_status(
        &self,
        id: &str,
        sync_status: SyncStatus,
    ) -> Result<(), JournalError> {
        self.pool.with_connection(|conn| {
            conn.execute(
                "UPDATE tags SET sync_status = ?1 WHERE id = ?2",
                params![sync_status as i64, id],
            )?;
            Ok(())
        })?;
        Ok(())
    }
}

fn map_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TagSchemaV1> {
    Ok(TagSchemaV1 {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
        updated_at: row.get(3)?,
        is_deleted: row.get::<_, i64>(4)? != 0,
    })
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use crate::{JournalDb, SyncStatus};

    fn tag(id: &str) -> only_sync_schema::TagSchemaV1 {
        only_sync_schema::TagSchemaV1 {
            id: id.to_string(),
            name: format!("tag-{id}"),
            created_at: 1000,
            updated_at: 1000,
            is_deleted: false,
        }
    }

    #[test]
    fn upsert_and_find_by_id() {
        let db = JournalDb::in_memory().unwrap();
        let t = tag("t1");
        db.tags().upsert(&t, SyncStatus::Synced).unwrap();
        assert_eq!(db.tags().find_by_id("t1").unwrap(), Some(t));
    }

    #[test]
    fn list_excludes_deleted_tags() {
        let db = JournalDb::in_memory().unwrap();
        db.tags().upsert(&tag("t1"), SyncStatus::Synced).unwrap();
        let mut deleted = tag("t2");
        deleted.is_deleted = true;
        db.tags().upsert(&deleted, SyncStatus::Synced).unwrap();
        let ids: Vec<_> = db
            .tags()
            .list()
            .unwrap()
            .into_iter()
            .map(|t| t.id)
            .collect();
        assert_eq!(ids, vec!["t1"]);
    }
}
