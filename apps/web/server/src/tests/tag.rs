use axum::body::Body;
use axum::http::{Request, Response, StatusCode};
use only_contracts::{CreateTagsResponse, DeleteTagResponse, ListTagsResponse, TagView};
use pretty_assertions::assert_eq;

use super::{bootstrap_test_state, send, with_auth};
use crate::app_state::AppState;

async fn parse_json<T: serde::de::DeserializeOwned>(resp: Response<Body>) -> T {
    let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .expect("failed to collect response body");
    serde_json::from_slice(&bytes).expect("failed to deserialize response JSON")
}

/// Creates one or more tags for the given app context via the HTTP handler.
async fn create_tags(state: &AppState, email: &str, app: &str, tags: &[&str]) {
    let body = serde_json::json!({ "tags": tags });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/tags")
            .header("content-type", "application/json")
            .header("only-app", app),
        email,
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
}

/// Lists tags for the given app context via the HTTP handler and returns the tag views.
async fn list_tags(state: &AppState, email: &str, app: &str) -> Vec<TagView> {
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri("/api/tags")
            .header("only-app", app),
        email,
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: ListTagsResponse = parse_json(resp).await;
    r.tags
}

/// Deletes a tag by name within the given app context via the HTTP handler.
async fn delete_tag(state: &AppState, email: &str, app: &str, name: &str) -> StatusCode {
    let body = serde_json::json!({ "name": name });
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri("/api/tags")
            .header("content-type", "application/json")
            .header("only-app", app),
        email,
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    resp.status()
}

// ─── AU: authentication ───────────────────────────────────────────────────────

