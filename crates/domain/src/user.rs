use crate::UserId;
use serde::{Deserialize, Serialize};

/// Represents a registered user account with profile and integration settings.
/// Unlike v2 sync entities, users are not soft-deleted and have no `created_at` column.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct User {
    pub id: UserId,
    pub email: String,
    pub updated_at: i64,
    pub server_version: i64,
    pub avatar: String,
    pub username: String,
    pub rss_token: String,
    pub email_token: String,
    pub email_feed: String,
    pub language: String,
}

impl User {
    /// Creates a user snapshot together with its persistence-managed sync version.
    pub fn new(
        id: UserId,
        email: impl Into<String>,
        updated_at: i64,
        server_version: i64,
        avatar: impl Into<String>,
        username: impl Into<String>,
        rss_token: impl Into<String>,
        email_token: impl Into<String>,
        email_feed: impl Into<String>,
        language: impl Into<String>,
    ) -> Self {
        Self {
            id,
            email: email.into(),
            updated_at,
            server_version,
            avatar: avatar.into(),
            username: username.into(),
            rss_token: rss_token.into(),
            email_token: email_token.into(),
            email_feed: email_feed.into(),
            language: language.into(),
        }
    }
}
