mod entry;
mod error;
mod stats;
mod tag;
#[cfg(test)]
mod tests;
mod tiptap;

pub use error::CommandError;
pub use only_cache_journal::EntryFilter;
use only_cache_journal::JournalDb;
pub use stats::{DailyCount, EntryMonthEntry, EntryYearEntry};

pub struct JournalCommands {
    db: JournalDb,
}

impl JournalCommands {
    pub fn new(db: JournalDb) -> Self {
        Self { db }
    }
}
