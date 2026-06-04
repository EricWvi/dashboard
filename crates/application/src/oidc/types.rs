use serde::{Deserialize, Serialize};

/// Response from a successful OIDC token endpoint exchange.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    /// Some OIDC providers and flows omit the id_token field.
    #[serde(default)]
    pub id_token: String,
}

/// Claims returned by the OIDC userinfo endpoint.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UserInfo {
    pub sub: String,
    pub email: String,
    #[serde(default)]
    pub email_verified: bool,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub preferred_username: String,
}
