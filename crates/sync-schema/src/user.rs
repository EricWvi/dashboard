use serde::{Deserialize, Serialize};

/// Wire representation of the authenticated user's profile, version 1.
///
/// Creator identity is resolved server-side from the auth token.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UserSchemaV1 {
    pub key: String,
    pub username: String,
    pub email: String,
    pub avatar: String,
    pub language: String,
    pub updated_at: i64,
}
