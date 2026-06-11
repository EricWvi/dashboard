# Tiptap handler test cases

Routes under test:
- `POST   /api/tiptaps`
- `GET    /api/tiptaps/{id}`
- `PUT    /api/tiptaps/{id}`
- `GET    /api/tiptaps/{id}/history`
- `POST   /api/tiptaps/{id}/history/restore`
- `GET    /api/quicknotes`
- `POST   /api/quicknotes`
- `PUT    /api/quicknotes/{id}`
- `DELETE /api/quicknotes/{id}`
- `POST   /api/quicknotes/{id}/bottom`

---

## AU — authentication (cross-cutting)

```
/// AU-01: request with no token → 400.
async fn au_01_no_token_returns_400

/// AU-02: request with a corrupted token → 400.
async fn au_02_invalid_token_returns_400
```

---

## CT — create tiptap  `POST /api/tiptaps`

```
/// CT-01: valid payload → 200, response tiptap matches requested site and content.
async fn ct_01_valid_payload_returns_tiptap

/// CT-02: invalid JSON syntax → 400.
async fn ct_02_invalid_json_returns_400

/// CT-03: created tiptap is retrievable via GET immediately after creation.
async fn ct_03_created_tiptap_visible_in_get
```

---

## GT — get tiptap  `GET /api/tiptaps/{id}`

```
/// GT-01: existing tiptap → 200, correct document returned.
async fn gt_01_existing_id_returns_tiptap

/// GT-02: non-existent id → 404.
async fn gt_02_missing_id_returns_404

/// GT-03: id belonging to another user → 404.
async fn gt_03_other_user_id_returns_404
```

---

## UT — update tiptap  `PUT /api/tiptaps/{id}`

```
/// UT-01: valid update payload → 200.
async fn ut_01_valid_update_returns_200

/// UT-02: previous content is pushed into history after update.
async fn ut_02_old_content_moved_to_history

/// UT-03: non-existent id → 404.
async fn ut_03_missing_id_returns_404

/// UT-04: id belonging to another user → 404.
async fn ut_04_other_user_id_returns_404
```

---

## LH — list tiptap history  `GET /api/tiptaps/{id}/history`

```
/// LH-01: newly created document with no updates → 200, empty history list.
async fn lh_01_no_history_returns_empty_list

/// LH-02: document updated once → 200, history list has exactly one entry.
async fn lh_02_one_update_history_length_one

/// LH-03: document updated twice → 200, history list has exactly two entries.
async fn lh_03_two_updates_history_length_two

/// LH-04: document updated multiple times → 200, timestamps returned in descending order.
async fn lh_04_history_sorted_descending

/// LH-05: non-existent tiptap id → 404.
async fn lh_05_missing_id_returns_404

/// LH-06: id belonging to another user → 404.
async fn lh_06_other_user_id_returns_404
```

---

## RH — restore tiptap history  `POST /api/tiptaps/{id}/history/restore`

```
/// RH-01: valid ts → 200, document content restored to the matching snapshot.
async fn rh_01_valid_ts_restores_content

/// RH-02: non-existent tiptap id → 404.
async fn rh_02_missing_tiptap_returns_404

/// RH-03: ts not present in history → 404.
async fn rh_03_missing_ts_returns_404

/// RH-04: id belonging to another user → 404.
async fn rh_04_other_user_id_returns_404
```

---

## LQ — list quick notes  `GET /api/quicknotes`

```
/// LQ-01: no quick notes exist for user → 200, empty list.
async fn lq_01_empty_list_for_new_user

/// LQ-02: user has quick notes → 200, all quick notes returned.
async fn lq_02_returns_all_user_quick_notes

/// LQ-03: user A's quick notes are not visible to user B.
async fn lq_03_quick_notes_isolated_per_user
```

---

## CQ — create quick note  `POST /api/quicknotes`

```
/// CQ-01: valid payload → 200, response quick note matches request fields.
async fn cq_01_valid_payload_returns_quick_note

/// CQ-02: first quick note for a user → order assigned as 1.
async fn cq_02_first_note_gets_order_one

/// CQ-03: second quick note → order is previous max + 1.
async fn cq_03_subsequent_note_increments_order

/// CQ-04: invalid JSON syntax → 400.
async fn cq_04_invalid_json_returns_400
```

---

## UQ — update quick note  `PUT /api/quicknotes/{id}`

```
/// UQ-01: valid update payload → 200.
async fn uq_01_valid_update_returns_200

/// UQ-02: non-existent id → 404.
async fn uq_02_missing_id_returns_404

/// UQ-03: id belonging to another user → 404.
async fn uq_03_other_user_id_returns_404
```

---

## DQ — delete quick note  `DELETE /api/quicknotes/{id}`

```
/// DQ-01: existing quick note → 200, response contains deleted id.
async fn dq_01_existing_id_returns_deleted_id

/// DQ-02: deleted quick note no longer appears in list.
async fn dq_02_deleted_note_absent_from_list

/// DQ-03: non-existent id → 404.
async fn dq_03_missing_id_returns_404

/// DQ-04: id belonging to another user → 404.
async fn dq_04_other_user_id_returns_404
```

---

## BQ — bottom quick note  `POST /api/quicknotes/{id}/bottom`

```
/// BQ-01: existing quick note → 200, note order set to current min - 1.
async fn bq_01_bottom_decrements_order

/// BQ-02: sole quick note moved to bottom → order becomes -1.
async fn bq_02_sole_note_gets_order_minus_one

/// BQ-03: non-existent id → 404.
async fn bq_03_missing_id_returns_404

/// BQ-04: id belonging to another user → 404.
async fn bq_04_other_user_id_returns_404
```
