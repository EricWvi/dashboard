use std::future::Future;

use crate::oidc::{OidcClientError, TokenResponse, UserInfo};

/// HTTP client abstraction for the OIDC authorization code flow.
///
/// Implementations must be thread-safe and intended for use behind an `Arc`.
/// The `Arc<C>` blanket impl below ensures callers can share a single client
/// across async tasks without re-wrapping.
pub trait OidcClient: Send + Sync {
    fn exchange_code(
        &self,
        code: &str,
        redirect_uri: &str,
    ) -> impl Future<Output = Result<TokenResponse, OidcClientError>> + Send;

    fn get_user_info(
        &self,
        access_token: &str,
    ) -> impl Future<Output = Result<UserInfo, OidcClientError>> + Send;
}

impl<C: OidcClient + ?Sized> OidcClient for std::sync::Arc<C> {
    fn exchange_code(
        &self,
        code: &str,
        redirect_uri: &str,
    ) -> impl Future<Output = Result<TokenResponse, OidcClientError>> + Send {
        (**self).exchange_code(code, redirect_uri)
    }

    fn get_user_info(
        &self,
        access_token: &str,
    ) -> impl Future<Output = Result<UserInfo, OidcClientError>> + Send {
        (**self).get_user_info(access_token)
    }
}
