The backend is designed around models and actions on the models. Database tables are in `migration/migrations.go`. Models are defined in `model`.

The overall HTTP interface is through a `base` handler and using `Action` query and reflection to choose method on `base`. For each group of handlers, say `todo`, we will register it in `router.go`, using `GET` and `POST`. The corresponding handlers for actions of a specific model, say `todo`, are defined in `handler/<model>`, say `handler/todo`.

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

- **d_card**: id (UUID), creator_id, folder_id (UUID), title, draft (UUID), payload (JSON), raw_text, review_count, created_at (BIGINT), updated_at (BIGINT), server_version (BIGINT), is_deleted (BOOLEAN)
- **d_folder**: id (UUID), creator_id, parent_id (UUID), title, payload (JSON), created_at (BIGINT), updated_at (BIGINT), server_version (BIGINT), is_deleted (BOOLEAN)
- **d_tiptap_v2**: id (UUID), creator_id, site (SMALLINT), content (JSON), history (JSON), created_at (BIGINT), updated_at (BIGINT), server_version (BIGINT), is_deleted (BOOLEAN)

**Global Sync Infrastructure:**

- **global_sync_version_seq**: Sequence shared across all local-first tables
- **global_bump_server_version()**: Trigger function that auto-increments server_version on INSERT/UPDATE
- Triggers attached to d_card, d_folder, d_tiptap_v2 tables

**Site Constants:**

- SiteDashboard = 1
- SiteJournal = 2
- SiteFlomo = 3

## Implemented Models & Handlers

- **User**: Complete CRUD with session management, RSS/email tokens
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
- **Card**: Local-first sync with UUID-based cards (Flomo feature)
- **Folder**: Local-first sync with UUID-based folders (Flomo feature)
- **TiptapV2**: Local-first sync for rich text content

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
- `/card` (GET/POST) → card.DefaultHandler (traditional CRUD for cards/folders)
- `/flomo` (GET/POST) → flomo.DefaultHandler (local-first sync endpoints)
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

For models with offline-first requirements (Card, Folder, TiptapV2):

1. Model in `model/<name>.go` with:
   - Uses `MetaFieldV2` (UUID id, int64 timestamps, server_version, is_deleted)
   - TableName(), Get(), Create(), Update(), MarkDeleted()
   - List<Name>Since(db, since int64, creatorId) - incremental sync query
   - Full<Name>(db, creatorId) - full sync query (is_deleted=false)
2. Handlers in `handler/<name>/` with:
   - **FullSync**: Returns all non-deleted records for initial sync
   - **Pull**: Returns records with server_version > since parameter
   - **Push**: Accepts array of records, upserts each by UUID
   - Optional traditional CRUD endpoints via separate handler (e.g., `/card`)
3. Routes registered in router.go (e.g., `/flomo` for sync endpoints)
4. Client-generated UUIDs for optimistic offline creation
5. Database triggers auto-increment server_version using global sequence
