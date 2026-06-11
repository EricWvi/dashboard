// Handler integration tests for tiptap and quicknote endpoints.

use axum::body::Body;
use axum::http::{Request, Response, StatusCode};
use only_contracts::{
    CreateQuickNoteResponse, CreateTiptapResponse, DeleteQuickNoteResponse, GetTiptapResponse,
    ListQuickNotesResponse, ListTiptapHistoryResponse, QuickNoteView, TiptapView,
};
use pretty_assertions::assert_eq;
use serde_json::{Value, json};

use super::{bootstrap_test_state, send, with_auth};
use crate::app_state::AppState;

// These timestamps are used as known `ts` values in update calls so that history
// entries carry predictable times. Both must exceed `now_millis()` at test time so
// that the two history entries sort in a deterministic descending order.
const TS1: i64 = 1_750_000_001_000;
const TS2: i64 = 1_750_000_002_000;

async fn parse_json<T: serde::de::DeserializeOwned>(resp: Response<Body>) -> T {
    let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .expect("failed to collect response body");
    serde_json::from_slice(&bytes).expect("failed to deserialize response JSON")
}

/// Creates a tiptap document via the HTTP handler and returns the saved view.
async fn create_tiptap(state: &AppState, email: &str, site: i16, content: Value) -> TiptapView {
    let body = json!({ "site": site, "content": content });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/tiptaps")
            .header("content-type", "application/json"),
        email,
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: CreateTiptapResponse = parse_json(resp).await;
    r.tiptap
}

/// Sends PUT /api/tiptaps/{id} and asserts 200.
async fn update_tiptap(state: &AppState, email: &str, id: &str, content: Value, ts: i64) {
    let body = json!({ "content": content, "ts": ts });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri(format!("/api/tiptaps/{id}"))
            .header("content-type", "application/json"),
        email,
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
}

/// Creates a quick note via the HTTP handler and returns the saved view.
async fn create_quick_note(state: &AppState, email: &str, title: &str) -> QuickNoteView {
    let body = json!({ "title": title, "draft": null });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/quicknotes")
            .header("content-type", "application/json"),
        email,
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: CreateQuickNoteResponse = parse_json(resp).await;
    r.quick_note
}

// ─── AU: authentication ───────────────────────────────────────────────────────

