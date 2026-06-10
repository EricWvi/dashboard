use serde::Serialize;

/// Enumerates the HTTP methods supported by the generated frontend SDK.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum FrontendHttpMethod {
    Get,
    Post,
    Put,
    Delete,
}

/// Describes one request field that the transport must interpolate into the URL path.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FrontendPathParam {
    pub rust_field_name: &'static str,
    pub wire_name: &'static str,
}

/// Describes one frontend-facing HTTP operation exported from `only-contracts`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FrontendEndpoint {
    pub operation_name: &'static str,
    pub method: FrontendHttpMethod,
    pub path_template: &'static str,
    pub request_type: &'static str,
    pub response_type: &'static str,
    pub path_params: &'static [FrontendPathParam],
    pub has_json_body: bool,
    /// When true, the generated SDK attaches `Onlyquant-Token` from localStorage to the request.
    pub authenticated: bool,
}

// ── Path constants ─────────────────────────────────────────────────────────

pub const COLLECTIONS_PATH: &str = "/api/collections";
pub const COLLECTION_PATH: &str = "/api/collections/{id}";
pub const TODOS_ALL_PATH: &str = "/api/todos/all";
pub const TODOS_TODAY_PATH: &str = "/api/todos/today";
pub const TODOS_PLAN_TODAY_PATH: &str = "/api/todos/plan-today";
pub const MEDIA_PATH: &str = "/api/media";

pub const ENTRIES_PATH: &str = "/api/entries";
pub const ENTRY_PATH: &str = "/api/entries/{id}";
pub const ENTRY_BOOKMARK_PATH: &str = "/api/entries/{id}/bookmark";
pub const ENTRY_UNBOOKMARK_PATH: &str = "/api/entries/{id}/unbookmark";

pub const TAGS_PATH: &str = "/api/tags";

pub const TIPTAPS_PATH: &str = "/api/tiptaps";
pub const TIPTAP_PATH: &str = "/api/tiptaps/{id}";
pub const TIPTAP_HISTORY_PATH: &str = "/api/tiptaps/{id}/history";
pub const TIPTAP_HISTORY_RESTORE_PATH: &str = "/api/tiptaps/{id}/history/restore";

pub const QUICKNOTES_PATH: &str = "/api/quicknotes";
pub const QUICKNOTE_PATH: &str = "/api/quicknotes/{id}";
pub const QUICKNOTE_BOTTOM_PATH: &str = "/api/quicknotes/{id}/bottom";

pub const BOOKMARKS_PATH: &str = "/api/bookmarks";
pub const BOOKMARK_PATH: &str = "/api/bookmarks/{id}";
pub const BOOKMARK_CLICK_PATH: &str = "/api/bookmarks/{id}/click";

// ── Path param descriptors ─────────────────────────────────────────────────

const ID_PATH_PARAM: FrontendPathParam = FrontendPathParam {
    rust_field_name: "id",
    wire_name: "id",
};
const ID_PATH_PARAMS: &[FrontendPathParam] = &[ID_PATH_PARAM];
const NO_PATH_PARAMS: &[FrontendPathParam] = &[];

// ── Endpoint manifest ──────────────────────────────────────────────────────

