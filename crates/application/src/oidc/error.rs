use thiserror::Error;

#[derive(Debug, Error)]
pub enum OidcClientError {
    #[error("token exchange request failed: {source}")]
    TokenExchange {
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("token endpoint returned status {status}: {body}")]
    TokenEndpointStatus { status: u16, body: String },

    #[error("userinfo request failed: {source}")]
    UserInfo {
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("userinfo endpoint returned status {status}: {body}")]
    UserInfoEndpointStatus { status: u16, body: String },

    #[error("failed to deserialize OIDC response: {source}")]
    Deserialize {
        source: Box<dyn std::error::Error + Send + Sync>,
    },
}
