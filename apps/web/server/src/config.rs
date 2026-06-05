use only_infrastructure::MinioConfig;
use only_logging::LogLevel;

use crate::error::WebBootstrapError;

pub const ENCRYPT_KEY_VAR: &str = "DASHBOARD_ENCRYPT_KEY";

const DB_HOST_VAR: &str = "DASHBOARD_DB_HOST";
const DB_PORT_VAR: &str = "DASHBOARD_DB_PORT";
const DB_NAME_VAR: &str = "DASHBOARD_DB_NAME";
const DB_USERNAME_VAR: &str = "DASHBOARD_DB_USERNAME";
const DB_PASSWORD_VAR: &str = "DASHBOARD_DB_PASSWORD";

const DEFAULT_DB_PORT: &str = "5432";

const LOG_LEVEL_VAR: &str = "DASHBOARD_LOG_LEVEL";
const DEFAULT_LOG_LEVEL: &str = "info";

const ENDPOINT_VAR: &str = "DASHBOARD_MINIO_ENDPOINT";
const BUCKET_VAR: &str = "DASHBOARD_MINIO_BUCKET";
const ACCESS_KEY_VAR: &str = "DASHBOARD_MINIO_ACCESS_KEY_ID";
const SECRET_KEY_VAR: &str = "DASHBOARD_MINIO_SECRET_KEY";
const USE_SSL_VAR: &str = "DASHBOARD_MINIO_USE_SSL";
const PRESIGN_EXPIRY_VAR: &str = "DASHBOARD_MINIO_PRESIGN_EXPIRY";

const DEFAULT_USE_SSL: &str = "true";
const DEFAULT_PRESIGN_EXPIRY: &str = "160h";

/// Runtime configuration read from environment variables for the MinIO object store.
#[derive(Debug)]
pub struct MinioRuntimeConfig {
    pub endpoint: String,
    pub bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub use_ssl: bool,
    pub presign_expiry: std::time::Duration,
}

impl MinioRuntimeConfig {
    /// Reads configuration from the process environment.
    pub fn from_env() -> Result<Self, WebBootstrapError> {
        Self::from_reader(|key| std::env::var(key).ok())
    }

    /// Reads configuration from a caller-supplied variable reader, enabling test isolation.
    pub fn from_reader(
        mut read_var: impl FnMut(&str) -> Option<String>,
    ) -> Result<Self, WebBootstrapError> {
        let endpoint = required_non_empty(
            &mut read_var,
            ENDPOINT_VAR,
            WebBootstrapError::MinioEndpointEmpty,
        )?;
        let bucket = required_non_empty(
            &mut read_var,
            BUCKET_VAR,
            WebBootstrapError::MinioBucketEmpty,
        )?;
        let access_key_id = required_non_empty(
            &mut read_var,
            ACCESS_KEY_VAR,
            WebBootstrapError::MinioAccessKeyIdEmpty,
        )?;
        let secret_access_key = required_non_empty(
            &mut read_var,
            SECRET_KEY_VAR,
            WebBootstrapError::MinioSecretKeyEmpty,
        )?;

        let use_ssl_raw = read_var(USE_SSL_VAR).unwrap_or_else(|| DEFAULT_USE_SSL.to_string());
        let use_ssl = match use_ssl_raw.to_ascii_lowercase().as_str() {
            "true" => true,
            "false" => false,
            _ => {
                return Err(WebBootstrapError::MinioUseSslInvalid { value: use_ssl_raw });
            }
        };

        let expiry_raw =
            read_var(PRESIGN_EXPIRY_VAR).unwrap_or_else(|| DEFAULT_PRESIGN_EXPIRY.to_string());
        let presign_expiry = humantime::parse_duration(&expiry_raw).map_err(|source| {
            WebBootstrapError::MinioPresignExpiryInvalid {
                value: expiry_raw.clone(),
                source,
            }
        })?;

        Ok(Self {
            endpoint,
            bucket,
            access_key_id,
            secret_access_key,
            use_ssl,
            presign_expiry,
        })
    }

    /// Converts this runtime config into the infrastructure-layer `MinioConfig`.
    pub fn into_infra_config(self) -> MinioConfig {
        MinioConfig {
            endpoint: self.endpoint,
            bucket: self.bucket,
            access_key_id: self.access_key_id,
            secret_access_key: self.secret_access_key,
            use_ssl: self.use_ssl,
            presign_expiry: self.presign_expiry,
        }
    }
}

fn required_non_empty(
    read_var: &mut impl FnMut(&str) -> Option<String>,
    key: &str,
    err: WebBootstrapError,
) -> Result<String, WebBootstrapError> {
    match read_var(key) {
        Some(v) if !v.trim().is_empty() => Ok(v),
        _ => Err(err),
    }
}

/// Runtime configuration for the PostgreSQL database connection.
#[derive(Debug)]
pub struct DatabaseRuntimeConfig {
    host: String,
    port: u16,
    name: String,
    username: String,
    password: String,
}

impl DatabaseRuntimeConfig {
    /// Reads configuration from the process environment.
    pub fn from_env() -> Result<Self, WebBootstrapError> {
        Self::from_reader(|key| std::env::var(key).ok())
    }

