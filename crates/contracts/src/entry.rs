use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value;
use ts_rs::TS;

/// Carries the entry id from the URL path segment.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryPath {
    pub id: String,
}

/// Public view of a journal entry shared across all entry responses.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct EntryView {
    pub id: String,
    pub draft: Option<String>,
    pub payload: Value,
    pub word_count: i32,
    pub raw_text: String,
    pub bookmark: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Query parameters for listing entries with optional filters.
///
/// All filter fields are optional. When multiple filters are set they are combined with AND.
/// The `random` flag bypasses pagination and returns a randomised sample.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct ListEntriesRequest {
    /// 1-indexed page number. Defaults to 1.
    #[serde(default = "default_page")]
    pub page: u32,
    /// Filter entries whose `payload.tags` array contains this tag name.
    pub tag: Option<String>,
    /// Case-insensitive full-text search on the `raw_text` field.
    pub contains: Option<String>,
    /// Filter entries whose `payload.location` array starts with these path components in order.
    /// Passed as a comma-separated string in query params: `location=A,B,C`.
    #[serde(default, deserialize_with = "deserialize_csv")]
    pub location: Vec<String>,
    /// When `true`, only return bookmarked entries.
    pub bookmarked: Option<bool>,
    /// When `true`, return a random sample instead of paginated results.
    pub random: Option<bool>,
    /// Return only entries created on this calendar date (YYYY-MM-DD, local time).
    pub on: Option<String>,
    /// Return only entries created before the next calendar date, which includes this day
    /// (YYYY-MM-DD, local time).
    pub before: Option<String>,
    /// When `true`, return entries from the same calendar day (month + day) in any year.
    pub today: Option<bool>,
}

fn default_page() -> u32 {
    1
}

/// Deserializes a comma-separated string into `Vec<String>`.
///
/// An absent or empty string produces an empty vec. Handles both plain query-param strings
/// (from serde_urlencoded) and JSON string values so the same struct works for both
/// GET query params and POST JSON bodies.
fn deserialize_csv<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let opt = Option::<String>::deserialize(deserializer)?;
    Ok(match opt {
        None => vec![],
        Some(s) if s.is_empty() => vec![],
        Some(s) => s.split(',').map(str::to_owned).collect(),
    })
}

/// Returns a page of entries with an indicator of whether more pages exist.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct ListEntriesResponse {
    pub entries: Vec<EntryView>,
    pub has_more: bool,
}

/// Carries the fields required to create a new journal entry.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct CreateEntryRequest {
    pub draft: Option<String>,
    pub payload: Value,
    pub word_count: i32,
    pub raw_text: String,
}

/// Returns the created entry after a successful create.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct CreateEntryResponse {
    pub entry: EntryView,
}

/// Identifies a single entry to fetch.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct GetEntryRequest {
    pub id: String,
}

/// Returns a single entry by id.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct GetEntryResponse {
    pub entry: EntryView,
}

/// Carries the replacement payload for an entry update.
///
/// The `id` field comes from the URL path on the backend; the generated SDK strips
/// it from the JSON body and interpolates it into the path.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct UpdateEntryRequest {
    /// Path parameter — populated from the URL on the backend.
    #[serde(default)]
    pub id: String,
    pub draft: Option<String>,
    pub payload: Value,
    pub word_count: i32,
    pub raw_text: String,
    pub bookmark: bool,
}

/// Returns the updated entry after a successful update.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct UpdateEntryResponse {
    pub entry: EntryView,
}

/// Identifies the entry to soft-delete.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct DeleteEntryRequest {
    pub id: String,
}

/// Returns the deleted entry id.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct DeleteEntryResponse {
    pub id: String,
}

/// Sets `bookmark = true` on the identified entry.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct BookmarkEntryRequest {
    pub id: String,
}

/// Confirms the entry was bookmarked.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct BookmarkEntryResponse {}

/// Sets `bookmark = false` on the identified entry.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct UnbookmarkEntryRequest {
    pub id: String,
}

/// Confirms the entry was unbookmarked.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct UnbookmarkEntryResponse {}

/// A single day's entry count within the current-year activity heatmap.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct DailyCount {
    pub date: String,
    pub count: i32,
}

/// Returns the current-year activity heatmap and total entry count.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct GetCurrentYearResponse {
    pub activity: Vec<DailyCount>,
    pub count: i32,
}

/// Query parameters for counting entries, optionally filtered to a specific year.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct GetEntriesCountRequest {
    pub year: Option<i32>,
}

/// Returns the count of entries matching the optional year filter.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct GetEntriesCountResponse {
    pub count: i64,
}

/// A single month within a year entry, holding the days that contain at least one entry.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct MonthEntry {
    pub month: i32,
    pub days: Vec<i32>,
}

/// A single year in the hierarchical entry-date structure.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct YearEntry {
    pub year: i32,
    pub months: Vec<MonthEntry>,
}

/// Returns the hierarchical date structure (year → month → days) and total entry count.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct GetEntryDatesResponse {
    pub total: i32,
    pub entry_dates: Vec<YearEntry>,
}

/// Returns the total word count across all non-deleted entries.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "entry.ts")]
pub struct GetWordsCountResponse {
    pub count: i64,
}