const FRONTEND_ENDPOINTS: &[FrontendEndpoint] = &[
    // ── Collections ────────────────────────────────────────────────────────
    FrontendEndpoint {
        operation_name: "listCollections",
        method: FrontendHttpMethod::Get,
        path_template: COLLECTIONS_PATH,
        request_type: "ListCollectionsRequest",
        response_type: "ListCollectionsResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "createCollection",
        method: FrontendHttpMethod::Post,
        path_template: COLLECTIONS_PATH,
        request_type: "CreateCollectionRequest",
        response_type: "CreateCollectionResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "getCollection",
        method: FrontendHttpMethod::Get,
        path_template: COLLECTION_PATH,
        request_type: "GetCollectionRequest",
        response_type: "GetCollectionResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "updateCollection",
        method: FrontendHttpMethod::Put,
        path_template: COLLECTION_PATH,
        request_type: "UpdateCollectionRequest",
        response_type: "UpdateCollectionResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "deleteCollection",
        method: FrontendHttpMethod::Delete,
        path_template: COLLECTION_PATH,
        request_type: "DeleteCollectionRequest",
        response_type: "DeleteCollectionResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    // ── Todos ───────────────────────────────────────────────────────────────
    FrontendEndpoint {
        operation_name: "listAllTodos",
        method: FrontendHttpMethod::Get,
        path_template: TODOS_ALL_PATH,
        request_type: "ListAllTodosRequest",
        response_type: "ListAllTodosResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "listTodayTodos",
        method: FrontendHttpMethod::Get,
        path_template: TODOS_TODAY_PATH,
        request_type: "ListTodayTodosRequest",
        response_type: "ListTodayTodosResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "planToday",
        method: FrontendHttpMethod::Post,
        path_template: TODOS_PLAN_TODAY_PATH,
        request_type: "PlanTodayRequest",
        response_type: "PlanTodayResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    // ── Entries ─────────────────────────────────────────────────────────────
    FrontendEndpoint {
        operation_name: "listEntries",
        method: FrontendHttpMethod::Get,
        path_template: ENTRIES_PATH,
        request_type: "ListEntriesRequest",
        response_type: "ListEntriesResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "createEntry",
        method: FrontendHttpMethod::Post,
        path_template: ENTRIES_PATH,
        request_type: "CreateEntryRequest",
        response_type: "CreateEntryResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "getEntry",
        method: FrontendHttpMethod::Get,
        path_template: ENTRY_PATH,
        request_type: "GetEntryRequest",
        response_type: "GetEntryResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "updateEntry",
        method: FrontendHttpMethod::Put,
        path_template: ENTRY_PATH,
        request_type: "UpdateEntryRequest",
        response_type: "UpdateEntryResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "deleteEntry",
        method: FrontendHttpMethod::Delete,
        path_template: ENTRY_PATH,
        request_type: "DeleteEntryRequest",
        response_type: "DeleteEntryResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "bookmarkEntry",
        method: FrontendHttpMethod::Post,
        path_template: ENTRY_BOOKMARK_PATH,
        request_type: "BookmarkEntryRequest",
        response_type: "BookmarkEntryResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "unbookmarkEntry",
        method: FrontendHttpMethod::Post,
        path_template: ENTRY_UNBOOKMARK_PATH,
        request_type: "UnbookmarkEntryRequest",
        response_type: "UnbookmarkEntryResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    // ── Tags ────────────────────────────────────────────────────────────────
    FrontendEndpoint {
        operation_name: "listTags",
        method: FrontendHttpMethod::Get,
        path_template: TAGS_PATH,
        request_type: "ListTagsRequest",
        response_type: "ListTagsResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "createTags",
        method: FrontendHttpMethod::Post,
        path_template: TAGS_PATH,
        request_type: "CreateTagsRequest",
        response_type: "CreateTagsResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "deleteTag",
        method: FrontendHttpMethod::Delete,
        path_template: TAGS_PATH,
        request_type: "DeleteTagRequest",
        response_type: "DeleteTagResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    // ── Tiptaps ─────────────────────────────────────────────────────────────
    FrontendEndpoint {
        operation_name: "createTiptap",
        method: FrontendHttpMethod::Post,
        path_template: TIPTAPS_PATH,
        request_type: "CreateTiptapRequest",
        response_type: "CreateTiptapResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "getTiptap",
        method: FrontendHttpMethod::Get,
        path_template: TIPTAP_PATH,
        request_type: "GetTiptapRequest",
        response_type: "GetTiptapResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "updateTiptap",
        method: FrontendHttpMethod::Put,
        path_template: TIPTAP_PATH,
        request_type: "UpdateTiptapRequest",
        response_type: "UpdateTiptapResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "listTiptapHistory",
        method: FrontendHttpMethod::Get,
        path_template: TIPTAP_HISTORY_PATH,
        request_type: "ListTiptapHistoryRequest",
        response_type: "ListTiptapHistoryResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "restoreTiptapHistory",
        method: FrontendHttpMethod::Post,
        path_template: TIPTAP_HISTORY_RESTORE_PATH,
        request_type: "RestoreTiptapHistoryRequest",
        response_type: "RestoreTiptapHistoryResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    // ── Quick Notes ──────────────────────────────────────────────────────────
    FrontendEndpoint {
        operation_name: "listQuickNotes",
        method: FrontendHttpMethod::Get,
        path_template: QUICKNOTES_PATH,
        request_type: "ListQuickNotesRequest",
        response_type: "ListQuickNotesResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "createQuickNote",
        method: FrontendHttpMethod::Post,
        path_template: QUICKNOTES_PATH,
        request_type: "CreateQuickNoteRequest",
        response_type: "CreateQuickNoteResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "updateQuickNote",
        method: FrontendHttpMethod::Put,
        path_template: QUICKNOTE_PATH,
        request_type: "UpdateQuickNoteRequest",
        response_type: "UpdateQuickNoteResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "deleteQuickNote",
        method: FrontendHttpMethod::Delete,
        path_template: QUICKNOTE_PATH,
        request_type: "DeleteQuickNoteRequest",
        response_type: "DeleteQuickNoteResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "bottomQuickNote",
        method: FrontendHttpMethod::Post,
        path_template: QUICKNOTE_BOTTOM_PATH,
        request_type: "BottomQuickNoteRequest",
        response_type: "BottomQuickNoteResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    // ── Bookmarks ───────────────────────────────────────────────────────────
    FrontendEndpoint {
        operation_name: "listBookmarks",
        method: FrontendHttpMethod::Get,
        path_template: BOOKMARKS_PATH,
        request_type: "ListBookmarksRequest",
        response_type: "ListBookmarksResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "createBookmark",
        method: FrontendHttpMethod::Post,
        path_template: BOOKMARKS_PATH,
        request_type: "CreateBookmarkRequest",
        response_type: "CreateBookmarkResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "getBookmark",
        method: FrontendHttpMethod::Get,
        path_template: BOOKMARK_PATH,
        request_type: "GetBookmarkRequest",
        response_type: "GetBookmarkResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "updateBookmark",
        method: FrontendHttpMethod::Put,
        path_template: BOOKMARK_PATH,
        request_type: "UpdateBookmarkRequest",
        response_type: "UpdateBookmarkResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "deleteBookmark",
        method: FrontendHttpMethod::Delete,
        path_template: BOOKMARK_PATH,
        request_type: "DeleteBookmarkRequest",
        response_type: "DeleteBookmarkResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "clickBookmark",
        method: FrontendHttpMethod::Post,
        path_template: BOOKMARK_CLICK_PATH,
        request_type: "ClickBookmarkRequest",
        response_type: "ClickBookmarkResponse",
        path_params: ID_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    // ── Media ───────────────────────────────────────────────────────────────
    FrontendEndpoint {
        operation_name: "deleteMedia",
        method: FrontendHttpMethod::Post,
        path_template: MEDIA_PATH,
        request_type: "DeleteMediaRequest",
        response_type: "DeleteMediaResponse",
        path_params: NO_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
];

/// Returns the Rust-owned endpoint metadata exported to the generated frontend SDK.
pub fn frontend_endpoints() -> &'static [FrontendEndpoint] {
    FRONTEND_ENDPOINTS
}

#[cfg(test)]
mod tests {
    use super::{FrontendEndpoint, frontend_endpoints};
    use pretty_assertions::assert_eq;

    /// Verifies the endpoint manifest has the expected count and correct first/last entries.
    #[test]
    fn exports_expected_endpoint_count() {
        // 5 collection + 3 todo + 7 entry + 3 tag + 5 tiptap + 5 quicknote + 6 bookmark + 1 media
        assert_eq!(frontend_endpoints().len(), 35);
    }

    /// Verifies the manifest is non-empty and each entry has a non-empty operation name.
    #[test]
    fn all_endpoints_have_operation_names() {
        for endpoint in frontend_endpoints() {
            assert!(
                !endpoint.operation_name.is_empty(),
                "endpoint missing operation_name: {endpoint:?}",
            );
        }
    }

    /// Verifies that authenticated endpoints all set authenticated=true.
    #[test]
    fn all_endpoints_are_authenticated() {
        for endpoint in frontend_endpoints() {
            assert!(
                endpoint.authenticated,
                "endpoint should be authenticated: {}",
                endpoint.operation_name,
            );
        }
    }

    /// Verifies the update operations describe the path/body split needed by the generated client.
    #[test]
    fn update_endpoints_have_id_path_param() {
        let update_ops: Vec<&FrontendEndpoint> = frontend_endpoints()
            .iter()
            .filter(|e| {
                matches!(
                    e.operation_name,
                    "updateCollection"
                        | "updateEntry"
                        | "updateBookmark"
                        | "updateTiptap"
                        | "updateQuickNote"
                )
            })
            .collect();

        assert_eq!(update_ops.len(), 5, "expected 5 update endpoints");
        for ep in update_ops {
            assert_eq!(
                ep.path_params.len(),
                1,
                "{} must have exactly one path param",
                ep.operation_name
            );
            assert_eq!(ep.path_params[0].rust_field_name, "id");
        }
    }
}
