# Flomo API Documentation

Flomo is a card-based note-taking system with folder organization and local-first synchronization.

## Base URLs

- **Local-First Sync**: `/api/flomo` - Bulk synchronization endpoints

## Request Format

The `Action` parameter is **always** passed as a URL query parameter for both GET and POST requests:

- GET: `GET /api/card?Action=GetFolder&id=1`
- POST: `POST /api/card?Action=CreateFolder` (with JSON body)

## Response Format

All responses follow this structure:

```json
{
  "requestId": "uuid-string",
  "code": 200,
  "message": {
    /* response data */
  }
}
```

- `requestId`: Unique identifier for tracking the request
- `code`: HTTP status code (200 for success, 400+ for errors)
- `message`: Response payload (object or string)

## Data Models

### User

```json
{
  "updatedAt": 1707398426630,
  "serverVersion": 12345,
  "avatar": "https://example.com/avatar.jpg",
  "username": "johndoe",
  "language": "zh-CN"
}
```

**Field Descriptions:**

- `updatedAt` (int64): Unix timestamp in milliseconds
- `serverVersion` (int64): Auto-incremented version for sync tracking
- `avatar` (string): User avatar URL (max 1024 chars)
- `username` (string): Display name (max 255 chars)
- `language` (string): Language preference (max 10 chars, default: 'zh-CN')

**Note:** Email, RSS token, email token, and email feed are stored in the full UserV2 model but not exposed in the sync API for security reasons.

### Card

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": 1707398426630,
  "updatedAt": 1707398426630,
  "isDeleted": false,
  "creatorId": 2,
  "folderId": "660e8400-e29b-41d4-a716-446655440000",
  "title": "My First Card",
  "draft": "770e8400-e29b-41d4-a716-446655440000",
  "payload": {},
  "rawText": "This is my test note"
}
```

**Field Descriptions:**

- `id` (UUID): Client-generated unique identifier
- `createdAt` (int64): Unix timestamp in milliseconds
- `updatedAt` (int64): Unix timestamp in milliseconds
- `isDeleted` (boolean): Soft delete flag
- `creatorId` (uint): User ID who created the card
- `folderId` (UUID): Parent folder ID
- `title` (string): Card title (max 1024 chars)
- `draft` (UUID): Associated draft document ID
- `payload` (object): Additional metadata as JSON
- `rawText` (string): Plain text content for search

### Folder

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "createdAt": 1707398408661,
  "updatedAt": 1707398408661,
  "isDeleted": false,
  "creatorId": 2,
  "parentId": "00000000-0000-0000-0000-000000000000",
  "title": "Test Folder",
  "payload": {}
}
```

**Field Descriptions:**

- `id` (UUID): Client-generated unique identifier
- `createdAt` (int64): Unix timestamp in milliseconds
- `updatedAt` (int64): Unix timestamp in milliseconds
- `isDeleted` (boolean): Soft delete flag
- `creatorId` (uint): User ID who created the folder
- `parentId` (UUID): Parent folder ID
- `title` (string): Folder name (max 1024 chars)
- `payload` (object): Additional metadata as JSON

