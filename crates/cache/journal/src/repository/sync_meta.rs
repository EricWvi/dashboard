use only_cache_sqlite::RepositoryPool;
use rusqlite::params;

use crate::JournalError;

/// Provides get/set access to the sync_meta key-value table.
/// Used to persist sync cursors and other state that must survive process restarts.
pub struct SyncMetaRepository<'a> {
    pool: &'a RepositoryPool,
}

impl<'a> SyncMetaRepository<'a> {
    pub(crate) fn new(pool: &'a RepositoryPool) -> Self {
        Self { pool }
    }

    /// Returns the value stored for key, or None if no entry exists.
    pub fn get(&self, key: &str) -> Result<Option<String>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare("SELECT value FROM sync_meta WHERE key = ?1")?;
            let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0))?;
            Ok(rows.next().transpose()?)
        })?)
    }

    /// Inserts or replaces the value for the given key.
    pub fn set(&self, key: &str, value: &str) -> Result<(), JournalError> {
        self.pool.with_connection(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?1, ?2)",
                params![key, value],
            )?;
            Ok(())
        })?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use crate::JournalDb;

    #[test]
    fn get_returns_none_for_missing_key() {
        let db = JournalDb::in_memory().unwrap();
        assert_eq!(db.sync_meta().get("cursor").unwrap(), None);
    }

    #[test]
    fn set_and_get_roundtrip() {
        let db = JournalDb::in_memory().unwrap();
        db.sync_meta().set("cursor", "abc123").unwrap();
        assert_eq!(
            db.sync_meta().get("cursor").unwrap(),
            Some("abc123".to_string())
        );
    }

    #[test]
    fn set_twice_overwrites_value() {
        let db = JournalDb::in_memory().unwrap();
        db.sync_meta().set("cursor", "first").unwrap();
        db.sync_meta().set("cursor", "second").unwrap();
        assert_eq!(
            db.sync_meta().get("cursor").unwrap(),
            Some("second".to_string())
        );
    }
}
