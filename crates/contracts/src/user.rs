use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Public projection of a user account exposed to frontend consumers.
///
/// Excludes server-internal fields (id, rss_token, email_token, email_feed).
/// `language` is a raw string on the wire; the frontend layer narrows it to the
/// `UserLang` union type.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "user.ts")]
pub struct UserView {
    pub username: String,
    pub email: String,
    pub avatar: String,
    pub language: String,
    pub updated_at: i64,
}

/// Request to fetch the authenticated user's profile.
///
/// Identity is resolved from the `Onlyquant-Token` header; no body is needed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "user.ts")]
pub struct GetUserRequest {}

/// Response carrying the authenticated user's profile.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "user.ts")]
pub struct GetUserResponse {
    pub user: UserView,
}

/// Request to update the authenticated user's mutable profile fields.
///
/// All three fields are required; send the current value for fields that should not change.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "user.ts")]
pub struct UpdateUserRequest {
    pub username: String,
    pub avatar: String,
    pub language: String,
}

/// Response carrying the user's profile after the update has been applied.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "user.ts")]
pub struct UpdateUserResponse {
    pub user: UserView,
}
