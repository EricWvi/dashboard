The backend is designed around models and actions on the models. Database tables are in `migration/migrations.go`. Models are defined in `model`.

The overall HTTP interface is through a `base` handler and using `Action` query and reflection to choose method on `base`. For each group of handlers, say `todo`, we will register it in `router.go`, using `GET` and `POST`. The corresponding handlers for actions of a specific model, say `todo`, are defined in `handler/<model>`, say `handler/todo`.

## Architecture

```
handler/flomo/                      # Local-first sync endpoints
├── base.go                         # Handler dispatcher
├── full.go                         # FullSync - initial sync
├── pull.go                         # Pull - incremental updates
└── push.go                         # Push - upload changes

model/
├── card.go                         # Card model and queries
├── folder.go                       # Folder model and queries
├── tiptapv2.go                     # Rich text document model
└── userv2.go                       # user v2 model
```

> **Note:** The traditional CRUD `handler/card/` package (CreateCard, GetCard, ListCards, UpdateCard, DeleteCard, and Folder equivalents) was removed. Cards and folders are now exclusively managed through the Flomo local-first sync endpoints (`/flomo`).

## Server-Side Behavior

1. **Global Version Sequence**:
   - All Flomo tables share `global_sync_version_seq`
   - Database triggers auto-increment `server_version` on write
   - Ensures total ordering across all changes

2. **Upsert Logic** (in `Push`):
   - Check if record exists by UUID
   - If not found → Create new record
   - If found → Compare `updatedAt`, update if client is newer
   - `SyncFromClient()` calls `OmitMetaFields()` to omit `id`, `created_at`, `server_version`, and `creator_id` before writing, so the DB trigger controls `server_version`
   - Uses `UpdateColumns` (not `Updates`) to ensure zero values are also written to the database

3. **Soft Deletes**:
   - `isDeleted` flag (`*bool` pointer type) instead of hard delete
   - Allows clients to learn about deletions
   - Prevents resurrection from stale offline data

4. **Archive & Bookmark Flags**:
   - `is_archived` and `is_bookmarked` (SMALLINT, 0/1) on d_card and d_folder
   - Clients filter display based on these flags; server stores and syncs them like any other field

5. **Concurrent Processing**:
   - All Flomo sync handlers (`FullSync`, `Pull`, `Push`) use goroutines for parallel processing
   - `FullSync` and `Pull` fetch data for users, cards, folders, and tiptaps concurrently
   - `Push` processes each entity type (cards, folders, tiptaps) in parallel (3 goroutines)
   - Uses `sync.WaitGroup` for coordination and proper error handling
   - Significantly improves response time for sync operations

## Database Schema (from migration/migrations.go)

### Traditional Tables (auto-increment IDs, timestamp-based)

- **d_user**: id, email, avatar, username, language, rss_token, email_token, email_feed, timestamps
- **d_media**: id, creator_id, link (UUID), key, presigned_url, last_presigned_time, timestamps
- **d_todo**: id, creator_id, title, completed, collection_id, difficulty, d_order, link, draft, kanban, schedule, done, d_count, timestamps
- **d_collection**: id, creator_id, name, timestamps
- **d_blog**: id, creator_id, title, visibility, draft, payload (JSON), timestamps
- **d_bookmark**: id, creator_id, title, url, click, domain, payload (JSON), timestamps
- **d_echo**: id, creator_id, e_type, year, sub, draft, mark, timestamps
- **d_watch**: id, creator_id, w_type, title, status, year, rate, payload (JSON), author, timestamps
- **d_tiptap**: id, creator_id, content, ts, history, timestamps
- **d_quick_note**: id, creator_id, title, draft, d_order, timestamps
- **d_tag**: id, creator_id, name, timestamps
- **d_entry**: id, creator_id, draft, visibility, payload (JSON), word_count, raw_text, timestamps

### Local-First Sync Tables (UUID IDs, version-based)

These tables use **v2.7.0 migration and above** schema with local-first sync support:

- **d_user_v2**: id (SERIAL), email (VARCHAR, unique), rss_token (VARCHAR), email_token (VARCHAR), email_feed (VARCHAR), avatar (VARCHAR), username (VARCHAR), language (VARCHAR), updated_at (BIGINT), server_version (BIGINT)
- **d_card**: id (UUID), creator_id, folder_id (UUID), title, draft (UUID), payload (JSON), raw_text, review_count, is_bookmarked (SMALLINT default 0), is_archived (SMALLINT default 0), created_at (BIGINT), updated_at (BIGINT), server_version (BIGINT), is_deleted (BOOLEAN)
- **d_folder**: id (UUID), creator_id, parent_id (UUID), title, payload (JSON), is_bookmarked (SMALLINT default 0), is_archived (SMALLINT default 0), created_at (BIGINT), updated_at (BIGINT), server_version (BIGINT), is_deleted (BOOLEAN)
- **d_tiptap_v2**: id (UUID), creator_id, site (SMALLINT), content (JSON), history (JSON), created_at (BIGINT), updated_at (BIGINT), server_version (BIGINT), is_deleted (BOOLEAN)

**Global Sync Infrastructure:**

