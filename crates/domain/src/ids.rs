use serde::{Deserialize, Serialize};
use std::fmt::{self, Display, Formatter};

macro_rules! define_uuid_id {
    ($name:ident, $doc:literal) => {
        #[doc = $doc]
        #[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
        pub struct $name(String);

        impl $name {
            pub fn new(value: impl Into<String>) -> Self {
                Self(value.into())
            }
        }

        impl AsRef<str> for $name {
            fn as_ref(&self) -> &str {
                &self.0
            }
        }

        impl Display for $name {
            fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
                f.write_str(&self.0)
            }
        }

        #[cfg(feature = "sqlx")]
        impl<'q> sqlx::Encode<'q, sqlx::Postgres> for $name {
            fn encode_by_ref(
                &self,
                buf: &mut <sqlx::Postgres as sqlx::Database>::ArgumentBuffer,
            ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
                <&str as sqlx::Encode<sqlx::Postgres>>::encode_by_ref(&&self.0[..], buf)
            }
        }

        #[cfg(feature = "sqlx")]
        impl<'r> sqlx::Decode<'r, sqlx::Postgres> for $name {
            fn decode(
                value: <sqlx::Postgres as sqlx::Database>::ValueRef<'r>,
            ) -> Result<Self, sqlx::error::BoxDynError> {
                let s = <String as sqlx::Decode<sqlx::Postgres>>::decode(value)?;
                Ok(Self(s))
            }
        }

        #[cfg(feature = "sqlx")]
        impl sqlx::Type<sqlx::Postgres> for $name {
            fn type_info() -> <sqlx::Postgres as sqlx::Database>::TypeInfo {
                <str as sqlx::Type<sqlx::Postgres>>::type_info()
            }
        }
    };
}

macro_rules! define_int_id {
    ($name:ident, $inner:ty, $doc:literal) => {
        #[doc = $doc]
        #[derive(
            Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize,
        )]
        pub struct $name($inner);

        impl $name {
            pub fn new(value: $inner) -> Self {
                Self(value)
            }

            pub fn value(self) -> $inner {
                self.0
            }
        }

        impl Display for $name {
            fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
                write!(f, "{}", self.0)
            }
        }

        #[cfg(feature = "sqlx")]
        impl<'q> sqlx::Encode<'q, sqlx::Postgres> for $name {
            fn encode_by_ref(
                &self,
                buf: &mut <sqlx::Postgres as sqlx::Database>::ArgumentBuffer,
            ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
                <$inner as sqlx::Encode<sqlx::Postgres>>::encode_by_ref(&self.0, buf)
            }
        }

        #[cfg(feature = "sqlx")]
        impl<'r> sqlx::Decode<'r, sqlx::Postgres> for $name {
            fn decode(
                value: <sqlx::Postgres as sqlx::Database>::ValueRef<'r>,
            ) -> Result<Self, sqlx::error::BoxDynError> {
                let v = <$inner as sqlx::Decode<sqlx::Postgres>>::decode(value)?;
                Ok(Self(v))
            }
        }

        #[cfg(feature = "sqlx")]
        impl sqlx::Type<sqlx::Postgres> for $name {
            fn type_info() -> <sqlx::Postgres as sqlx::Database>::TypeInfo {
                <$inner as sqlx::Type<sqlx::Postgres>>::type_info()
            }
        }
    };
}

define_uuid_id!(BookmarkId, "Identifies a persisted bookmark.");
define_uuid_id!(CardId, "Identifies a persisted card.");
define_uuid_id!(CollectionId, "Identifies a persisted collection.");
define_uuid_id!(EchoId, "Identifies a persisted echo.");
define_uuid_id!(EntryId, "Identifies a persisted journal entry.");
define_uuid_id!(FolderId, "Identifies a persisted folder.");
define_uuid_id!(QuickNoteId, "Identifies a persisted quick note.");
define_uuid_id!(TagId, "Identifies a persisted tag.");
define_uuid_id!(TiptapId, "Identifies a persisted Tiptap document.");
define_uuid_id!(TodoId, "Identifies a persisted todo item.");
define_uuid_id!(WatchId, "Identifies a persisted watch entry.");

define_int_id!(MediaId, i32, "Identifies a persisted media upload.");
define_int_id!(UserId, i32, "Identifies a persisted user.");
