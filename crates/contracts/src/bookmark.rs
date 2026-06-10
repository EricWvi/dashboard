use serde::{Deserialize, Serialize};
use serde_json::Value;
use ts_rs::TS;

/// Carries the bookmark id from the URL path segment.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkPath {
    pub id: String,
}

/// Public view of a saved URL bookmark (dashboard model).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct BookmarkView {
    pub id: String,
    pub url: String,
    pub title: String,
    pub click: i32,
    pub domain: String,
    pub payload: Value,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Carries the fields required to create a new bookmark.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct CreateBookmarkRequest {
    pub url: String,
    pub title: String,
    pub domain: String,
    pub payload: Value,
}

/// Returns the created bookmark.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct CreateBookmarkResponse {
    pub bookmark: BookmarkView,
}

/// Identifies a single bookmark to fetch.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct GetBookmarkRequest {
    pub id: String,
}

/// Returns a single bookmark.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct GetBookmarkResponse {
    pub bookmark: BookmarkView,
}

/// Requests all bookmarks for the authenticated user.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct ListBookmarksRequest {}

/// Returns all bookmarks for the authenticated user.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct ListBookmarksResponse {
    pub bookmarks: Vec<BookmarkView>,
}

/// Carries the replacement payload for a bookmark update.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct UpdateBookmarkRequest {
    /// Path parameter — populated from the URL on the backend.
    #[serde(default)]
    pub id: String,
    pub url: String,
    pub title: String,
    pub domain: String,
    pub payload: Value,
}

/// Returns the updated bookmark.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct UpdateBookmarkResponse {
    pub bookmark: BookmarkView,
}

/// Identifies the bookmark to soft-delete.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct DeleteBookmarkRequest {
    pub id: String,
}

/// Returns the deleted bookmark id.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct DeleteBookmarkResponse {
    pub id: String,
}

/// Increments the click counter on the identified bookmark.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct ClickBookmarkRequest {
    pub id: String,
}

/// Confirms the click was recorded.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "bookmark.ts")]
pub struct ClickBookmarkResponse {}
