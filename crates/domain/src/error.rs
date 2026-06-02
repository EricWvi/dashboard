use thiserror::Error;

/// Enumerates domain-model conversion failures that adapters must handle explicitly.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum DomainModelError {}
