use std::path::{Path, PathBuf};

use rusqlite::{Connection, OpenFlags};

use crate::DatabaseError;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DatabaseLocation {
    Path(PathBuf),
    InMemory,
}

impl DatabaseLocation {
    pub fn path(path: impl Into<PathBuf>) -> Self {
        Self::Path(path.into())
    }

    pub fn in_memory() -> Self {
        Self::InMemory
    }

    pub fn open(&self) -> Result<Connection, DatabaseError> {
        match self {
            Self::Path(path) => Ok(Connection::open(path)?),
            Self::InMemory => Ok(Connection::open_with_flags(
                ":memory:",
                OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE,
            )?),
        }
    }

    pub(crate) fn pooled_path(&self) -> Result<&Path, DatabaseError> {
        match self {
            Self::Path(path) => Ok(path.as_path()),
            Self::InMemory => Err(DatabaseError::UnsupportedPooledLocation),
        }
    }
}
