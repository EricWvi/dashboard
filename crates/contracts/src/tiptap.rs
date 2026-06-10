use serde::{Deserialize, Serialize};
use serde_json::Value;
use ts_rs::TS;

/// Carries the tiptap document id from the URL path segment.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TiptapPath {
    pub id: String,
}

/// Carries the quick note id from the URL path segment.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickNotePath {
    pub id: String,
}

/// A single snapshot in the tiptap document edit history.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct HistoryEntryView {
    pub time: i64,
    pub content: Value,
}

/// Public view of a Tiptap rich-text document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct TiptapView {
    pub id: String,
    /// Numeric code identifying the owning surface (entry, quicknote, blog, etc.).
    pub site: i16,
    pub content: Value,
    pub history: Vec<HistoryEntryView>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Carries the fields required to create a new Tiptap document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct CreateTiptapRequest {
    pub site: i16,
    pub content: Value,
}

/// Returns the created Tiptap document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct CreateTiptapResponse {
    pub tiptap: TiptapView,
}

/// Identifies a single Tiptap document to fetch.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct GetTiptapRequest {
    pub id: String,
}

/// Returns a single Tiptap document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct GetTiptapResponse {
    pub tiptap: TiptapView,
}

/// Replaces the content of a Tiptap document.
///
/// The backend atomically backs up the existing content into the `history` array before
/// saving the new content. `ts` is stored as the new `updated_at` millisecond timestamp.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct UpdateTiptapRequest {
    /// Path parameter — populated from the URL on the backend.
    #[serde(default)]
    pub id: String,
    pub content: Value,
    /// New `updated_at` timestamp in milliseconds since epoch.
    pub ts: i64,
}

/// Confirms the Tiptap document was updated.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct UpdateTiptapResponse {}

/// Requests the edit history timestamps for a Tiptap document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct ListTiptapHistoryRequest {
    pub id: String,
}

/// Returns the list of history entry timestamps in descending order.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct ListTiptapHistoryResponse {
    pub history: Vec<i64>,
}

/// Restores a Tiptap document to a previously saved history snapshot.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct RestoreTiptapHistoryRequest {
    /// Path parameter — populated from the URL on the backend.
    #[serde(default)]
    pub id: String,
    /// Timestamp of the history entry to restore.
    pub ts: i64,
}

/// Confirms the history snapshot was restored.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct RestoreTiptapHistoryResponse {}

// ── Quick Note ────────────────────────────────────────────────────────────────

/// Public view of a quick note (dashboard model).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct QuickNoteView {
    pub id: String,
    pub title: String,
    pub draft: Option<String>,
    pub order: Option<i32>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Carries the fields required to create a new quick note.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct CreateQuickNoteRequest {
    pub title: String,
    pub draft: Option<String>,
}

/// Returns the created quick note with its server-assigned display order.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct CreateQuickNoteResponse {
    pub quick_note: QuickNoteView,
}

/// Requests all quick notes for the authenticated user.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct ListQuickNotesRequest {}

/// Returns all quick notes ordered by display order descending.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct ListQuickNotesResponse {
    pub quick_notes: Vec<QuickNoteView>,
}

/// Carries the replacement payload for a quick note update.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct UpdateQuickNoteRequest {
    /// Path parameter — populated from the URL on the backend.
    #[serde(default)]
    pub id: String,
    pub title: String,
    pub draft: Option<String>,
    pub order: Option<i32>,
}

/// Confirms the quick note was updated.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct UpdateQuickNoteResponse {}

/// Identifies the quick note to soft-delete.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct DeleteQuickNoteRequest {
    pub id: String,
}

/// Returns the deleted quick note id.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct DeleteQuickNoteResponse {
    pub id: String,
}

/// Moves a quick note to the bottom of the display order.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct BottomQuickNoteRequest {
    pub id: String,
}

/// Confirms the quick note was moved to the bottom.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tiptap.ts")]
pub struct BottomQuickNoteResponse {}
