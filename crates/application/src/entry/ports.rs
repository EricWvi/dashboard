use std::future::Future;

use only_domain::{Entry, EntryId};

use crate::entry::error::EntryRepositoryError;

/// A single day's entry count returned by the current-year activity query.
pub struct DailyCount {
    pub date: String,
    pub count: i32,
}

/// The year, month, and day components of an entry's creation date.
pub struct DateParts {
    pub year: i32,
    pub month: i32,
    pub day: i32,
}

/// Optional filter criteria for paginated entry listing.
///
/// All fields are additive (AND-combined). When none are set, all visible entries are returned.
pub struct EntryFilter {
    /// Restrict to entries whose `payload.tags` JSONB array contains this tag name.
    pub tag: Option<String>,
    /// Case-insensitive substring match on `raw_text`.
    pub contains: Option<String>,
    /// When `Some(true)`, restrict to bookmarked entries.
    pub bookmarked: Option<bool>,
    /// Restrict to entries whose `payload.location` array starts with these path components
    /// in order. Each element must match the corresponding index exactly.
    pub location: Vec<String>,
    /// Restrict to entries created on this calendar date (YYYY-MM-DD, local time).
    pub on: Option<String>,
    /// Restrict to entries created before the next calendar date, which includes this day
    /// (YYYY-MM-DD, local time).
    pub before: Option<String>,
    /// When `true`, restrict to entries from the same calendar day (month + day) in any year.
    pub today: bool,
}

/// Persistence contract for journal entry operations.
///
/// Implementations must operate against the `d_entry_v2` table and must exclude
/// soft-deleted rows (`is_deleted = true`) from all reads.
pub trait EntryRepository: Send + Sync {
    /// Inserts a new entry and returns the stored snapshot.
    fn create(
        &self,
        entry: Entry,
    ) -> impl Future<Output = Result<Entry, EntryRepositoryError>> + Send;

    /// Loads one visible entry matching both id and creator.
    fn find_by_id_and_creator(
        &self,
        id: &EntryId,
        creator_id: i32,
    ) -> impl Future<Output = Result<Option<Entry>, EntryRepositoryError>> + Send;

    /// Returns a page of entries matching the filter, plus a flag indicating whether
    /// more pages exist. `page` is 1-indexed.
    fn list(
        &self,
        creator_id: i32,
        filter: &EntryFilter,
        page: u32,
    ) -> impl Future<Output = Result<(Vec<Entry>, bool), EntryRepositoryError>> + Send;

    /// Returns a random sample of entries (simplified spaced-repetition selection).
    fn list_random(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<Vec<Entry>, EntryRepositoryError>> + Send;

    /// Replaces all mutable entry fields and returns the updated snapshot.
    /// Returns `None` when no matching live entry exists for the given creator.
    fn update(
        &self,
        entry: Entry,
    ) -> impl Future<Output = Result<Option<Entry>, EntryRepositoryError>> + Send;

    /// Soft-deletes one entry by id and creator; returns `true` if a row was affected.
    fn soft_delete(
        &self,
        id: &EntryId,
        creator_id: i32,
        deleted_at: i64,
    ) -> impl Future<Output = Result<bool, EntryRepositoryError>> + Send;

    /// Sets the `bookmark` flag on the identified entry; returns `true` if a row was affected.
    fn set_bookmark(
        &self,
        id: &EntryId,
        creator_id: i32,
        bookmark: bool,
        updated_at: i64,
    ) -> impl Future<Output = Result<bool, EntryRepositoryError>> + Send;

    /// Returns the total word count across all non-deleted entries for the creator.
    fn count_words(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<i64, EntryRepositoryError>> + Send;

    /// Returns per-day entry counts for the current calendar year, ordered by date ascending.
    fn count_current_year(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<Vec<DailyCount>, EntryRepositoryError>> + Send;

    /// Returns distinct year/month/day date groups for all non-deleted entries,
    /// ordered year DESC, month DESC, day DESC.
    fn list_dates(
        &self,
        creator_id: i32,
    ) -> impl Future<Output = Result<Vec<DateParts>, EntryRepositoryError>> + Send;

    /// Returns the count of non-deleted entries, optionally restricted to a specific year.
    fn count_by_year(
        &self,
        creator_id: i32,
        year: Option<i32>,
    ) -> impl Future<Output = Result<i64, EntryRepositoryError>> + Send;
}
