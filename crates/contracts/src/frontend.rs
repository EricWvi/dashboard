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

pub const COLLECTIONS_PATH: &str = "/api/collections";
pub const COLLECTION_PATH: &str = "/api/collections/{id}";
pub const TODOS_ALL_PATH: &str = "/api/todos/all";
pub const TODOS_TODAY_PATH: &str = "/api/todos/today";
pub const TODOS_PLAN_TODAY_PATH: &str = "/api/todos/plan-today";
pub const MEDIA_PATH: &str = "/api/media";

const COLLECTION_ID_PATH_PARAM: FrontendPathParam = FrontendPathParam {
    rust_field_name: "id",
    wire_name: "id",
};

const COLLECTION_PATH_PARAMS: &[FrontendPathParam] = &[COLLECTION_ID_PATH_PARAM];
const NO_PATH_PARAMS: &[FrontendPathParam] = &[];

const FRONTEND_ENDPOINTS: &[FrontendEndpoint] = &[
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
        path_params: COLLECTION_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "updateCollection",
        method: FrontendHttpMethod::Put,
        path_template: COLLECTION_PATH,
        request_type: "UpdateCollectionRequest",
        response_type: "UpdateCollectionResponse",
        path_params: COLLECTION_PATH_PARAMS,
        has_json_body: true,
        authenticated: true,
    },
    FrontendEndpoint {
        operation_name: "deleteCollection",
        method: FrontendHttpMethod::Delete,
        path_template: COLLECTION_PATH,
        request_type: "DeleteCollectionRequest",
        response_type: "DeleteCollectionResponse",
        path_params: COLLECTION_PATH_PARAMS,
        has_json_body: false,
        authenticated: true,
    },
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
    use super::{
        COLLECTION_PATH, COLLECTIONS_PATH, FrontendEndpoint, FrontendHttpMethod, FrontendPathParam,
        MEDIA_PATH, TODOS_ALL_PATH, TODOS_PLAN_TODAY_PATH, TODOS_TODAY_PATH, frontend_endpoints,
    };
    use pretty_assertions::assert_eq;

    /// Verifies the exported endpoint manifest matches the current API route surface.
    #[test]
    fn exports_frontend_endpoint_manifest() {
        assert_eq!(
            frontend_endpoints(),
            &[
                FrontendEndpoint {
                    operation_name: "listCollections",
                    method: FrontendHttpMethod::Get,
                    path_template: COLLECTIONS_PATH,
                    request_type: "ListCollectionsRequest",
                    response_type: "ListCollectionsResponse",
                    path_params: &[],
                    has_json_body: false,
                    authenticated: true,
                },
                FrontendEndpoint {
                    operation_name: "createCollection",
                    method: FrontendHttpMethod::Post,
                    path_template: COLLECTIONS_PATH,
                    request_type: "CreateCollectionRequest",
                    response_type: "CreateCollectionResponse",
                    path_params: &[],
                    has_json_body: true,
                    authenticated: true,
                },
                FrontendEndpoint {
                    operation_name: "getCollection",
                    method: FrontendHttpMethod::Get,
                    path_template: COLLECTION_PATH,
                    request_type: "GetCollectionRequest",
                    response_type: "GetCollectionResponse",
                    path_params: &[FrontendPathParam {
                        rust_field_name: "id",
                        wire_name: "id",
                    }],
                    has_json_body: false,
                    authenticated: true,
                },
                FrontendEndpoint {
                    operation_name: "updateCollection",
                    method: FrontendHttpMethod::Put,
                    path_template: COLLECTION_PATH,
                    request_type: "UpdateCollectionRequest",
                    response_type: "UpdateCollectionResponse",
                    path_params: &[FrontendPathParam {
                        rust_field_name: "id",
                        wire_name: "id",
                    }],
                    has_json_body: true,
                    authenticated: true,
                },
                FrontendEndpoint {
                    operation_name: "deleteCollection",
                    method: FrontendHttpMethod::Delete,
                    path_template: COLLECTION_PATH,
                    request_type: "DeleteCollectionRequest",
                    response_type: "DeleteCollectionResponse",
                    path_params: &[FrontendPathParam {
                        rust_field_name: "id",
                        wire_name: "id",
                    }],
                    has_json_body: false,
                    authenticated: true,
                },
                FrontendEndpoint {
                    operation_name: "listAllTodos",
                    method: FrontendHttpMethod::Get,
                    path_template: TODOS_ALL_PATH,
                    request_type: "ListAllTodosRequest",
                    response_type: "ListAllTodosResponse",
                    path_params: &[],
                    has_json_body: false,
                    authenticated: true,
                },
                FrontendEndpoint {
                    operation_name: "listTodayTodos",
                    method: FrontendHttpMethod::Get,
                    path_template: TODOS_TODAY_PATH,
                    request_type: "ListTodayTodosRequest",
                    response_type: "ListTodayTodosResponse",
                    path_params: &[],
                    has_json_body: false,
                    authenticated: true,
                },
                FrontendEndpoint {
                    operation_name: "planToday",
                    method: FrontendHttpMethod::Post,
                    path_template: TODOS_PLAN_TODAY_PATH,
                    request_type: "PlanTodayRequest",
                    response_type: "PlanTodayResponse",
                    path_params: &[],
                    has_json_body: true,
                    authenticated: true,
                },
                FrontendEndpoint {
                    operation_name: "deleteMedia",
                    method: FrontendHttpMethod::Post,
                    path_template: MEDIA_PATH,
                    request_type: "DeleteMediaRequest",
                    response_type: "DeleteMediaResponse",
                    path_params: &[],
                    has_json_body: true,
                    authenticated: true,
                },
            ]
        );
    }

    /// Verifies update operations describe the path/body split needed by the generated client.
    #[test]
    fn preserves_path_params_for_update_routes() {
        let update_collection = frontend_endpoints()
            .iter()
            .find(|e| e.operation_name == "updateCollection")
            .copied()
            .unwrap_or_else(|| panic!("missing updateCollection endpoint"));

        assert_eq!(
            update_collection,
            FrontendEndpoint {
                operation_name: "updateCollection",
                method: FrontendHttpMethod::Put,
                path_template: COLLECTION_PATH,
                request_type: "UpdateCollectionRequest",
                response_type: "UpdateCollectionResponse",
                path_params: &[FrontendPathParam {
                    rust_field_name: "id",
                    wire_name: "id",
                }],
                has_json_body: true,
                authenticated: true,
            }
        );
    }
}
