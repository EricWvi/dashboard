use axum::extract::FromRequestParts;
use axum::http::StatusCode;
use axum::http::request::Parts;
use axum::response::{IntoResponse, Response};

/// Identifies which application surface a request belongs to.
///
/// Extracted from the `Only-App` request header. Resolves to the numeric `site` code
/// and logical `group` name used internally, so handlers and application-layer code never
/// need to parse the header themselves.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppContext {
    Dashboard,
    Journal,
    Flomo,
}

impl AppContext {
    /// Returns the numeric site code stored on the database record.
    pub fn site(self) -> i16 {
        match self {
            Self::Dashboard => 1,
            Self::Journal => 2,
            Self::Flomo => 3,
        }
    }

    /// Returns the logical group name stored on the database record.
    pub fn group(self) -> &'static str {
        match self {
            Self::Dashboard => "dashboard",
            Self::Journal => "journal",
            Self::Flomo => "flomo",
        }
    }
}

/// Rejection returned when the `Only-App` header is missing or unrecognised.
pub struct AppContextRejection;

impl IntoResponse for AppContextRejection {
    fn into_response(self) -> Response {
        (
            StatusCode::BAD_REQUEST,
            "missing or invalid Only-App header; expected: dashboard, journal, flomo",
        )
            .into_response()
    }
}

impl<S> FromRequestParts<S> for AppContext
where
    S: Send + Sync,
{
    type Rejection = AppContextRejection;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let value = parts
            .headers
            .get("Only-App")
            .and_then(|v| v.to_str().ok())
            .ok_or(AppContextRejection)?;

        match value {
            "dashboard" => Ok(Self::Dashboard),
            "journal" => Ok(Self::Journal),
            "flomo" => Ok(Self::Flomo),
            _ => Err(AppContextRejection),
        }
    }
}