    /// Reads configuration from a caller-supplied variable reader, enabling test isolation.
    pub fn from_reader(
        mut read_var: impl FnMut(&str) -> Option<String>,
    ) -> Result<Self, WebBootstrapError> {
        let host = required_non_empty(
            &mut read_var,
            DB_HOST_VAR,
            WebBootstrapError::DatabaseHostEmpty,
        )?;
        let name = required_non_empty(
            &mut read_var,
            DB_NAME_VAR,
            WebBootstrapError::DatabaseNameEmpty,
        )?;
        let username = required_non_empty(
            &mut read_var,
            DB_USERNAME_VAR,
            WebBootstrapError::DatabaseUsernameEmpty,
        )?;
        let password = required_non_empty(
            &mut read_var,
            DB_PASSWORD_VAR,
            WebBootstrapError::DatabasePasswordEmpty,
        )?;

        let port_raw = read_var(DB_PORT_VAR).unwrap_or_else(|| DEFAULT_DB_PORT.to_string());
        let port =
            port_raw
                .parse::<u16>()
                .map_err(|source| WebBootstrapError::DatabasePortInvalid {
                    value: port_raw.clone(),
                    source,
                })?;

        Ok(Self {
            host,
            port,
            name,
            username,
            password,
        })
    }

    /// Builds a libpq-compatible PostgreSQL connection URL from the configured fields.
    pub fn connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.username, self.password, self.host, self.port, self.name
        )
    }
}

/// Reads the log level from the process environment.
pub fn read_log_level() -> Result<LogLevel, WebBootstrapError> {
    read_log_level_from_reader(|key| std::env::var(key).ok())
}

fn read_log_level_from_reader(
    mut read_var: impl FnMut(&str) -> Option<String>,
) -> Result<LogLevel, WebBootstrapError> {
    let raw = read_var(LOG_LEVEL_VAR).unwrap_or_else(|| DEFAULT_LOG_LEVEL.to_string());
    match raw.to_ascii_lowercase().as_str() {
        "debug" => Ok(LogLevel::Debug),
        "info" => Ok(LogLevel::Info),
        "warn" => Ok(LogLevel::Warn),
        "error" => Ok(LogLevel::Error),
        _ => Err(WebBootstrapError::LogLevelInvalid { value: raw }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    fn all_vars(key: &str) -> Option<String> {
        match key {
            ENDPOINT_VAR => Some("play.min.io".to_string()),
            BUCKET_VAR => Some("my-bucket".to_string()),
            ACCESS_KEY_VAR => Some("access-key".to_string()),
            SECRET_KEY_VAR => Some("secret-key".to_string()),
            _ => None,
        }
    }

    /// Verifies that all required fields must be present.
    #[test]
    fn rejects_missing_endpoint() {
        let err = MinioRuntimeConfig::from_reader(|_| None).unwrap_err();
        assert!(matches!(err, WebBootstrapError::MinioEndpointEmpty));
    }

    /// Verifies that blank endpoint values are rejected.
    #[test]
    fn rejects_blank_endpoint() {
        let err = MinioRuntimeConfig::from_reader(|key| match key {
            ENDPOINT_VAR => Some("   ".to_string()),
            _ => None,
        })
        .unwrap_err();
        assert!(matches!(err, WebBootstrapError::MinioEndpointEmpty));
    }

    /// Verifies defaults for use_ssl and presign_expiry when not set.
    #[test]
    fn applies_defaults_for_optional_fields() {
        let config = MinioRuntimeConfig::from_reader(all_vars).unwrap();
        assert_eq!(config.use_ssl, true);
        assert_eq!(
            config.presign_expiry,
            humantime::parse_duration(DEFAULT_PRESIGN_EXPIRY).unwrap()
        );
    }

    /// Verifies SSL flag parsing for both values.
    #[test]
    fn parses_use_ssl_flag() {
        let true_config = MinioRuntimeConfig::from_reader(|key| match key {
            USE_SSL_VAR => Some("false".to_string()),
            _ => all_vars(key),
        })
        .unwrap();
        assert_eq!(true_config.use_ssl, false);
    }

    /// Verifies invalid SSL flag is rejected.
    #[test]
    fn rejects_invalid_use_ssl_value() {
        let err = MinioRuntimeConfig::from_reader(|key| match key {
            USE_SSL_VAR => Some("yes".to_string()),
            _ => all_vars(key),
        })
        .unwrap_err();
        assert!(matches!(
            err,
            WebBootstrapError::MinioUseSslInvalid { value } if value == "yes"
        ));
    }

    /// Verifies custom presign expiry is parsed correctly.
    #[test]
    fn parses_custom_presign_expiry() {
        let config = MinioRuntimeConfig::from_reader(|key| match key {
            PRESIGN_EXPIRY_VAR => Some("24h".to_string()),
            _ => all_vars(key),
        })
        .unwrap();
        assert_eq!(
            config.presign_expiry,
            humantime::parse_duration("24h").unwrap()
        );
    }

    /// Verifies invalid presign expiry is rejected.
    #[test]
    fn rejects_invalid_presign_expiry() {
        let err = MinioRuntimeConfig::from_reader(|key| match key {
            PRESIGN_EXPIRY_VAR => Some("not-a-duration".to_string()),
            _ => all_vars(key),
        })
        .unwrap_err();
        assert!(matches!(
            err,
            WebBootstrapError::MinioPresignExpiryInvalid { value, .. } if value == "not-a-duration"
        ));
    }
}
