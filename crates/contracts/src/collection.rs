use serde::{Deserialize, Serialize};

/// Public view of a collection shared across all collection responses.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionView {
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Public view of a todo item shared across all todo list responses.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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

/// Carries the fields required to create a new collection.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCollectionRequest {
    pub name: String,
}

/// Returns the created collection after a successful create request.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCollectionResponse {
    pub collection: CollectionView,
}

/// Returns a single collection after a successful fetch.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetCollectionResponse {
    pub collection: CollectionView,
}

/// Returns all visible collections for the authenticated user.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCollectionsResponse {
    pub collections: Vec<CollectionView>,
}

/// Carries the replacement payload for a collection update.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCollectionRequest {
    pub name: String,
}

/// Returns the updated collection after a successful update.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCollectionResponse {
    pub collection: CollectionView,
}

/// Returns the deleted collection id after a successful delete.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteCollectionResponse {
    pub id: String,
}

/// Returns all incomplete, non-inbox todos that have a schedule set.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAllTodosResponse {
    pub todos: Vec<TodoView>,
}

/// Returns todos scheduled for today.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTodayTodosResponse {
    pub todos: Vec<TodoView>,
}

/// Carries the todo IDs to schedule for today.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanTodayRequest {
    pub ids: Vec<String>,
}

/// Confirms that the plan-today operation completed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanTodayResponse {}
