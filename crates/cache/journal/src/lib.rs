mod error;
mod migration;
mod repository;
mod sync_status;

pub use error::JournalError;
pub use only_sync_schema::{
    EntrySchemaV1, HistoryEntryV1, TagSchemaV1, TiptapSchemaV1, UserSchemaV1,
};
pub use repository::{
    EntryFilter, EntryRepository, SyncMetaRepository, TagRepository, TiptapRepository,
    UserRepository,
};
pub use sync_status::SyncStatus;

use only_cache_sqlite::{RepositoryPool, SystemTimestampSource};

/// SQLite-backed journal database. Owns the connection pool and provides typed repository access.
pub struct JournalDb {
    pool: RepositoryPool,
}

impl JournalDb {
    /// Opens a file-backed journal database, running any pending migrations before returning.
    pub fn new(path: &std::path::Path) -> Result<Self, JournalError> {
        let pool = RepositoryPool::new(path)?;
        pool.bootstrap(&migration::journal_catalog()?, &SystemTimestampSource)?;
        Ok(Self { pool })
    }

    /// Opens a single-connection in-memory database for tests.
    #[cfg(any(test, feature = "test-utils"))]
    pub fn in_memory() -> Result<Self, JournalError> {
        let pool = RepositoryPool::in_memory()?;
        pool.bootstrap(&migration::journal_catalog()?, &SystemTimestampSource)?;
        Ok(Self { pool })
    }

    /// Returns a repository scoped to the entries table.
    pub fn entries(&self) -> EntryRepository<'_> {
        EntryRepository::new(&self.pool)
    }

    /// Returns a repository scoped to the tags table.
    pub fn tags(&self) -> TagRepository<'_> {
        TagRepository::new(&self.pool)
    }

    /// Returns a repository scoped to the tiptaps table.
    pub fn tiptaps(&self) -> TiptapRepository<'_> {
        TiptapRepository::new(&self.pool)
    }

    /// Returns a repository scoped to the user table.
    pub fn user(&self) -> UserRepository<'_> {
        UserRepository::new(&self.pool)
    }

    /// Returns a repository scoped to the sync_meta key-value table.
    pub fn sync_meta(&self) -> SyncMetaRepository<'_> {
        SyncMetaRepository::new(&self.pool)
    }
}
