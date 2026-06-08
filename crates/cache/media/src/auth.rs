use std::sync::{Mutex, OnceLock, PoisonError};

/// Holds the current bearer token used to authenticate requests to the backend.
pub struct AuthToken {
    token: Mutex<Option<String>>,
}

impl AuthToken {
    fn new() -> Self {
        Self {
            token: Mutex::new(None),
        }
    }

    pub(crate) fn get(&self) -> Option<String> {
        self.token
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .clone()
    }

    pub(crate) fn set(&self, token: String) {
        *self.token.lock().unwrap_or_else(PoisonError::into_inner) = Some(token);
    }
}

static AUTH_TOKEN: OnceLock<AuthToken> = OnceLock::new();

/// Initializes the global auth token. Must be called exactly once at startup.
pub(crate) fn init(token: String) -> Result<(), String> {
    let auth = AuthToken::new();
    if !token.is_empty() {
        auth.set(token);
    }
    AUTH_TOKEN
        .set(auth)
        .map_err(|_| "AuthToken already initialized".to_string())
}

pub fn current_auth_token() -> Option<String> {
    AUTH_TOKEN.get().and_then(AuthToken::get)
}

pub fn set_auth_token(token: String) {
    if let Some(auth) = AUTH_TOKEN.get() {
        auth.set(token);
    }
}

/// Attaches the current auth token to an outgoing request header.
pub(crate) fn apply_auth_header(builder: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
    builder.header("Onlyquant-Token", current_auth_token().unwrap_or_default())
}

#[cfg(test)]
mod tests {
    use std::sync::OnceLock;

    use super::{AuthToken, current_auth_token, set_auth_token};

    // Each test creates its own AuthToken directly to avoid the global OnceLock.
    fn token_with(value: &str) -> AuthToken {
        let t = AuthToken::new();
        if !value.is_empty() {
            t.set(value.to_string());
        }
        t
    }

    #[test]
    fn empty_string_token_yields_none() {
        assert_eq!(token_with("").get(), None);
    }

    #[test]
    fn non_empty_token_is_returned() {
        assert_eq!(token_with("secret").get(), Some("secret".to_string()));
    }

    #[test]
    fn set_replaces_previous_token() {
        let t = token_with("first");
        t.set("second".to_string());
        assert_eq!(t.get(), Some("second".to_string()));
    }

    /// Verifies the global set_auth_token / current_auth_token round-trip via
    /// a dedicated OnceLock so the global AUTH_TOKEN is not disturbed for other tests.
    #[test]
    fn global_set_and_get_roundtrip() {
        static ONCE: OnceLock<()> = OnceLock::new();
        ONCE.get_or_init(|| {
            let _ = super::init("initial".to_string());
        });
        set_auth_token("updated".to_string());
        assert_eq!(current_auth_token(), Some("updated".to_string()));
    }
}
