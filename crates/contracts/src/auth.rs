use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Query parameters received on the OIDC authorization code callback.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "auth.ts")]
pub struct AuthQuery {
    pub code: String,
    pub redirect_uri: String,
}

/// Response body returned after a successful OIDC token exchange.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "auth.ts")]
pub struct AuthResponse {
    pub token: String,
}
