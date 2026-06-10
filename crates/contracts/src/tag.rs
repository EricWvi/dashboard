use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Public view of a user-defined label.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tag.ts")]
pub struct TagView {
    pub id: String,
    pub name: String,
    pub group: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Requests batch creation of tags under a logical group.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tag.ts")]
pub struct CreateTagsRequest {
    pub tags: Vec<String>,
    pub group: String,
}

/// Confirms the batch create completed.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tag.ts")]
pub struct CreateTagsResponse {}

/// Requests all tag names for a given group.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tag.ts")]
pub struct ListTagsRequest {
    pub group: String,
}

/// Returns all tag names within the requested group.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tag.ts")]
pub struct ListTagsResponse {
    pub tags: Vec<TagView>,
}

/// Identifies the tag to soft-delete by name and group.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tag.ts")]
pub struct DeleteTagRequest {
    pub name: String,
    pub group: String,
}

/// Confirms the tag was deleted.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "tag.ts")]
pub struct DeleteTagResponse {}
