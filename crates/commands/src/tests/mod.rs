mod entry;
mod stats;
mod tag;
mod tiptap;

use only_cache_journal::{EntrySchemaV1, JournalDb, SyncStatus};
use only_logging::clock;
use serde_json::Value;
use time::{Date, PrimitiveDateTime, Time};

use crate::JournalCommands;

pub fn make_db() -> JournalCommands {
    JournalCommands::new(JournalDb::in_memory().unwrap())
}

/// Builds a millisecond UTC timestamp that, when interpreted by SQLite's `localtime`,
/// corresponds to `hour:minute:00` on `date` in the system's local timezone.
pub fn local_ts(date: Date, hour: u8, minute: u8) -> i64 {
    PrimitiveDateTime::new(date, Time::from_hms(hour, minute, 0).unwrap())
        .assume_offset(clock::local_offset())
        .unix_timestamp_nanos() as i64
        / 1_000_000
}

/// Builds an EntrySchemaV1 for direct DB seeding in tests that need controlled timestamps.
pub fn make_entry(
    id: &str,
    created_at: i64,
    word_count: i32,
    raw_text: &str,
    payload: Value,
    bookmark: bool,
) -> EntrySchemaV1 {
    EntrySchemaV1 {
        id: id.to_string(),
        draft: None,
        payload,
        word_count,
        raw_text: raw_text.to_string(),
        bookmark,
        created_at,
        updated_at: created_at,
        is_deleted: false,
    }
}

/// Seeds entries directly into the DB with controlled timestamps and returns a JournalCommands.
pub fn seed_entries(entries: Vec<EntrySchemaV1>) -> JournalCommands {
    let db = JournalDb::in_memory().unwrap();
    for entry in &entries {
        db.entries().upsert(entry, SyncStatus::Pending).unwrap();
    }
    JournalCommands::new(db)
}
