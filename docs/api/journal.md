# Journal API Documentation

Journal is a local-first sync endpoint for the journal site, managing entries, tags, users, and tiptap documents.

## Base URL

- **Local-First Sync**: `/api/journal` - Bulk synchronization endpoints

## Local-First Sync Endpoints (`/api/journal`)

### Full Sync

Retrieves all non-deleted journal records. Used for initial sync or recovery.

**Endpoint:** `GET /api/journal?Action=FullSync`

**Parameters:** None

**Response:**

```json
{
  "requestId": "uuid-string",
  "code": 200,
  "message": {
    "serverVersion": 100,
    "users": [...],
    "entries": [...],
    "tags": [...],
    "tiptaps": [...]
  }
}
```

### Pull (Incremental Sync)

Retrieves all journal changes since a specific server version.

**Endpoint:** `GET /api/journal?Action=Pull&since=100`

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
    "entries": [...],
    "tags": [...],
    "tiptaps": [...]
  }
}
```

### Push (Upload Changes)

Uploads local journal changes to the server. Server performs upsert based on UUID.

**Endpoint:** `POST /api/journal?Action=Push`

**Request Body:**

```json
{
  "entries": [...],
  "tags": [...],
  "tiptaps": [...]
}
```

**Notes:**

- Server automatically sets `creatorId` from session
- Server automatically sets `site=2` (SiteJournal) for tiptap documents
- Server automatically sets `t_group="journal"` for tags
- Server auto-increments `serverVersion` on each write
- Push does NOT accept users (user profile updates are handled separately)

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

- **Tiptap**: Filtered by `site = SiteJournal (2)`
- **Tag**: Filtered by `t_group = "journal"`
- **User**: Shared `d_user_v2` table (read-only in sync; pull and full include user, push does not)
