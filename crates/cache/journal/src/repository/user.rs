use only_cache_sqlite::RepositoryPool;
use only_sync_schema::UserSchemaV1;
use rusqlite::params;

use crate::{JournalError, SyncStatus};

/// Provides access to the user table backed by a shared connection pool.
pub struct UserRepository<'a> {
    pool: &'a RepositoryPool,
}

impl<'a> UserRepository<'a> {
    pub(crate) fn new(pool: &'a RepositoryPool) -> Self {
        Self { pool }
    }

    /// Inserts or replaces the user profile record with the given sync state.
    pub fn upsert(&self, user: &UserSchemaV1, sync_status: SyncStatus) -> Result<(), JournalError> {
        self.pool.with_connection(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO user \
                 (key, username, email, avatar, language, updated_at, sync_status) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    user.key,
                    user.username,
                    user.email,
                    user.avatar,
                    user.language,
                    user.updated_at,
                    sync_status as i64,
                ],
            )?;
            Ok(())
        })?;
        Ok(())
    }

    /// Returns the user with the given key, or None if it does not exist.
    pub fn find(&self, key: &str) -> Result<Option<UserSchemaV1>, JournalError> {
        Ok(self.pool.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT key, username, email, avatar, language, updated_at \
                 FROM user WHERE key = ?1",
            )?;
            let mut rows = stmt.query_map(params![key], map_row)?;
            Ok(rows.next().transpose()?)
        })?)
    }
}

fn map_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<UserSchemaV1> {
    Ok(UserSchemaV1 {
        key: row.get(0)?,
        username: row.get(1)?,
        email: row.get(2)?,
        avatar: row.get(3)?,
        language: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use crate::{JournalDb, SyncStatus};

    fn user(key: &str) -> only_sync_schema::UserSchemaV1 {
        only_sync_schema::UserSchemaV1 {
            key: key.to_string(),
            username: "alice".to_string(),
            email: "alice@example.com".to_string(),
            avatar: "https://example.com/avatar.png".to_string(),
            language: "en".to_string(),
            updated_at: 1000,
        }
    }

    #[test]
    fn upsert_and_find() {
        let db = JournalDb::in_memory().unwrap();
        let u = user("u1");
        db.user().upsert(&u, SyncStatus::Synced).unwrap();
        assert_eq!(db.user().find("u1").unwrap(), Some(u));
    }

    #[test]
    fn find_returns_none_for_missing_key() {
        let db = JournalDb::in_memory().unwrap();
        assert_eq!(db.user().find("nobody").unwrap(), None);
    }

    #[test]
    fn upsert_twice_overwrites_profile() {
        let db = JournalDb::in_memory().unwrap();
        db.user().upsert(&user("u1"), SyncStatus::Synced).unwrap();
        let mut updated = user("u1");
        updated.username = "bob".to_string();
        db.user().upsert(&updated, SyncStatus::Synced).unwrap();
        assert_eq!(db.user().find("u1").unwrap().unwrap().username, "bob");
    }
}
