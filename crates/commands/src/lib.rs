mod entry;
mod error;
mod tag;
mod tiptap;

pub use error::CommandError;
pub use only_cache_journal::EntryFilter;
use only_cache_journal::JournalDb;

pub struct JournalCommands {
    db: JournalDb,
}

impl JournalCommands {
    pub fn new(db: JournalDb) -> Self {
        Self { db }
    }
}
