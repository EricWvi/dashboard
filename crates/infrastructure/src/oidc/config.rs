/// Configuration required to instantiate an `HttpOidcClient`.
pub struct HttpOidcClientConfig {
    /// Full URL of the OIDC token endpoint, e.g. `https://auth.example.com/token`.
    pub token_endpoint: String,
    /// Full URL of the OIDC userinfo endpoint, e.g. `https://auth.example.com/userinfo`.
    pub userinfo_endpoint: String,
    pub client_id: String,
    pub client_secret: String,
}
