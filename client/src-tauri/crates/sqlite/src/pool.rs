use std::time::Duration;

use r2d2::{ManageConnection, Pool};
use rusqlite::Connection;

use crate::{DatabaseError, DatabaseLocation};

const BUSY_TIMEOUT_MILLIS: u64 = 5_000;

#[derive(Clone, Debug)]
pub struct RepositoryPool {
    inner: Pool<SqliteConnectionManager>,
}

impl RepositoryPool {
    pub fn new(location: &DatabaseLocation) -> Result<Self, DatabaseError> {
        let path = location.pooled_path()?.to_path_buf();
        let manager = SqliteConnectionManager { path };
        let inner = Pool::builder().build(manager)?;
        Ok(Self { inner })
    }

    pub fn with_connection<T>(
        &self,
        operation: impl FnOnce(&mut Connection) -> Result<T, DatabaseError>,
    ) -> Result<T, DatabaseError> {
        let mut connection = self.inner.get()?;
        operation(&mut connection)
    }
}

#[derive(Clone, Debug)]
struct SqliteConnectionManager {
    path: std::path::PathBuf,
}

impl ManageConnection for SqliteConnectionManager {
    type Connection = Connection;
    type Error = rusqlite::Error;

    fn connect(&self) -> Result<Self::Connection, Self::Error> {
        let connection = Connection::open(&self.path)?;
        configure_repository_connection(&connection)?;
        Ok(connection)
    }

    fn is_valid(&self, connection: &mut Self::Connection) -> Result<(), Self::Error> {
        connection.execute_batch("SELECT 1;")
    }

    fn has_broken(&self, _connection: &mut Self::Connection) -> bool {
        false
    }
}

fn configure_repository_connection(connection: &Connection) -> Result<(), rusqlite::Error> {
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.busy_timeout(Duration::from_millis(BUSY_TIMEOUT_MILLIS))?;
    connection.pragma_update(None, "synchronous", "NORMAL")?;
    Ok(())
}
