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

/// Creates one or more tags under a group via the HTTP handler.
async fn create_tags(state: &AppState, email: &str, group: &str, tags: &[&str]) {
    let body = serde_json::json!({ "tags": tags, "group": group });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/tags")
            .header("content-type", "application/json"),
        email,
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
}

/// Lists tags for a group via the HTTP handler and returns the tag views.
async fn list_tags(state: &AppState, email: &str, group: &str) -> Vec<TagView> {
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tags?group={group}")),
        email,
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: ListTagsResponse = parse_json(resp).await;
    r.tags
}

/// Deletes a tag by name and group via the HTTP handler.
async fn delete_tag(state: &AppState, email: &str, name: &str, group: &str) -> StatusCode {
    let body = serde_json::json!({ "name": name, "group": group });
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri("/api/tags")
            .header("content-type", "application/json"),
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
        .uri("/api/tags?group=test")
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// AU-02: request with a corrupted token → 400.
async fn au_02_invalid_token_returns_400(state: &AppState) {
    let req = Request::builder()
        .method("GET")
        .uri("/api/tags?group=test")
        .header("onlyquant-token", "not-a-valid-base64-token")
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── LT: list tags ────────────────────────────────────────────────────────────

/// LT-01: no tags exist for the requested group → 200, empty list.
async fn lt_01_empty_list_for_new_group(state: &AppState) {
    let tags = list_tags(state, "lt01@test.com", "books").await;
    assert_eq!(tags, vec![]);
}

/// LT-02: group has tags → 200, all non-deleted tags returned.
async fn lt_02_returns_all_tags_for_group(state: &AppState) {
    create_tags(state, "lt02@test.com", "tech", &["rust", "go"]).await;
    let tags = list_tags(state, "lt02@test.com", "tech").await;
    assert_eq!(tags.len(), 2);
    assert!(tags.iter().any(|t| t.name == "rust"));
    assert!(tags.iter().any(|t| t.name == "go"));
}

/// LT-03: only tags belonging to the requested group are returned; other groups excluded.
async fn lt_03_results_scoped_to_group(state: &AppState) {
    create_tags(state, "lt03@test.com", "lang", &["python"]).await;
    create_tags(state, "lt03@test.com", "food", &["pizza"]).await;

    let tags = list_tags(state, "lt03@test.com", "lang").await;
    assert_eq!(tags.len(), 1);
    assert_eq!(tags[0].name, "python");
}

/// LT-04: soft-deleted tags are excluded from the result list.
async fn lt_04_deleted_tags_excluded(state: &AppState) {
    create_tags(state, "lt04@test.com", "tools", &["vim", "emacs"]).await;
    delete_tag(state, "lt04@test.com", "vim", "tools").await;

    let tags = list_tags(state, "lt04@test.com", "tools").await;
    assert_eq!(tags.len(), 1);
    assert_eq!(tags[0].name, "emacs");
}

/// LT-05: user A's tags are not visible to user B.
async fn lt_05_tags_isolated_per_user(state: &AppState) {
    create_tags(state, "lt05a@test.com", "private", &["secret"]).await;

    let tags = list_tags(state, "lt05b@test.com", "private").await;
    assert_eq!(tags, vec![]);
}

/// LT-06: results are ordered by created_at ascending.
async fn lt_06_results_ordered_by_created_at_asc(state: &AppState) {
    // Insert individually to ensure distinct timestamps.
    create_tags(state, "lt06@test.com", "order", &["alpha"]).await;
    create_tags(state, "lt06@test.com", "order", &["beta"]).await;
    create_tags(state, "lt06@test.com", "order", &["gamma"]).await;

    let tags = list_tags(state, "lt06@test.com", "order").await;
    assert_eq!(tags.len(), 3);
    // created_at values must be non-decreasing.
    for w in tags.windows(2) {
        assert!(w[0].created_at <= w[1].created_at);
    }
}

// ─── CT: create tags ──────────────────────────────────────────────────────────

/// CT-01: single tag in the batch → 200, empty response body.
async fn ct_01_single_tag_returns_200(state: &AppState) {
    let body = serde_json::json!({ "tags": ["rust"], "group": "lang" });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/tags")
            .header("content-type", "application/json"),
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
    create_tags(state, "ct02@test.com", "batch", &["a", "b", "c"]).await;
    let tags = list_tags(state, "ct02@test.com", "batch").await;
    assert_eq!(tags.len(), 3);
}

/// CT-03: created tags appear in subsequent list for the same group.
async fn ct_03_created_tags_visible_in_list(state: &AppState) {
    create_tags(state, "ct03@test.com", "visible", &["tag1"]).await;
    let tags = list_tags(state, "ct03@test.com", "visible").await;
    assert!(tags.iter().any(|t| t.name == "tag1"));
}

/// CT-04: tags created under group A do not appear when listing group B.
async fn ct_04_tags_scoped_to_group_on_create(state: &AppState) {
    create_tags(state, "ct04@test.com", "groupA", &["only-in-a"]).await;
    let tags = list_tags(state, "ct04@test.com", "groupB").await;
    assert_eq!(tags, vec![]);
}

/// CT-05: invalid JSON syntax → 400.
async fn ct_05_invalid_json_returns_400(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/tags")
            .header("content-type", "application/json"),
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
    create_tags(state, "dt01@test.com", "tools", &["grep"]).await;

    let body = serde_json::json!({ "name": "grep", "group": "tools" });
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri("/api/tags")
            .header("content-type", "application/json"),
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
    create_tags(state, "dt02@test.com", "tools", &["sed"]).await;
    delete_tag(state, "dt02@test.com", "sed", "tools").await;

    let tags = list_tags(state, "dt02@test.com", "tools").await;
    assert!(tags.iter().all(|t| t.name != "sed"));
}

/// DT-03: non-existent name/group combination → 200 (soft-delete of missing row is a no-op).
async fn dt_03_missing_tag_returns_200(state: &AppState) {
    let status = delete_tag(state, "dt03@test.com", "ghost", "nowhere").await;
    assert_eq!(status, StatusCode::OK);
}

/// DT-04: deleting tag belonging to another user → 200, but that user's tag is unaffected.
async fn dt_04_other_user_tag_unaffected(state: &AppState) {
    create_tags(state, "dt04a@test.com", "shared-group", &["owned"]).await;

    // dt04b attempts to delete dt04a's tag — scoped by creator_id so it's a no-op.
    let status = delete_tag(state, "dt04b@test.com", "owned", "shared-group").await;
    assert_eq!(status, StatusCode::OK);

    // dt04a's tag must still be present.
    let tags = list_tags(state, "dt04a@test.com", "shared-group").await;
    assert_eq!(tags.len(), 1);
    assert_eq!(tags[0].name, "owned");
}

/// DT-05: invalid JSON syntax → 400.
async fn dt_05_invalid_json_returns_400(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri("/api/tags")
            .header("content-type", "application/json"),
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
    lt_01_empty_list_for_new_group(&state).await;
    lt_02_returns_all_tags_for_group(&state).await;
    lt_03_results_scoped_to_group(&state).await;
    lt_04_deleted_tags_excluded(&state).await;
    lt_05_tags_isolated_per_user(&state).await;
    lt_06_results_ordered_by_created_at_asc(&state).await;
    ct_01_single_tag_returns_200(&state).await;
    ct_02_multiple_tags_all_created(&state).await;
    ct_03_created_tags_visible_in_list(&state).await;
    ct_04_tags_scoped_to_group_on_create(&state).await;
    ct_05_invalid_json_returns_400(&state).await;
    dt_01_existing_tag_returns_200(&state).await;
    dt_02_deleted_tag_absent_from_list(&state).await;
    dt_03_missing_tag_returns_200(&state).await;
    dt_04_other_user_tag_unaffected(&state).await;
    dt_05_invalid_json_returns_400(&state).await;
}
