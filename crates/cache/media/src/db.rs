use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{Result as SqliteResult, params};

/// SQLite-backed store for media content-type records and pending upload jobs.
pub struct MediaCacheDb {
    pool: Pool<SqliteConnectionManager>,
}

impl MediaCacheDb {
    pub fn new(path: &str) -> SqliteResult<Self> {
        let manager = SqliteConnectionManager::file(path).with_init(|conn| {
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "busy_timeout", "5000")?;
            conn.pragma_update(None, "synchronous", "NORMAL")?;
            Ok(())
        });
        let pool = Pool::builder()
            .max_size(8)
            .build(manager)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let db = Self { pool };
        db.run_migrations()?;
        Ok(db)
    }

    /// Creates an in-memory database with a single connection so all operations
    /// share the same SQLite state (in-memory DBs are per-connection).
    #[cfg(test)]
    pub fn new_in_memory() -> SqliteResult<Self> {
        let manager = SqliteConnectionManager::memory().with_init(|conn| {
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "synchronous", "NORMAL")?;
            Ok(())
        });
        let pool = Pool::builder()
            .max_size(1)
            .build(manager)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let db = Self { pool };
        db.run_migrations()?;
        Ok(db)
    }

    fn conn(&self) -> SqliteResult<r2d2::PooledConnection<SqliteConnectionManager>> {
        self.pool
            .get()
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
    }

    fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS media_cache (
                uuid TEXT PRIMARY KEY,
                content_type TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS media_job (
                uuid TEXT PRIMARY KEY,
                content_type TEXT NOT NULL,
                file_name TEXT NOT NULL
            );",
        )?;
        Ok(())
    }

    pub fn get_content_type(&self, uuid: &str) -> SqliteResult<Option<String>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT content_type FROM media_cache WHERE uuid = ?1")?;
        stmt.query_map(params![uuid], |row| row.get::<_, String>(0))?
            .next()
            .transpose()
    }

    pub fn set_content_type(&self, uuid: &str, content_type: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO media_cache (uuid, content_type) VALUES (?1, ?2)",
            params![uuid, content_type],
        )?;
        Ok(())
    }

    pub fn upsert_media_job(
        &self,
        uuid: &str,
        content_type: &str,
        file_name: &str,
    ) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO media_job (uuid, content_type, file_name) VALUES (?1, ?2, ?3)",
            params![uuid, content_type, file_name],
        )?;
        Ok(())
    }

    pub fn delete_media_job(&self, uuid: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM media_job WHERE uuid = ?1", params![uuid])?;
        Ok(())
    }

    pub fn list_media_jobs(&self) -> SqliteResult<Vec<(String, String, String)>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT uuid, content_type, file_name FROM media_job")?;
        stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
            .collect::<SqliteResult<Vec<_>>>()
    }
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::MediaCacheDb;

    fn db() -> MediaCacheDb {
        MediaCacheDb::new_in_memory().expect("in-memory db")
    }

    #[test]
    fn fresh_database_has_no_cached_entry() {
        assert_eq!(db().get_content_type("any-uuid").unwrap(), None);
    }

    #[test]
    fn set_and_retrieve_content_type() {
        let db = db();
        db.set_content_type("u1", "image/png").unwrap();
        assert_eq!(db.get_content_type("u1").unwrap(), Some("image/png".into()));
    }

    #[test]
    fn setting_content_type_twice_overwrites() {
        let db = db();
        db.set_content_type("u1", "image/png").unwrap();
        db.set_content_type("u1", "image/jpeg").unwrap();
        assert_eq!(
            db.get_content_type("u1").unwrap(),
            Some("image/jpeg".into())
        );
    }

    #[test]
    fn upsert_media_job_and_list() {
        let db = db();
        db.upsert_media_job("u1", "image/png", "photo.png").unwrap();
        assert_eq!(
            db.list_media_jobs().unwrap(),
            vec![("u1".into(), "image/png".into(), "photo.png".into())]
        );
    }

    #[test]
    fn delete_media_job_removes_it() {
        let db = db();
        db.upsert_media_job("u1", "image/png", "photo.png").unwrap();
        db.delete_media_job("u1").unwrap();
        assert_eq!(db.list_media_jobs().unwrap(), vec![]);
    }

    #[test]
    fn upsert_media_job_twice_overwrites() {
        let db = db();
        db.upsert_media_job("u1", "image/png", "old.png").unwrap();
        db.upsert_media_job("u1", "image/jpeg", "new.jpg").unwrap();
        assert_eq!(
            db.list_media_jobs().unwrap(),
            vec![("u1".into(), "image/jpeg".into(), "new.jpg".into())]
        );
    }

    #[test]
    fn list_on_empty_database_returns_empty() {
        assert_eq!(db().list_media_jobs().unwrap(), vec![]);
    }
}
