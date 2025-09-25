The backend is designed around models and actions on the models. Database tables are in `migration/migrations.go`. Models are defined in `model`.

The overall HTTP interface is through a `base` handler and using `Action` query and reflection to choose method on `base`. For each group of handlers, say `todo`, we will register it in `router.go`, using `GET` and `POST`. The corresponding handlers for actions of a specific model, say `todo`, are defined in `handler/<model>`, say `handler/todo`.

## Database Schema (from migration/migrations.go)

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
- `/upload` (POST) → media.Upload
- `/m/:link` (GET) → media.Serve

## Implementation Pattern

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

## Client

Client side code are in `client`. `index.html` is for Dashboard and `journal.html` is for Journal.

### Architecture

- **React + TypeScript** with Vite build system
- **TanStack Query** for API state management and caching
- **Tailwind CSS** for styling with dark mode support
- **API hooks** in `client/src/hooks/` - one file per model

### API Hooks Pattern

Each model follows identical hook structure:

- `use<Model>()` - fetch all records (uses ListAll<Model> endpoint)
- `use<Model>(id)` - fetch single record (uses Get<Model> endpoint)
- `useCreate<Model>()` - create mutation
- `useUpdate<Model>()` - update mutation
- `useDelete<Model>()` - delete mutation
- `list<Model>(page, conditions)` - paginated fetch function (uses List<Model> endpoint)
