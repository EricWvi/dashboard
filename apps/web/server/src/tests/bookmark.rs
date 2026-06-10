use axum::body::Body;
use axum::http::{Request, Response, StatusCode};
use only_contracts::{
    BookmarkView, CreateBookmarkResponse, DeleteBookmarkResponse, GetBookmarkResponse,
    ListBookmarksResponse, UpdateBookmarkResponse,
};
use pretty_assertions::assert_eq;

use super::{bootstrap_test_state, send, with_auth};
use crate::app_state::AppState;

async fn parse_json<T: serde::de::DeserializeOwned>(resp: Response<Body>) -> T {
    let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .expect("failed to collect response body");
    serde_json::from_slice(&bytes).expect("failed to deserialize response JSON")
}

/// Creates a bookmark via the HTTP handler and returns the saved view.
async fn create_bookmark(state: &AppState, email: &str, url: &str, title: &str) -> BookmarkView {
    let body = serde_json::json!({
        "url": url,
        "title": title,
        "domain": "example.com",
        "payload": {}
    });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/bookmarks")
            .header("content-type", "application/json"),
        email,
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: CreateBookmarkResponse = parse_json(resp).await;
    r.bookmark
}

// ─── AU: authentication ───────────────────────────────────────────────────────

/// AU-01: request with no token → 400.
async fn au_01_no_token_returns_400(state: &AppState) {
    let req = Request::builder()
        .method("GET")
        .uri("/api/bookmarks")
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// AU-02: request with a corrupted token → 400.
async fn au_02_invalid_token_returns_400(state: &AppState) {
    let req = Request::builder()
        .method("GET")
        .uri("/api/bookmarks")
        .header("onlyquant-token", "not-a-valid-base64-token")
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── LB: list bookmarks ───────────────────────────────────────────────────────

/// LB-01: no bookmarks exist for user → 200, empty list.
async fn lb_01_empty_list_for_new_user(state: &AppState) {
    let req = with_auth(
        Request::builder().method("GET").uri("/api/bookmarks"),
        "lb01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let body: ListBookmarksResponse = parse_json(resp).await;
    assert_eq!(body.bookmarks, vec![]);
}

/// LB-02: user has bookmarks → 200, all bookmarks returned.
async fn lb_02_returns_all_user_bookmarks(state: &AppState) {
    let bm1 = create_bookmark(state, "lb02@test.com", "https://a.com", "A").await;
    let bm2 = create_bookmark(state, "lb02@test.com", "https://b.com", "B").await;

    let req = with_auth(
        Request::builder().method("GET").uri("/api/bookmarks"),
        "lb02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let body: ListBookmarksResponse = parse_json(resp).await;
    assert_eq!(body.bookmarks.len(), 2);
    assert!(body.bookmarks.iter().any(|b| b.id == bm1.id));
    assert!(body.bookmarks.iter().any(|b| b.id == bm2.id));
}

/// LB-03: user A's bookmarks are not visible to user B.
async fn lb_03_bookmarks_isolated_per_user(state: &AppState) {
    create_bookmark(state, "lb03a@test.com", "https://private.com", "Private").await;

    let req = with_auth(
        Request::builder().method("GET").uri("/api/bookmarks"),
        "lb03b@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let body: ListBookmarksResponse = parse_json(resp).await;
    assert_eq!(body.bookmarks, vec![]);
}

// ─── CB: create bookmark ──────────────────────────────────────────────────────

/// CB-01: valid payload → 200, response bookmark matches request fields.
async fn cb_01_valid_payload_returns_bookmark(state: &AppState) {
    let body = serde_json::json!({
        "url": "https://rust-lang.org",
        "title": "Rust",
        "domain": "rust-lang.org",
        "payload": {"tag": "lang"}
    });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/bookmarks")
            .header("content-type", "application/json"),
        "cb01@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: CreateBookmarkResponse = parse_json(resp).await;
    assert_eq!(r.bookmark.url, "https://rust-lang.org");
    assert_eq!(r.bookmark.title, "Rust");
    assert_eq!(r.bookmark.domain, "rust-lang.org");
    assert_eq!(r.bookmark.click, 0);
}

/// CB-02: invalid JSON syntax → 400 (axum returns BAD_REQUEST for JsonSyntaxError).
async fn cb_02_invalid_json_returns_400(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/bookmarks")
            .header("content-type", "application/json"),
        "cb02@test.com",
    )
    .body(Body::from("not json at all"))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// CB-03: created bookmark appears in subsequent list.
async fn cb_03_created_bookmark_visible_in_list(state: &AppState) {
    let bm = create_bookmark(state, "cb03@test.com", "https://example.org", "Example Org").await;

    let req = with_auth(
        Request::builder().method("GET").uri("/api/bookmarks"),
        "cb03@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    let body: ListBookmarksResponse = parse_json(resp).await;
    assert!(body.bookmarks.iter().any(|b| b.id == bm.id));
}

// ─── GB: get bookmark ─────────────────────────────────────────────────────────

/// GB-01: existing bookmark → 200, correct bookmark returned.
async fn gb_01_existing_id_returns_bookmark(state: &AppState) {
    let bm = create_bookmark(state, "gb01@test.com", "https://gb01.com", "GB01").await;

    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/bookmarks/{}", bm.id)),
        "gb01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: GetBookmarkResponse = parse_json(resp).await;
    assert_eq!(r.bookmark, bm);
}

/// GB-02: non-existent id → 404.
async fn gb_02_missing_id_returns_404(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri("/api/bookmarks/00000000-0000-0000-0000-000000000000"),
        "gb02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// GB-03: id belonging to another user → 404.
async fn gb_03_other_user_id_returns_404(state: &AppState) {
    let bm = create_bookmark(state, "gb03a@test.com", "https://gb03.com", "GB03").await;

    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/bookmarks/{}", bm.id)),
        "gb03b@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── UB: update bookmark ──────────────────────────────────────────────────────

/// UB-01: valid update payload → 200, response reflects new values.
async fn ub_01_valid_update_returns_updated_bookmark(state: &AppState) {
    let bm = create_bookmark(state, "ub01@test.com", "https://old.com", "Old Title").await;
    let update = serde_json::json!({
        "url": "https://new.com",
        "title": "New Title",
        "domain": "new.com",
        "payload": {}
    });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri(format!("/api/bookmarks/{}", bm.id))
            .header("content-type", "application/json"),
        "ub01@test.com",
    )
    .body(Body::from(update.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: UpdateBookmarkResponse = parse_json(resp).await;
    assert_eq!(r.bookmark.url, "https://new.com");
    assert_eq!(r.bookmark.title, "New Title");
    assert_eq!(r.bookmark.domain, "new.com");
}

/// UB-02: non-existent id → 404.
async fn ub_02_missing_id_returns_404(state: &AppState) {
    let update = serde_json::json!({
        "url": "https://x.com",
        "title": "X",
        "domain": "x.com",
        "payload": {}
    });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri("/api/bookmarks/00000000-0000-0000-0000-000000000000")
            .header("content-type", "application/json"),
        "ub02@test.com",
    )
    .body(Body::from(update.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// UB-03: id belonging to another user → 404.
async fn ub_03_other_user_id_returns_404(state: &AppState) {
    let bm = create_bookmark(state, "ub03a@test.com", "https://ub03.com", "UB03").await;
    let update = serde_json::json!({
        "url": "https://ub03.com",
        "title": "UB03",
        "domain": "ub03.com",
        "payload": {}
    });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri(format!("/api/bookmarks/{}", bm.id))
            .header("content-type", "application/json"),
        "ub03b@test.com",
    )
    .body(Body::from(update.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── DB: delete bookmark ──────────────────────────────────────────────────────

/// DB-01: existing bookmark → 200, response contains deleted id.
async fn db_01_existing_id_returns_deleted_id(state: &AppState) {
    let bm = create_bookmark(state, "db01@test.com", "https://db01.com", "DB01").await;

    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri(format!("/api/bookmarks/{}", bm.id)),
        "db01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: DeleteBookmarkResponse = parse_json(resp).await;
    assert_eq!(r.id, bm.id);
}

/// DB-02: deleted bookmark no longer appears in list.
async fn db_02_deleted_bookmark_absent_from_list(state: &AppState) {
    let bm = create_bookmark(state, "db02@test.com", "https://db02.com", "DB02").await;

    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri(format!("/api/bookmarks/{}", bm.id)),
        "db02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    send(state.clone(), req).await;

    let req = with_auth(
        Request::builder().method("GET").uri("/api/bookmarks"),
        "db02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    let body: ListBookmarksResponse = parse_json(resp).await;
    assert!(body.bookmarks.iter().all(|b| b.id != bm.id));
}

/// DB-03: non-existent id → 404.
async fn db_03_missing_id_returns_404(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri("/api/bookmarks/00000000-0000-0000-0000-000000000000"),
        "db03@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// DB-04: id belonging to another user → 404.
async fn db_04_other_user_id_returns_404(state: &AppState) {
    let bm = create_bookmark(state, "db04a@test.com", "https://db04.com", "DB04").await;

    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri(format!("/api/bookmarks/{}", bm.id)),
        "db04b@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── CL: click bookmark ───────────────────────────────────────────────────────

/// CL-01: existing bookmark → 200, click count incremented by one.
async fn cl_01_click_increments_counter(state: &AppState) {
    let bm = create_bookmark(state, "cl01@test.com", "https://cl01.com", "CL01").await;
    assert_eq!(bm.click, 0);

    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri(format!("/api/bookmarks/{}/click", bm.id)),
        "cl01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/bookmarks/{}", bm.id)),
        "cl01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    let r: GetBookmarkResponse = parse_json(resp).await;
    assert_eq!(r.bookmark.click, 1);
}

/// CL-02: non-existent id → 404.
async fn cl_02_missing_id_returns_404(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/bookmarks/00000000-0000-0000-0000-000000000000/click"),
        "cl02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── test runner ──────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requires RUN_TESTCONTAINERS=1"]
async fn bookmark_handler_tests() {
    let (_container, state) = bootstrap_test_state().await;

    au_01_no_token_returns_400(&state).await;
    au_02_invalid_token_returns_400(&state).await;
    lb_01_empty_list_for_new_user(&state).await;
    lb_02_returns_all_user_bookmarks(&state).await;
    lb_03_bookmarks_isolated_per_user(&state).await;
    cb_01_valid_payload_returns_bookmark(&state).await;
    cb_02_invalid_json_returns_400(&state).await;
    cb_03_created_bookmark_visible_in_list(&state).await;
    gb_01_existing_id_returns_bookmark(&state).await;
    gb_02_missing_id_returns_404(&state).await;
    gb_03_other_user_id_returns_404(&state).await;
    ub_01_valid_update_returns_updated_bookmark(&state).await;
    ub_02_missing_id_returns_404(&state).await;
    ub_03_other_user_id_returns_404(&state).await;
    db_01_existing_id_returns_deleted_id(&state).await;
    db_02_deleted_bookmark_absent_from_list(&state).await;
    db_03_missing_id_returns_404(&state).await;
    db_04_other_user_id_returns_404(&state).await;
    cl_01_click_increments_counter(&state).await;
    cl_02_missing_id_returns_404(&state).await;
}
