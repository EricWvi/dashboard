# Bookmark handler test cases

Routes under test:
- `GET    /api/bookmarks`
- `POST   /api/bookmarks`
- `GET    /api/bookmarks/{id}`
- `PUT    /api/bookmarks/{id}`
- `DELETE /api/bookmarks/{id}`
- `POST   /api/bookmarks/{id}/click`

---

## AU — authentication (cross-cutting)

```
/// AU-01: request with no token → 400.
async fn au_01_no_token_returns_400

/// AU-02: request with a corrupted token → 400.
async fn au_02_invalid_token_returns_400
```

---

## LB — list bookmarks  `GET /api/bookmarks`

```
/// LB-01: no bookmarks exist for user → 200, empty list.
async fn lb_01_empty_list_for_new_user

/// LB-02: user has bookmarks → 200, all bookmarks returned.
async fn lb_02_returns_all_user_bookmarks

/// LB-03: user A's bookmarks are not visible to user B.
async fn lb_03_bookmarks_isolated_per_user
```

---

## CB — create bookmark  `POST /api/bookmarks`

```
/// CB-01: valid payload → 200, response bookmark matches request fields.
async fn cb_01_valid_payload_returns_bookmark

/// CB-02: invalid JSON syntax → 400 (axum JsonSyntaxError maps to BAD_REQUEST).
async fn cb_02_invalid_json_returns_400

/// CB-03: created bookmark appears in subsequent list.
async fn cb_03_created_bookmark_visible_in_list
```

---

## GB — get bookmark  `GET /api/bookmarks/{id}`

```
/// GB-01: existing bookmark → 200, correct bookmark returned.
async fn gb_01_existing_id_returns_bookmark

/// GB-02: non-existent id → 404.
async fn gb_02_missing_id_returns_404

/// GB-03: id belonging to another user → 404.
async fn gb_03_other_user_id_returns_404
```

---

## UB — update bookmark  `PUT /api/bookmarks/{id}`

```
/// UB-01: valid update payload → 200, response reflects new values.
async fn ub_01_valid_update_returns_updated_bookmark

/// UB-02: non-existent id → 404.
async fn ub_02_missing_id_returns_404

/// UB-03: id belonging to another user → 404.
async fn ub_03_other_user_id_returns_404
```

---

## DB — delete bookmark  `DELETE /api/bookmarks/{id}`

```
/// DB-01: existing bookmark → 200, response contains deleted id.
async fn db_01_existing_id_returns_deleted_id

/// DB-02: deleted bookmark no longer appears in list.
async fn db_02_deleted_bookmark_absent_from_list

/// DB-03: non-existent id → 404.
async fn db_03_missing_id_returns_404

/// DB-04: id belonging to another user → 404.
async fn db_04_other_user_id_returns_404
```

---

## CL — click bookmark  `POST /api/bookmarks/{id}/click`

```
/// CL-01: existing bookmark → 200, click count incremented by one.
async fn cl_01_click_increments_counter

/// CL-02: non-existent id → 404.
async fn cl_02_missing_id_returns_404
```