/// AU-01: request with no token → 400.
async fn au_01_no_token_returns_400(state: &AppState) {
    let req = Request::builder()
        .method("GET")
        .uri("/api/quicknotes")
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// AU-02: request with a corrupted token → 400.
async fn au_02_invalid_token_returns_400(state: &AppState) {
    let req = Request::builder()
        .method("GET")
        .uri("/api/quicknotes")
        .header("onlyquant-token", "not-a-valid-base64-token")
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── CT: create tiptap ────────────────────────────────────────────────────────

/// CT-01: valid payload → 200, response tiptap matches requested site and content.
async fn ct_01_valid_payload_returns_tiptap(state: &AppState) {
    let content = json!({"type": "doc", "content": []});
    let body = json!({ "site": 1_i16, "content": content });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/tiptaps")
            .header("content-type", "application/json"),
        "ct01@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: CreateTiptapResponse = parse_json(resp).await;
    assert_eq!(r.tiptap.site, 1);
    assert_eq!(r.tiptap.content, content);
    assert!(r.tiptap.history.is_empty());
}

/// CT-02: invalid JSON syntax → 400.
async fn ct_02_invalid_json_returns_400(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/tiptaps")
            .header("content-type", "application/json"),
        "ct02@test.com",
    )
    .body(Body::from("not json"))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// CT-03: created tiptap is retrievable via GET immediately after creation.
async fn ct_03_created_tiptap_visible_in_get(state: &AppState) {
    let t = create_tiptap(
        state,
        "ct03@test.com",
        1,
        json!({"type": "doc", "content": []}),
    )
    .await;
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tiptaps/{}", t.id)),
        "ct03@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: GetTiptapResponse = parse_json(resp).await;
    assert_eq!(r.tiptap, t);
}

// ─── GT: get tiptap ───────────────────────────────────────────────────────────

/// GT-01: existing tiptap → 200, correct document returned.
async fn gt_01_existing_id_returns_tiptap(state: &AppState) {
    let t = create_tiptap(state, "gt01@test.com", 1, json!({"type": "doc"})).await;
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tiptaps/{}", t.id)),
        "gt01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: GetTiptapResponse = parse_json(resp).await;
    assert_eq!(r.tiptap, t);
}

/// GT-02: non-existent id → 404.
async fn gt_02_missing_id_returns_404(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri("/api/tiptaps/00000000-0000-0000-0000-000000000000"),
        "gt02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// GT-03: id belonging to another user → 404.
async fn gt_03_other_user_id_returns_404(state: &AppState) {
    let t = create_tiptap(state, "gt03a@test.com", 1, json!({})).await;
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tiptaps/{}", t.id)),
        "gt03b@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── UT: update tiptap ────────────────────────────────────────────────────────

/// UT-01: valid update payload → 200.
async fn ut_01_valid_update_returns_200(state: &AppState) {
    let t = create_tiptap(state, "ut01@test.com", 1, json!({"type": "doc"})).await;
    let body = json!({ "content": {"type": "doc", "version": 2}, "ts": TS1 });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri(format!("/api/tiptaps/{}", t.id))
            .header("content-type", "application/json"),
        "ut01@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
}

/// UT-02: previous content is pushed into history after update.
async fn ut_02_old_content_moved_to_history(state: &AppState) {
    let original = json!({"type": "doc", "text": "original"});
    let t = create_tiptap(state, "ut02@test.com", 1, original.clone()).await;
    update_tiptap(
        state,
        "ut02@test.com",
        &t.id,
        json!({"type": "doc", "text": "updated"}),
        TS1,
    )
    .await;

    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tiptaps/{}", t.id)),
        "ut02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    let r: GetTiptapResponse = parse_json(resp).await;
    assert_eq!(r.tiptap.history.len(), 1);
    assert_eq!(r.tiptap.history[0].content, original);
}

/// UT-03: non-existent id → 404.
async fn ut_03_missing_id_returns_404(state: &AppState) {
    let body = json!({ "content": {}, "ts": TS1 });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri("/api/tiptaps/00000000-0000-0000-0000-000000000000")
            .header("content-type", "application/json"),
        "ut03@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// UT-04: id belonging to another user → 404.
async fn ut_04_other_user_id_returns_404(state: &AppState) {
    let t = create_tiptap(state, "ut04a@test.com", 1, json!({})).await;
    let body = json!({ "content": {}, "ts": TS1 });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri(format!("/api/tiptaps/{}", t.id))
            .header("content-type", "application/json"),
        "ut04b@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── LH: list tiptap history ──────────────────────────────────────────────────

/// LH-01: newly created document with no updates → 200, empty history list.
async fn lh_01_no_history_returns_empty_list(state: &AppState) {
    let t = create_tiptap(state, "lh01@test.com", 1, json!({})).await;
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tiptaps/{}/history", t.id)),
        "lh01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: ListTiptapHistoryResponse = parse_json(resp).await;
    assert!(r.history.is_empty());
}

/// LH-02: document updated once → 200, history list has exactly one entry.
async fn lh_02_one_update_history_length_one(state: &AppState) {
    let t = create_tiptap(state, "lh02@test.com", 1, json!({})).await;
    update_tiptap(state, "lh02@test.com", &t.id, json!({"v": 1}), TS1).await;
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tiptaps/{}/history", t.id)),
        "lh02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: ListTiptapHistoryResponse = parse_json(resp).await;
    assert_eq!(r.history.len(), 1);
}

/// LH-03: document updated twice → 200, history list has exactly two entries.
async fn lh_03_two_updates_history_length_two(state: &AppState) {
    let t = create_tiptap(state, "lh03@test.com", 1, json!({})).await;
    update_tiptap(state, "lh03@test.com", &t.id, json!({"v": 1}), TS1).await;
    update_tiptap(state, "lh03@test.com", &t.id, json!({"v": 2}), TS2).await;
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tiptaps/{}/history", t.id)),
        "lh03@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: ListTiptapHistoryResponse = parse_json(resp).await;
    assert_eq!(r.history.len(), 2);
}

/// LH-04: document updated multiple times → 200, timestamps returned in descending order.
async fn lh_04_history_sorted_descending(state: &AppState) {
    let t = create_tiptap(state, "lh04@test.com", 1, json!({})).await;
    // First update uses TS1 so the second history entry carries time=TS1;
    // second update uses TS2 so the first history entry carries time=TS1 > original created_at.
    update_tiptap(state, "lh04@test.com", &t.id, json!({"v": 1}), TS1).await;
    update_tiptap(state, "lh04@test.com", &t.id, json!({"v": 2}), TS2).await;
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tiptaps/{}/history", t.id)),
        "lh04@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: ListTiptapHistoryResponse = parse_json(resp).await;
    assert_eq!(r.history.len(), 2);
    assert!(
        r.history[0] > r.history[1],
        "history timestamps must be in descending order"
    );
}

/// LH-05: non-existent tiptap id → 404.
async fn lh_05_missing_id_returns_404(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri("/api/tiptaps/00000000-0000-0000-0000-000000000000/history"),
        "lh05@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// LH-06: id belonging to another user → 404.
async fn lh_06_other_user_id_returns_404(state: &AppState) {
    let t = create_tiptap(state, "lh06a@test.com", 1, json!({})).await;
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tiptaps/{}/history", t.id)),
        "lh06b@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── RH: restore tiptap history ──────────────────────────────────────────────

/// RH-01: valid ts → 200, document content restored to the matching snapshot.
///
/// Timeline: create with C0, update to C1 (ts=TS1), update to C2 (ts=TS2).
/// After the second update the history entry for TS1 holds C1. Restoring TS1
/// sets the live content back to C1.
async fn rh_01_valid_ts_restores_content(state: &AppState) {
    let c0 = json!({"text": "original"});
    let c1 = json!({"text": "first edit"});
    let c2 = json!({"text": "second edit"});

    let t = create_tiptap(state, "rh01@test.com", 1, c0).await;
    update_tiptap(state, "rh01@test.com", &t.id, c1.clone(), TS1).await;
    update_tiptap(state, "rh01@test.com", &t.id, c2, TS2).await;

    let body = json!({ "ts": TS1 });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri(format!("/api/tiptaps/{}/history/restore", t.id))
            .header("content-type", "application/json"),
        "rh01@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/tiptaps/{}", t.id)),
        "rh01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    let r: GetTiptapResponse = parse_json(resp).await;
    assert_eq!(r.tiptap.content, c1);
}

/// RH-02: non-existent tiptap id → 404.
async fn rh_02_missing_tiptap_returns_404(state: &AppState) {
    let body = json!({ "ts": TS1 });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/tiptaps/00000000-0000-0000-0000-000000000000/history/restore")
            .header("content-type", "application/json"),
        "rh02@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// RH-03: ts not present in history → 404.
async fn rh_03_missing_ts_returns_404(state: &AppState) {
    let t = create_tiptap(state, "rh03@test.com", 1, json!({})).await;
    let body = json!({ "ts": TS1 });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri(format!("/api/tiptaps/{}/history/restore", t.id))
            .header("content-type", "application/json"),
        "rh03@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// RH-04: id belonging to another user → 404.
async fn rh_04_other_user_id_returns_404(state: &AppState) {
    let t = create_tiptap(state, "rh04a@test.com", 1, json!({})).await;
    update_tiptap(state, "rh04a@test.com", &t.id, json!({"v": 1}), TS1).await;
    let body = json!({ "ts": TS1 });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri(format!("/api/tiptaps/{}/history/restore", t.id))
            .header("content-type", "application/json"),
        "rh04b@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── LQ: list quick notes ─────────────────────────────────────────────────────

/// LQ-01: no quick notes exist for user → 200, empty list.
async fn lq_01_empty_list_for_new_user(state: &AppState) {
    let req = with_auth(
        Request::builder().method("GET").uri("/api/quicknotes"),
        "lq01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: ListQuickNotesResponse = parse_json(resp).await;
    assert_eq!(r.quick_notes, vec![]);
}

/// LQ-02: user has quick notes → 200, all quick notes returned.
async fn lq_02_returns_all_user_quick_notes(state: &AppState) {
    let n1 = create_quick_note(state, "lq02@test.com", "Note 1").await;
    let n2 = create_quick_note(state, "lq02@test.com", "Note 2").await;

    let req = with_auth(
        Request::builder().method("GET").uri("/api/quicknotes"),
        "lq02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: ListQuickNotesResponse = parse_json(resp).await;
    assert_eq!(r.quick_notes.len(), 2);
    assert!(r.quick_notes.iter().any(|n| n.id == n1.id));
    assert!(r.quick_notes.iter().any(|n| n.id == n2.id));
}

/// LQ-03: user A's quick notes are not visible to user B.
async fn lq_03_quick_notes_isolated_per_user(state: &AppState) {
    create_quick_note(state, "lq03a@test.com", "Private Note").await;
    let req = with_auth(
        Request::builder().method("GET").uri("/api/quicknotes"),
        "lq03b@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: ListQuickNotesResponse = parse_json(resp).await;
    assert_eq!(r.quick_notes, vec![]);
}

// ─── CQ: create quick note ────────────────────────────────────────────────────

/// CQ-01: valid payload → 200, response quick note matches request fields.
async fn cq_01_valid_payload_returns_quick_note(state: &AppState) {
    let body = json!({ "title": "My Note", "draft": null });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/quicknotes")
            .header("content-type", "application/json"),
        "cq01@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: CreateQuickNoteResponse = parse_json(resp).await;
    assert_eq!(r.quick_note.title, "My Note");
    assert_eq!(r.quick_note.draft, None);
}

/// CQ-02: first quick note for a user → order assigned as 1.
async fn cq_02_first_note_gets_order_one(state: &AppState) {
    let n = create_quick_note(state, "cq02@test.com", "First").await;
    assert_eq!(n.order, Some(1));
}

/// CQ-03: second quick note → order is previous max + 1.
async fn cq_03_subsequent_note_increments_order(state: &AppState) {
    let n1 = create_quick_note(state, "cq03@test.com", "First").await;
    let n2 = create_quick_note(state, "cq03@test.com", "Second").await;
    assert_eq!(n1.order, Some(1));
    assert_eq!(n2.order, Some(2));
}

/// CQ-04: invalid JSON syntax → 400.
async fn cq_04_invalid_json_returns_400(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/quicknotes")
            .header("content-type", "application/json"),
        "cq04@test.com",
    )
    .body(Body::from("not json"))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── UQ: update quick note ────────────────────────────────────────────────────

/// UQ-01: valid update payload → 200.
async fn uq_01_valid_update_returns_200(state: &AppState) {
    let n = create_quick_note(state, "uq01@test.com", "Original").await;
    let body = json!({ "title": "Updated", "draft": null, "order": null });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri(format!("/api/quicknotes/{}", n.id))
            .header("content-type", "application/json"),
        "uq01@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
}

/// UQ-02: non-existent id → 404.
async fn uq_02_missing_id_returns_404(state: &AppState) {
    let body = json!({ "title": "X", "draft": null, "order": null });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri("/api/quicknotes/00000000-0000-0000-0000-000000000000")
            .header("content-type", "application/json"),
        "uq02@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// UQ-03: id belonging to another user → 404.
async fn uq_03_other_user_id_returns_404(state: &AppState) {
    let n = create_quick_note(state, "uq03a@test.com", "Note").await;
    let body = json!({ "title": "Steal", "draft": null, "order": null });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri(format!("/api/quicknotes/{}", n.id))
            .header("content-type", "application/json"),
        "uq03b@test.com",
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── DQ: delete quick note ────────────────────────────────────────────────────

/// DQ-01: existing quick note → 200, response contains deleted id.
async fn dq_01_existing_id_returns_deleted_id(state: &AppState) {
    let n = create_quick_note(state, "dq01@test.com", "To Delete").await;
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri(format!("/api/quicknotes/{}", n.id)),
        "dq01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let r: DeleteQuickNoteResponse = parse_json(resp).await;
    assert_eq!(r.id, n.id);
}

/// DQ-02: deleted quick note no longer appears in list.
async fn dq_02_deleted_note_absent_from_list(state: &AppState) {
    let n = create_quick_note(state, "dq02@test.com", "Gone").await;
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri(format!("/api/quicknotes/{}", n.id)),
        "dq02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    send(state.clone(), req).await;

    let req = with_auth(
        Request::builder().method("GET").uri("/api/quicknotes"),
        "dq02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    let r: ListQuickNotesResponse = parse_json(resp).await;
    assert!(r.quick_notes.iter().all(|note| note.id != n.id));
}

/// DQ-03: non-existent id → 404.
async fn dq_03_missing_id_returns_404(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri("/api/quicknotes/00000000-0000-0000-0000-000000000000"),
        "dq03@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// DQ-04: id belonging to another user → 404.
async fn dq_04_other_user_id_returns_404(state: &AppState) {
    let n = create_quick_note(state, "dq04a@test.com", "Note").await;
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri(format!("/api/quicknotes/{}", n.id)),
        "dq04b@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── BQ: bottom quick note ────────────────────────────────────────────────────

/// BQ-01: existing quick note with other notes present → 200, note order set to min - 1.
///
/// With two fresh notes (orders 1, 2), min=1, so bottom sets order to (1-1).min(-1)=-1.
/// 0 is skipped because the Go-era COALESCE default was 0; all real orders are non-zero.
async fn bq_01_bottom_decrements_order(state: &AppState) {
    let n1 = create_quick_note(state, "bq01@test.com", "Note 1").await;
    let n2 = create_quick_note(state, "bq01@test.com", "Note 2").await;
    assert_eq!(n1.order, Some(1));
    assert_eq!(n2.order, Some(2));

    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri(format!("/api/quicknotes/{}/bottom", n2.id)),
        "bq01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let req = with_auth(
        Request::builder().method("GET").uri("/api/quicknotes"),
        "bq01@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    let r: ListQuickNotesResponse = parse_json(resp).await;
    let updated_n2 = r.quick_notes.iter().find(|n| n.id == n2.id).unwrap();
    assert_eq!(updated_n2.order, Some(-1));
}

/// BQ-02: sole quick note moved to bottom → order becomes -1 (skipping Go zero-value 0).
async fn bq_02_sole_note_gets_order_minus_one(state: &AppState) {
    let n = create_quick_note(state, "bq02@test.com", "Only Note").await;
    assert_eq!(n.order, Some(1));

    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri(format!("/api/quicknotes/{}/bottom", n.id)),
        "bq02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let req = with_auth(
        Request::builder().method("GET").uri("/api/quicknotes"),
        "bq02@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    let r: ListQuickNotesResponse = parse_json(resp).await;
    let updated = r.quick_notes.iter().find(|note| note.id == n.id).unwrap();
    assert_eq!(updated.order, Some(-1));
}

/// BQ-03: non-existent id → 404.
async fn bq_03_missing_id_returns_404(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/quicknotes/00000000-0000-0000-0000-000000000000/bottom"),
        "bq03@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// BQ-04: id belonging to another user → 404.
async fn bq_04_other_user_id_returns_404(state: &AppState) {
    let n = create_quick_note(state, "bq04a@test.com", "Note").await;
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri(format!("/api/quicknotes/{}/bottom", n.id)),
        "bq04b@test.com",
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── test runner ──────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requires RUN_TESTCONTAINERS=1"]
async fn tiptap_handler_tests() {
    let (_container, state) = bootstrap_test_state().await;

    au_01_no_token_returns_400(&state).await;
    au_02_invalid_token_returns_400(&state).await;
    ct_01_valid_payload_returns_tiptap(&state).await;
    ct_02_invalid_json_returns_400(&state).await;
    ct_03_created_tiptap_visible_in_get(&state).await;
    gt_01_existing_id_returns_tiptap(&state).await;
    gt_02_missing_id_returns_404(&state).await;
    gt_03_other_user_id_returns_404(&state).await;
    ut_01_valid_update_returns_200(&state).await;
    ut_02_old_content_moved_to_history(&state).await;
    ut_03_missing_id_returns_404(&state).await;
    ut_04_other_user_id_returns_404(&state).await;
    lh_01_no_history_returns_empty_list(&state).await;
    lh_02_one_update_history_length_one(&state).await;
    lh_03_two_updates_history_length_two(&state).await;
    lh_04_history_sorted_descending(&state).await;
    lh_05_missing_id_returns_404(&state).await;
    lh_06_other_user_id_returns_404(&state).await;
    rh_01_valid_ts_restores_content(&state).await;
    rh_02_missing_tiptap_returns_404(&state).await;
    rh_03_missing_ts_returns_404(&state).await;
    rh_04_other_user_id_returns_404(&state).await;
    lq_01_empty_list_for_new_user(&state).await;
    lq_02_returns_all_user_quick_notes(&state).await;
    lq_03_quick_notes_isolated_per_user(&state).await;
    cq_01_valid_payload_returns_quick_note(&state).await;
    cq_02_first_note_gets_order_one(&state).await;
    cq_03_subsequent_note_increments_order(&state).await;
    cq_04_invalid_json_returns_400(&state).await;
    uq_01_valid_update_returns_200(&state).await;
    uq_02_missing_id_returns_404(&state).await;
    uq_03_other_user_id_returns_404(&state).await;
    dq_01_existing_id_returns_deleted_id(&state).await;
    dq_02_deleted_note_absent_from_list(&state).await;
    dq_03_missing_id_returns_404(&state).await;
    dq_04_other_user_id_returns_404(&state).await;
    bq_01_bottom_decrements_order(&state).await;
    bq_02_sole_note_gets_order_minus_one(&state).await;
    bq_03_missing_id_returns_404(&state).await;
    bq_04_other_user_id_returns_404(&state).await;
}