/// AU-01: request with no token → 400.
async fn au_01_no_token_returns_400(state: &AppState) {
    let req = Request::builder()
        .method("GET")
        .uri("/api/tags")
        .header("only-app", "journal")
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// AU-02: request with a corrupted token → 400.
async fn au_02_invalid_token_returns_400(state: &AppState) {
    let req = Request::builder()
        .method("GET")
        .uri("/api/tags")
        .header("onlyquant-token", "not-a-valid-base64-token")
        .header("only-app", "journal")
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── AC: app context ──────────────────────────────────────────────────────────

/// AC-01: missing Only-App header → 400.
async fn ac_01_missing_app_header_returns_400(state: &AppState) {
    let req = with_auth(
        Request::builder().method("GET").uri("/api/tags"),
        "ac01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// AC-02: unknown Only-App value → 400.
async fn ac_02_unknown_app_value_returns_400(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri("/api/tags")
            .header("only-app", "unknown-app"),
        "ac02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── LT: list tags ────────────────────────────────────────────────────────────

/// LT-01: no tags exist for the requested app → 200, empty list.
async fn lt_01_empty_list_for_new_app(state: &AppState) {
    let tags = list_tags(state, "lt01@test.com", "journal").await;
    assert_eq!(tags, vec![]);
}

/// LT-02: app has tags → 200, all non-deleted tags returned.
async fn lt_02_returns_all_tags_for_app(state: &AppState) {
    create_tags(state, "lt02@test.com", "journal", &["rust", "go"]).await;
    let tags = list_tags(state, "lt02@test.com", "journal").await;
    assert_eq!(tags.len(), 2);
    assert!(tags.iter().any(|t| t.name == "rust"));
    assert!(tags.iter().any(|t| t.name == "go"));
}

/// LT-03: only tags belonging to the requested app context are returned; other apps excluded.
async fn lt_03_results_scoped_to_app(state: &AppState) {
    create_tags(state, "lt03@test.com", "journal", &["python"]).await;
    create_tags(state, "lt03@test.com", "dashboard", &["pizza"]).await;

    let tags = list_tags(state, "lt03@test.com", "journal").await;
    assert_eq!(tags.len(), 1);
    assert_eq!(tags[0].name, "python");
}

/// LT-04: soft-deleted tags are excluded from the result list.
async fn lt_04_deleted_tags_excluded(state: &AppState) {
    create_tags(state, "lt04@test.com", "journal", &["vim", "emacs"]).await;
    delete_tag(state, "lt04@test.com", "journal", "vim").await;

    let tags = list_tags(state, "lt04@test.com", "journal").await;
    assert_eq!(tags.len(), 1);
    assert_eq!(tags[0].name, "emacs");
}

/// LT-05: user A's tags are not visible to user B.
async fn lt_05_tags_isolated_per_user(state: &AppState) {
    create_tags(state, "lt05a@test.com", "journal", &["secret"]).await;

    let tags = list_tags(state, "lt05b@test.com", "journal").await;
    assert_eq!(tags, vec![]);
}

/// LT-06: results are ordered by created_at ascending.
async fn lt_06_results_ordered_by_created_at_asc(state: &AppState) {
    // Insert individually to ensure distinct timestamps.
    create_tags(state, "lt06@test.com", "journal", &["alpha"]).await;
    create_tags(state, "lt06@test.com", "journal", &["beta"]).await;
    create_tags(state, "lt06@test.com", "journal", &["gamma"]).await;

    let tags = list_tags(state, "lt06@test.com", "journal").await;
    assert_eq!(tags.len(), 3);
    // created_at values must be non-decreasing.
    for w in tags.windows(2) {
        assert!(w[0].created_at <= w[1].created_at);
    }
}

// ─── CT: create tags ──────────────────────────────────────────────────────────

/// CT-01: single tag in the batch → 200, empty response body.
async fn ct_01_single_tag_returns_200(state: &AppState) {
    let body = serde_json::json!({ "tags": ["rust"] });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/tags")
            .header("content-type", "application/json")
            .header("only-app", "journal"),
        "ct01@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let _: CreateTagsResponse = parse_json(resp).await;
}

/// CT-02: multiple tags in the batch → 200, all tags created.
async fn ct_02_multiple_tags_all_created(state: &AppState) {
    create_tags(state, "ct02@test.com", "journal", &["a", "b", "c"]).await;
    let tags = list_tags(state, "ct02@test.com", "journal").await;
    assert_eq!(tags.len(), 3);
}

/// CT-03: created tags appear in subsequent list for the same app context.
async fn ct_03_created_tags_visible_in_list(state: &AppState) {
    create_tags(state, "ct03@test.com", "journal", &["tag1"]).await;
    let tags = list_tags(state, "ct03@test.com", "journal").await;
    assert!(tags.iter().any(|t| t.name == "tag1"));
}

/// CT-04: tags created under one app context do not appear when listing another.
async fn ct_04_tags_scoped_to_app_on_create(state: &AppState) {
    create_tags(state, "ct04@test.com", "journal", &["only-in-journal"]).await;
    let tags = list_tags(state, "ct04@test.com", "dashboard").await;
    assert_eq!(tags, vec![]);
}

/// CT-05: invalid JSON syntax → 400.
async fn ct_05_invalid_json_returns_400(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/tags")
            .header("content-type", "application/json")
            .header("only-app", "journal"),
        "ct05@test.com",
    )
    .body(Body::from("not json at all"))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── DT: delete tag ───────────────────────────────────────────────────────────

/// DT-01: existing tag → 200, empty response body.
async fn dt_01_existing_tag_returns_200(state: &AppState) {
    create_tags(state, "dt01@test.com", "journal", &["grep"]).await;

    let body = serde_json::json!({ "name": "grep" });
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri("/api/tags")
            .header("content-type", "application/json")
            .header("only-app", "journal"),
        "dt01@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let _: DeleteTagResponse = parse_json(resp).await;
}

/// DT-02: deleted tag no longer appears in subsequent list.
async fn dt_02_deleted_tag_absent_from_list(state: &AppState) {
    create_tags(state, "dt02@test.com", "journal", &["sed"]).await;
    delete_tag(state, "dt02@test.com", "journal", "sed").await;

    let tags = list_tags(state, "dt02@test.com", "journal").await;
    assert!(tags.iter().all(|t| t.name != "sed"));
}

/// DT-03: non-existent name → 200 (soft-delete of missing row is a no-op).
async fn dt_03_missing_tag_returns_200(state: &AppState) {
    let status = delete_tag(state, "dt03@test.com", "journal", "ghost").await;
    assert_eq!(status, StatusCode::OK);
}

/// DT-04: deleting tag belonging to another user → 200, but that user's tag is unaffected.
async fn dt_04_other_user_tag_unaffected(state: &AppState) {
    create_tags(state, "dt04a@test.com", "journal", &["owned"]).await;

    // dt04b attempts to delete dt04a's tag — scoped by creator_id so it's a no-op.
    let status = delete_tag(state, "dt04b@test.com", "journal", "owned").await;
    assert_eq!(status, StatusCode::OK);

    // dt04a's tag must still be present.
    let tags = list_tags(state, "dt04a@test.com", "journal").await;
    assert_eq!(tags.len(), 1);
    assert_eq!(tags[0].name, "owned");
}

/// DT-05: invalid JSON syntax → 400.
async fn dt_05_invalid_json_returns_400(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri("/api/tags")
            .header("content-type", "application/json")
            .header("only-app", "journal"),
        "dt05@test.com",
    )
    .body(Body::from("not json at all"))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── test runner ──────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requires RUN_TESTCONTAINERS=1"]
async fn tag_handler_tests() {
    let (_container, state) = bootstrap_test_state().await;

    au_01_no_token_returns_400(&state).await;
    au_02_invalid_token_returns_400(&state).await;
    ac_01_missing_app_header_returns_400(&state).await;
    ac_02_unknown_app_value_returns_400(&state).await;
    lt_01_empty_list_for_new_app(&state).await;
    lt_02_returns_all_tags_for_app(&state).await;
    lt_03_results_scoped_to_app(&state).await;
    lt_04_deleted_tags_excluded(&state).await;
    lt_05_tags_isolated_per_user(&state).await;
    lt_06_results_ordered_by_created_at_asc(&state).await;
    ct_01_single_tag_returns_200(&state).await;
    ct_02_multiple_tags_all_created(&state).await;
    ct_03_created_tags_visible_in_list(&state).await;
    ct_04_tags_scoped_to_app_on_create(&state).await;
    ct_05_invalid_json_returns_400(&state).await;
    dt_01_existing_tag_returns_200(&state).await;
    dt_02_deleted_tag_absent_from_list(&state).await;
    dt_03_missing_tag_returns_200(&state).await;
    dt_04_other_user_tag_unaffected(&state).await;
    dt_05_invalid_json_returns_400(&state).await;
}
