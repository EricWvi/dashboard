use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

/// Response body returned after a successful media upload.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "media.ts")]
pub struct UploadResponse {
    pub photos: Vec<String>,
}

/// Request body for the batch media delete endpoint.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "media.ts")]
pub struct DeleteMediaRequest {
    pub ids: Vec<Uuid>,
}

/// Response body returned after a successful batch media delete.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "media.ts")]
pub struct DeleteMediaResponse {
    pub ids: Vec<Uuid>,
}
