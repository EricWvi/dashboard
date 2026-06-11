# Tag handler test cases

Routes under test:
- `GET    /api/tags`
- `POST   /api/tags`
- `DELETE /api/tags`

---

## AU — authentication (cross-cutting)

```
/// AU-01: request with no token → 400.
async fn au_01_no_token_returns_400

/// AU-02: request with a corrupted token → 400.
async fn au_02_invalid_token_returns_400
```

---

## LT — list tags  `GET /api/tags`

```
/// LT-01: no tags exist for the requested group → 200, empty list.
async fn lt_01_empty_list_for_new_group

/// LT-02: group has tags → 200, all non-deleted tags returned.
async fn lt_02_returns_all_tags_for_group

/// LT-03: only tags belonging to the requested group are returned; other groups excluded.
async fn lt_03_results_scoped_to_group

/// LT-04: soft-deleted tags are excluded from the result list.
async fn lt_04_deleted_tags_excluded

/// LT-05: user A's tags are not visible to user B.
async fn lt_05_tags_isolated_per_user

/// LT-06: results are ordered by created_at ascending.
async fn lt_06_results_ordered_by_created_at_asc
```

---

## CT — create tags  `POST /api/tags`

```
/// CT-01: single tag in the batch → 200, empty response body.
async fn ct_01_single_tag_returns_200

/// CT-02: multiple tags in the batch → 200, all tags created.
async fn ct_02_multiple_tags_all_created

/// CT-03: created tags appear in subsequent list for the same group.
async fn ct_03_created_tags_visible_in_list

/// CT-04: tags created under group A do not appear when listing group B.
async fn ct_04_tags_scoped_to_group_on_create

/// CT-05: invalid JSON syntax → 400.
async fn ct_05_invalid_json_returns_400
```

---

## DT — delete tag  `DELETE /api/tags`

```
/// DT-01: existing tag → 200, empty response body.
async fn dt_01_existing_tag_returns_200

/// DT-02: deleted tag no longer appears in subsequent list.
async fn dt_02_deleted_tag_absent_from_list

/// DT-03: non-existent name/group combination → 200 (soft-delete of missing row is a no-op, not an error).
async fn dt_03_missing_tag_returns_200

/// DT-04: deleting tag belonging to another user → 200, but that user's tag is unaffected.
async fn dt_04_other_user_tag_unaffected

/// DT-05: invalid JSON syntax → 400.
async fn dt_05_invalid_json_returns_400
```
