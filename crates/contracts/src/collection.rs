use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Carries the collection id from the URL path segment.
///
/// Used as an axum `Path<>` extractor for routes that need the collection id but
/// do not derive a full frontend request type (e.g. update, where id comes from
/// the path and the body carries the remaining fields separately).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionPath {
    pub id: String,
}

/// Public view of a collection shared across all collection responses.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct CollectionView {
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Public view of a todo item shared across all todo list responses.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct TodoView {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub collection_id: Option<String>,
    pub difficulty: Option<i32>,
    pub order: Option<i32>,
    pub link: Option<String>,
    pub draft: Option<String>,
    pub schedule: Option<i64>,
    pub done: bool,
    pub count: i32,
    pub kanban: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Requests the visible collection list for the authenticated user.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct ListCollectionsRequest {}

/// Returns all visible collections for the authenticated user.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct ListCollectionsResponse {
    pub collections: Vec<CollectionView>,
}

/// Carries the fields required to create a new collection.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct CreateCollectionRequest {
    pub name: String,
}

/// Returns the created collection after a successful create request.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct CreateCollectionResponse {
    pub collection: CollectionView,
}

/// Identifies which collection to fetch.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct GetCollectionRequest {
    pub id: String,
}

/// Returns a single collection after a successful fetch.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct GetCollectionResponse {
    pub collection: CollectionView,
}

/// Carries the replacement payload for a collection update.
///
/// The `id` field is the path parameter; it is present in the frontend request type
/// so the generated SDK can build the URL, but the SDK strips it from the JSON body
/// before sending. The backend reads `id` from the URL path instead.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct UpdateCollectionRequest {
    /// Path parameter — populated from the URL on the backend; stripped from the JSON body by the SDK.
    #[serde(default)]
    pub id: String,
    pub name: String,
}

/// Returns the updated collection after a successful update.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct UpdateCollectionResponse {
    pub collection: CollectionView,
}

/// Identifies which collection to delete.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct DeleteCollectionRequest {
    pub id: String,
}

/// Returns the deleted collection id after a successful delete.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct DeleteCollectionResponse {
    pub id: String,
}

/// Requests all incomplete, non-inbox todos that have a schedule set.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct ListAllTodosRequest {}

/// Returns all incomplete, non-inbox todos that have a schedule set.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct ListAllTodosResponse {
    pub todos: Vec<TodoView>,
}

/// Requests todos scheduled for the current local day.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct ListTodayTodosRequest {}

/// Returns todos scheduled for today.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct ListTodayTodosResponse {
    pub todos: Vec<TodoView>,
}

/// Carries the todo IDs to schedule for today.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct PlanTodayRequest {
    pub ids: Vec<String>,
}

/// Confirms that the plan-today operation completed.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "collection.ts")]
pub struct PlanTodayResponse {}