### TiptapV2

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "createdAt": 1707398408661,
  "updatedAt": 1707398408661,
  "isDeleted": false,
  "creatorId": 2,
  "site": 3,
  "content": {},
  "history": []
}
```

**Field Descriptions:**

- `id` (UUID): Client-generated unique identifier
- `createdAt` (int64): Unix timestamp in milliseconds
- `updatedAt` (int64): Unix timestamp in milliseconds
- `isDeleted` (boolean): Soft delete flag
- `creatorId` (uint): User ID who created the document
- `site` (int): Site identifier (1=Dashboard, 2=Journal, 3=Flomo)
- `content` (object): TipTap document content as JSON
- `history` (array): Document history as JSON array

## Local-First Sync Endpoints (`/api/flomo`)

These endpoints support offline-first applications with efficient synchronization.

### Full Sync

Retrieves all non-deleted cards, folders, tiptap documents, and user profile. Used for initial sync or recovery.

**Endpoint:** `GET /api/flomo?Action=FullSync`

**Parameters:** None

**Response:**

```json
{
  "requestId": "90902d95-81a2-4656-8350-4331bc05a148",
  "code": 200,
  "message": {
    "serverVersion": 10,
    "users": [...],
    "cards": [...],
    "folders": [...],
    "tiptaps": [...]
  }
}
```

**Performance:** This endpoint uses concurrent goroutines to fetch all entity types in parallel, significantly improving response time.

### Pull (Incremental Sync)

Retrieves all changes since a specific server version. Returns user profile updates, cards, folders, and tiptaps including deleted items.

**Endpoint:** `GET /api/flomo?Action=Pull&since=12340`

**Parameters:**

- `since` (int64, required): Last known server version from client

**Response:**

```json
{
  "requestId": "4ae97b39-676f-43f5-b54f-bad0c09faa1e",
  "code": 200,
  "message": {
    "serverVersion": 12346,
    "users": [
      {
        "serverVersion": 12341,
        "updatedAt": 1707398426630,
        "avatar": "https://example.com/avatar.jpg",
        "username": "johndoe",
        "language": "zh-CN"
      }
    ],
    "cards": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "serverVersion": 12345,
        "isDeleted": false,
        ...
      }
    ],
    "folders": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "serverVersion": 12344,
        "isDeleted": false,
        ...
      }
    ],
    "tiptaps": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "serverVersion": 12346,
        "isDeleted": true,
        ...
      }
    ]
  }
}
```

**Notes:**

- Returns all records with `serverVersion > since`
- Includes deleted records (`isDeleted: true`) for client cleanup
- Client should process deletions locally
- Track `serverVersion` received for next pull

**Performance:** This endpoint uses concurrent goroutines to fetch all entity types in parallel, significantly improving response time.

### Push (Upload Changes)

Uploads local changes (creates and updates) to the server. Server performs upsert based on UUID.

**Endpoint:** `POST /api/flomo?Action=Push`

**Request Body:**

```json
{
  "users": [...],
  "cards": [...],
  "folders": [...],
  "tiptaps": [...]
}
```

**Parameters:**

- `users` (array, optional): Array of user objects to upsert
- `cards` (array, optional): Array of card objects to upsert
- `folders` (array, optional): Array of folder objects to upsert
- `tiptaps` (array, optional): Array of tiptap objects to upsert

**Response:**

```json
{
  "requestId": "91124d98-9a65-4a23-98e1-ad71a816f873",
  "code": 200,
  "message": {
    "success": true
  }
}
```

**Notes:**

- Server automatically sets `creatorId` from session
- Server automatically sets `site=3` for tiptap documents
- Server auto-increments `serverVersion` on each write
- If record exists (by UUID), it's updated; otherwise created
- Client must generate UUIDs for new records
- Push before pull to avoid conflicts

**Performance:** This endpoint uses concurrent goroutines to process each entity type in parallel, significantly improving throughput for large batches.

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "requestId": "uuid-string",
  "code": 400,
  "message": "Error description"
}
```

Common error scenarios:

- Missing `Action` parameter: `"request action is missing"`
- Invalid ID or resource not found: `"can not find card"` or `"can not find folder"`
- Missing required parameters
- Database errors

## Notes

### General

- The `Action` parameter is **always** in the URL query string (for both GET and POST)
- All responses include a `requestId` field for request tracking
- All operations are scoped to the authenticated user (via `creatorId`)
- GET requests use URL parameters, POST requests use JSON body + URL parameters for Action

### Local-First Sync (`/api/flomo`)

- **UUIDs**: All IDs are UUIDs generated by the client
- **Timestamps**: All timestamps are Unix milliseconds (int64)
- **Server Version**: Auto-incremented by database triggers, used for sync tracking
- **Soft Delete**: Uses `isDeleted` boolean flag instead of `deletedAt` timestamp
- **Sync Strategy**:
  1. **First Sync**: Use `FullSync` to get all non-deleted data
  2. **Regular Sync**: Use `Pull` with last known `serverVersion`
  3. **Upload Changes**: Use `Push` to send local changes (creates/updates/deletes)
- **Best Practice**: Always push before pull to minimize conflicts
