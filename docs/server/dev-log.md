# Development Log

## 2026-03-05: v2.10.0 Migration - Local-First V2 Models for Dashboard and Journal

### Changes:

1. **New V2 models** in `model/`:
   - `blogv2.go` - Blog with UUID id, draft as UUID, visibility, payload
   - `bookmarkv2.go` - Bookmark with URL, title, click count, domain, payload
   - `collectionv2.go` - Collection with name
   - `echov2.go` - Echo with type, year, sub, draft as UUID, mark
   - `entryv2.go` - Entry with draft as UUID, payload, word count, raw text, bookmark, review count
   - `quicknotev2.go` - QuickNote with title, draft as UUID, order
   - `tagv2.go` - Tag with name and t_group (scoped to "dashboard" or "journal")
   - `todov2.go` - Todo with title, completed, collection_id as UUID, difficulty, order, link, draft, schedule, done, count, kanban as UUID
   - `watchv2.go` - Watch with type, title, status, year, rate, payload, author

2. **New `handler/dashboard/`** package:
   - `base.go` - Handler dispatcher
   - `full.go` - FullSync: fetches all non-deleted dashboard data (user, tag, blog, bookmark, collection, echo, quickNote, todo, watch, tiptap with site=SiteDashboard)
   - `pull.go` - Pull: incremental sync since a given server_version
   - `push.go` - Push: upsert dashboard entities (tag with group="dashboard", blog, bookmark, collection, echo, quickNote, todo, watch, tiptap with site=SiteDashboard)

3. **New `handler/journal/`** package:
   - `base.go` - Handler dispatcher
   - `full.go` - FullSync: fetches all non-deleted journal data (user, entry, tag, tiptap with site=SiteJournal)
   - `pull.go` - Pull: incremental sync for journal (user, entry, tag, tiptap)
   - `push.go` - Push: upsert journal entities (entry, tag with group="journal", tiptap with site=SiteJournal)

4. **Updated `router.go`**: Registered `/dashboard` and `/journal` GET/POST endpoints

5. **Updated `.gitignore`**: Changed `dashboard` to `/dashboard` to avoid ignoring the `handler/dashboard/` directory

### Design Notes:
- All new v2 models follow the `MetaFieldV2` pattern (UUID id, int64 timestamps, server_version, is_deleted)
- `d_tag_v2` uses `t_group` column to scope tags per site ("dashboard" or "journal")
- `d_tiptap_v2` uses `site` column (SiteDashboard=1, SiteJournal=2, SiteFlomo=3) to scope tiptap documents
- `d_user_v2` is shared across all sync endpoints
- Push handlers enforce `t_group` and `site` server-side to prevent cross-site data leaks
- Database migration `v2.10.0` already exists in `migration/migrations.go` (creates all new tables with triggers)

## 2026-02-23: v2.9.0 Migration - Pointer Types for Boolean Fields

### Changes:
1. **Updated `MetaFieldV2` in `model/model.go`**: Changed `IsDeleted` from `bool` to `*bool`
   - Reason: GORM ignores zero values (`false`) when updating, preventing proper soft-deletes

2. **Added `is_bookmarked` and `is_archived` fields to Card model** (`model/card.go`):
   - Added `IsBookmarked *bool` field with column mapping
   - Added `IsArchived *bool` field with column mapping
   - Added constants `Card_IsBookmarked` and `Card_IsArchived`

3. **Added `is_bookmarked` and `is_archived` fields to Folder model** (`model/folder.go`):
   - Added `IsBookmarked *bool` field with column mapping
   - Added `IsArchived *bool` field with column mapping
   - Added constants `Folder_IsBookmarked` and `Folder_IsArchived`

4. **Added helper function `BoolPtr`** in `model/model.go`:
   - Utility to create boolean pointers from bool values

5. **Updated all `IsDeleted` usages** in `card.go`, `folder.go`, and `tiptapv2.go`:
   - `FullCards`, `FullFolders`, `FullTiptapV2`: Use `BoolPtr(false)` for filtering
   - `MarkDeleted` methods: Use `BoolPtr(true)` for deletion

### Why Pointer Types for Booleans?
GORM treats zero values (like `false` for booleans) as "not set" during updates. This means setting a boolean to `false` would be ignored. Using pointer types (`*bool`) allows:
- `nil` = field not included in update
- `&false` = explicitly set to false
- `&true` = explicitly set to true

### Migration Notes:
- Database migration `v2.9.0` already exists in `migration/migrations.go`
- Adds `is_bookmarked` and `is_archived` columns to `d_card` and `d_folder` tables
- Default value is `FALSE` in database
