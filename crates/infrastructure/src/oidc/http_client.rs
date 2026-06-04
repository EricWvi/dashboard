use only_application::{OidcClient, OidcClientError, TokenResponse, UserInfo};
use reqwest::Client;

use crate::oidc::HttpOidcClientConfig;

pub struct HttpOidcClient {
    http: Client,
    config: HttpOidcClientConfig,
}

impl HttpOidcClient {
    pub fn new(config: HttpOidcClientConfig) -> Self {
        Self {
            http: Client::new(),
            config,
        }
    }
}

impl OidcClient for HttpOidcClient {
    async fn exchange_code(
        &self,
        code: &str,
        redirect_uri: &str,
    ) -> Result<TokenResponse, OidcClientError> {
        let params = [
            ("grant_type", "authorization_code"),
            ("code", code),
            ("client_id", self.config.client_id.as_str()),
            ("client_secret", self.config.client_secret.as_str()),
            ("redirect_uri", redirect_uri),
        ];

        let resp = self
            .http
            .post(&self.config.token_endpoint)
            .form(&params)
            .send()
            .await
            .map_err(|e| OidcClientError::TokenExchange {
                source: Box::new(e),
            })?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(OidcClientError::TokenEndpointStatus { status, body });
        }

        resp.json::<TokenResponse>()
            .await
            .map_err(|e| OidcClientError::Deserialize {
                source: Box::new(e),
            })
    }

    async fn get_user_info(&self, access_token: &str) -> Result<UserInfo, OidcClientError> {
        let resp = self
            .http
            .get(&self.config.userinfo_endpoint)
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| OidcClientError::UserInfo {
                source: Box::new(e),
            })?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let body = resp.text().await.unwrap_or_default();
            return Err(OidcClientError::UserInfoEndpointStatus { status, body });
        }

        resp.json::<UserInfo>()
            .await
            .map_err(|e| OidcClientError::Deserialize {
                source: Box::new(e),
            })
    }
}
