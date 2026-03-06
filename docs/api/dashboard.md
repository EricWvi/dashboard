# Dashboard API Documentation

Dashboard is a local-first sync endpoint for the dashboard site, managing blogs, bookmarks, collections, echoes, quick notes, todos, watches, tags, users, and tiptap documents.

## Base URL

- **Local-First Sync**: `/api/dashboard` - Bulk synchronization endpoints

## Local-First Sync Endpoints (`/api/dashboard`)

### Full Sync

Retrieves all non-deleted dashboard records. Used for initial sync or recovery.

**Endpoint:** `GET /api/dashboard?Action=FullSync`

**Parameters:** None

**Response:**

```json
{
  "requestId": "uuid-string",
  "code": 200,
  "message": {
    "serverVersion": 100,
    "users": [...],
    "tags": [...],
    "blogs": [...],
    "bookmarks": [...],
    "collections": [...],
    "echoes": [...],
    "quickNotes": [...],
    "todos": [...],
    "watches": [...],
    "tiptaps": [...]
  }
}
```

### Pull (Incremental Sync)

Retrieves all dashboard changes since a specific server version.

**Endpoint:** `GET /api/dashboard?Action=Pull&since=100`

**Parameters:**

- `since` (int64, required): Last known server version from client

**Response:**

```json
{
  "requestId": "uuid-string",
  "code": 200,
  "message": {
    "serverVersion": 150,
    "users": [...],
    "tags": [...],
    "blogs": [...],
    "bookmarks": [...],
    "collections": [...],
    "echoes": [...],
    "quickNotes": [...],
    "todos": [...],
    "watches": [...],
    "tiptaps": [...]
  }
}
```

### Push (Upload Changes)

Uploads local dashboard changes to the server. Server performs upsert based on UUID.

**Endpoint:** `POST /api/dashboard?Action=Push`

**Request Body:**

```json
{
  "tags": [...],
  "blogs": [...],
  "bookmarks": [...],
  "collections": [...],
  "echoes": [...],
  "quickNotes": [...],
  "todos": [...],
  "watches": [...],
  "tiptaps": [...]
}
```

**Notes:**

- Server automatically sets `creatorId` from session
- Server automatically sets `site=1` (SiteDashboard) for tiptap documents
- Server automatically sets `t_group="dashboard"` for tags
- Server auto-increments `serverVersion` on each write

**Response:**

```json
{
  "requestId": "uuid-string",
  "code": 200,
  "message": {
    "success": true
  }
}
```

## Scoping

- **Tiptap**: Filtered by `site = SiteDashboard (1)`
- **Tag**: Filtered by `t_group = "dashboard"`
- **User**: Shared `d_user_v2` table