- **global_sync_version_seq**: Sequence shared across all local-first tables
- **global_bump_server_version()**: Trigger function that auto-increments server_version on INSERT/UPDATE
- Triggers attached to d_card, d_folder, d_tiptap_v2, d_user_v2 tables

**Site Constants:**

- SiteDashboard = 1
- SiteJournal = 2
- SiteFlomo = 3

## Implemented Models & Handlers

- **User**: Complete CRUD with session management, RSS/email tokens (legacy table: d_user)
- **Todo**: Complete CRUD with completion tracking, scheduling, ordering, collections
- **Collection**: Complete CRUD for todo organization
- **Blog**: Complete CRUD with draft support, visibility controls, JSON payload
- **Bookmark**: Complete CRUD with tag management
- **Echo**: Complete CRUD for journal entries
- **Watch**: Complete CRUD for URL monitoring with intervals
- **TipTap**: Complete CRUD for rich text editing with history
- **Media**: File upload/download with UUID links and presigned URLs
- **Tag**: Tag management for bookmarks
- **Entry**: Generic entry system
- **QuickNote**: Quick note creation

- **Card**: Local-first sync with UUID-based cards via `/flomo` (traditional CRUD endpoints removed)
- **Folder**: Local-first sync with UUID-based folders via `/flomo` (traditional CRUD endpoints removed)
- **TiptapV2**: Local-first sync for rich text content
- **UserV2**: New user model for local-first sync with server_version tracking (table: d_user_v2)

## Router Endpoints

- `/user` (GET/POST) → user.DefaultHandler
- `/todo` (GET/POST) → todo.DefaultHandler
- `/collection` (GET/POST) → collection.DefaultHandler
- `/blog` (GET/POST) → blog.DefaultHandler
- `/bookmark` (GET/POST) → bookmark.DefaultHandler
- `/echo` (GET/POST) → echo.DefaultHandler
- `/watch` (GET/POST) → watch.DefaultHandler
- `/tiptap` (GET/POST) → tiptap.DefaultHandler
- `/media` (GET/POST) → media.DefaultHandler
- `/entry` (GET/POST) → entry.DefaultHandler
- `/flomo` (GET/POST) → flomo.DefaultHandler (local-first sync endpoints; cards and folders are managed exclusively here)
- `/upload` (POST) → media.Upload
- `/m/:link` (GET) → media.Serve

## Implementation Pattern

### Traditional Pattern (MetaField-based)

Each model follows identical structure:

1. Model in `model/<name>.go` with:
   - TableName(), Get(), Create(), Update(), Delete()
   - ListAll<Name>() - returns all <Name>View records without pagination (includes id, omits timestamps)
   - List<Name>() - returns paginated <Name>View results with hasMore flag (includes id, omits timestamps)
   - <name>PageSize constant for pagination
   - <Name>View struct for API responses (includes id, excludes gorm.Model timestamps)
   - <Name>Field struct for data fields only (excludes id and timestamps)
2. Handlers in `handler/<name>/` with:
   - base.go, Create*.go, Get*.go, Update*.go, Delete*.go
   - List<Name>.go - paginated listing with Page parameter, returns []<Name>View
   - ListAll<Name>.go - non-paginated listing, returns []<Name>View
   - Get<Name>.go - single record retrieval by ID, returns <Name>View
3. Routes registered in router.go with import and GET/POST endpoints
4. The database columns use snake_case while the JSON API uses camelCase.

**Note**: All list operations return `<Model>View` structs that include the id field for frontend operations, while excluding database timestamps and internal fields from API responses.

### Local-First Sync Pattern (MetaFieldV2-based)

For models with offline-first requirements:

1. Model in `model/<name>.go` with:
   - Uses `MetaFieldV2` (UUID id, int64 timestamps with `autoUpdateTime:false`, server_version, is_deleted as `*bool`)
   - `CreatedAt` and `UpdatedAt` are **client-supplied** (GORM auto-update disabled)
   - `IsDeleted` is `*bool` (pointer) to correctly distinguish `false` from zero value
   - `BoolPtr(b bool) *bool` helper in `model/model.go` for creating bool pointers
   - TableName(), Get(), Create(), Update(), MarkDeleted()
   - `SyncFromClient(db, where)` — used for client-driven updates; calls `OmitMetaFields(db)` which omits `id`, `created_at`, `server_version`, and `creator_id`, then calls `UpdateColumns` so zero values are written and the DB trigger controls `server_version`
   - `OmitMetaFields(db *gorm.DB) *gorm.DB` — helper in `model/model.go`; centralizes the field exclusion pattern for all sync models
   - List<Name>Since(db, since int64, creatorId) - incremental sync query
   - Full<Name>(db, creatorId) - full sync query (is_deleted=false)
2. Handlers in `handler/<name>/` with:
   - **FullSync**: Returns all non-deleted records; response uses **plural** JSON keys: `users`, `cards`, `folders`, `tiptaps`
   - **Pull**: Returns records with server_version > since; response uses plural keys
   - **Push**: Accepts **plural** JSON keys (`cards`, `folders`, `tiptaps`); upserts each by UUID using `SyncFromClient()`
3. Routes registered in router.go (e.g., `/api/flomo` for sync endpoints)
4. Client-generated UUIDs for optimistic offline creation
5. Database triggers auto-increment server_version using global sequence
