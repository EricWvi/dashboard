# Flomo API Documentation

Flomo is a card-based note-taking system with folder organization and local-first synchronization.

## Base URLs

- **Traditional CRUD**: `/api/card` - Individual card/folder operations
- **Local-First Sync**: `/api/flomo` - Bulk synchronization endpoints

## Authentication

All requests require the following headers:

- `Only-Session-Token`: Session token obtained from GetUser endpoint

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

### Card (Local-First)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": 1707398426630,
  "updatedAt": 1707398426630,
  "serverVersion": 12345,
  "isDeleted": false,
  "creatorId": 2,
  "folderId": "660e8400-e29b-41d4-a716-446655440000",
  "title": "My First Card",
  "draft": "770e8400-e29b-41d4-a716-446655440000",
  "payload": {},
  "rawText": "This is my test note",
  "reviewCount": 0
}
```

**Field Descriptions:**

- `id` (UUID): Client-generated unique identifier
- `createdAt` (int64): Unix timestamp in milliseconds
- `updatedAt` (int64): Unix timestamp in milliseconds
- `serverVersion` (int64): Auto-incremented by server for sync tracking
- `isDeleted` (boolean): Soft delete flag
- `creatorId` (uint): User ID who created the card
- `folderId` (UUID, nullable): Parent folder ID, null for root level
- `title` (string): Card title (max 1024 chars)
- `draft` (UUID): Associated draft document ID
- `payload` (object): Additional metadata as JSON
- `rawText` (string): Plain text content for search
- `reviewCount` (int): Number of times reviewed

### Folder (Local-First)

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "createdAt": 1707398408661,
  "updatedAt": 1707398408661,
  "serverVersion": 12344,
  "isDeleted": false,
  "creatorId": 2,
  "parentId": null,
  "title": "Test Folder",
  "payload": {}
}
```

**Field Descriptions:**

- `id` (UUID): Client-generated unique identifier
- `createdAt` (int64): Unix timestamp in milliseconds
- `updatedAt` (int64): Unix timestamp in milliseconds
- `serverVersion` (int64): Auto-incremented by server for sync tracking
- `isDeleted` (boolean): Soft delete flag
- `creatorId` (uint): User ID who created the folder
- `parentId` (UUID, nullable): Parent folder ID, null for root level
- `title` (string): Folder name (max 1024 chars)
- `payload` (object): Additional metadata as JSON

### TiptapV2 (Local-First)

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "createdAt": 1707398408661,
  "updatedAt": 1707398408661,
  "serverVersion": 12346,
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
- `serverVersion` (int64): Auto-incremented by server for sync tracking
- `isDeleted` (boolean): Soft delete flag
- `creatorId` (uint): User ID who created the document
- `site` (int): Site identifier (1=Dashboard, 2=Journal, 3=Flomo)
- `content` (object): TipTap document content as JSON
- `history` (array): Document history as JSON array

---

## Local-First Sync Endpoints (`/api/flomo`)

These endpoints support offline-first applications with efficient synchronization.

### Full Sync

Retrieves all non-deleted cards, folders, and tiptap documents. Used for initial sync or recovery.

**Endpoint:** `GET /api/flomo?Action=FullSync`

**Parameters:** None

**Response:**

```json
{
  "requestId": "90902d95-81a2-4656-8350-4331bc05a148",
  "code": 200,
  "message": {
    "card": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "createdAt": 1707398426630,
        "updatedAt": 1707398426630,
        "serverVersion": 12345,
        "isDeleted": false,
        "creatorId": 2,
        "folderId": "660e8400-e29b-41d4-a716-446655440000",
        "title": "My First Card",
        "draft": "770e8400-e29b-41d4-a716-446655440000",
        "payload": {},
        "rawText": "This is my test note",
        "reviewCount": 0
      }
    ],
    "folder": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "createdAt": 1707398408661,
        "updatedAt": 1707398408661,
        "serverVersion": 12344,
        "isDeleted": false,
        "creatorId": 2,
        "parentId": null,
        "title": "Test Folder",
        "payload": {}
      }
    ],
    "tiptap": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "createdAt": 1707398408661,
        "updatedAt": 1707398408661,
        "serverVersion": 12346,
        "isDeleted": false,
        "creatorId": 2,
        "site": 3,
        "content": {},
        "history": []
      }
    ]
  }
}
```

### Pull (Incremental Sync)

Retrieves all changes since a specific server version. Returns cards, folders, and tiptaps including deleted items.

**Endpoint:** `GET /api/flomo?Action=Pull&since=12340`

**Parameters:**

- `since` (int64, required): Last known server version from client

**Response:**

```json
{
  "requestId": "4ae97b39-676f-43f5-b54f-bad0c09faa1e",
  "code": 200,
  "message": {
    "card": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "serverVersion": 12345,
        "isDeleted": false,
        ...
      }
    ],
    "folder": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "serverVersion": 12344,
        "isDeleted": false,
        ...
      }
    ],
    "tiptap": [
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
- Track the highest `serverVersion` received for next pull

### Push (Upload Changes)

Uploads local changes (creates and updates) to the server. Server performs upsert based on UUID.

**Endpoint:** `POST /api/flomo?Action=Push`

**Request Body:**

```json
{
  "card": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": 1707398426630,
      "updatedAt": 1707398426631,
      "isDeleted": false,
      "folderId": "660e8400-e29b-41d4-a716-446655440000",
      "title": "Updated Card",
      "draft": "770e8400-e29b-41d4-a716-446655440000",
      "payload": {},
      "rawText": "Updated content",
      "reviewCount": 0
    }
  ],
  "folder": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "createdAt": 1707398408661,
      "updatedAt": 1707398408662,
      "isDeleted": false,
      "parentId": null,
      "title": "New Folder",
      "payload": {}
    }
  ],
  "tiptap": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "createdAt": 1707398408661,
      "updatedAt": 1707398408663,
      "isDeleted": false,
      "content": { "type": "doc" },
      "history": []
    }
  ]
}
```

**Parameters:**

- `card` (array, optional): Array of card objects to upsert
- `folder` (array, optional): Array of folder objects to upsert
- `tiptap` (array, optional): Array of tiptap objects to upsert

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

---

## Traditional CRUD Endpoints (`/api/card`)

These endpoints provide individual operations on cards and folders. Note: IDs are now UUIDs.

## Folder Endpoints

### Create Folder

Creates a new folder.

**Endpoint:** `POST /api/card?Action=CreateFolder`

**Request Body:**

```json
{
  "title": "My Folder",
  "parentId": null,
  "payload": {}
}
```

**Parameters:**

- `title` (string, required): Folder name (max 1024 chars)
- `parentId` (UUID, optional): Parent folder ID, null for root level
- `payload` (object, optional): Additional metadata as JSON

**Response:**

```json
{
  "requestId": "90902d95-81a2-4656-8350-4331bc05a148",
  "code": 200,
  "message": {
    "id": "660e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Get Folder

Retrieves a specific folder by ID.

**Endpoint:** `GET /api/card?Action=GetFolder&id=660e8400-e29b-41d4-a716-446655440000`

**Parameters:**

- `id` (UUID, required): Folder ID

**Response:**

```json
{
  "requestId": "0756ccf6-c48e-4cbc-b309-c0aec0b2db80",
  "code": 200,
  "message": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "createdAt": 1707398408661,
    "updatedAt": 1707398408661,
    "serverVersion": 12344,
    "isDeleted": false,
    "creatorId": 2,
    "parentId": null,
    "title": "Test Folder",
    "payload": {}
  }
}
```

### List Folders

Lists all folders under a specific parent folder.

**Endpoint:** `GET /api/card?Action=ListFolders` (omit parentId for root level)

**Parameters:**

- `parentId` (UUID, optional): Parent folder ID, omit or null for root level

**Response:**

```json
{
  "requestId": "4ae97b39-676f-43f5-b54f-bad0c09faa1e",
  "code": 200,
  "message": {
    "folders": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "createdAt": 1707398408661,
        "updatedAt": 1707398408661,
        "serverVersion": 12344,
        "isDeleted": false,
        "creatorId": 2,
        "parentId": null,
        "title": "Test Folder",
        "payload": {}
      }
    ]
  }
}
```

### Update Folder

Updates folder information.

**Endpoint:** `POST /api/card?Action=UpdateFolder`

**Request Body:**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "title": "Updated Folder Name",
  "parentId": "770e8400-e29b-41d4-a716-446655440000",
  "payload": { "color": "blue" }
}
```

**Parameters:**

- `id` (UUID, required): Folder ID
- `title` (string, optional): New folder name
- `parentId` (UUID, optional): New parent folder ID
- `payload` (object, optional): Updated metadata

**Response:**

```json
{
  "requestId": "91124d98-9a65-4a23-98e1-ad71a816f873",
  "code": 200,
  "message": {}
}
```

### Delete Folder

Soft deletes a folder (sets `isDeleted` to true).

**Endpoint:** `POST /api/card?Action=DeleteFolder`

**Request Body:**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000"
}
```

**Parameters:**

- `id` (UUID, required): Folder ID

**Response:**

```json
{
  "requestId": "fba4cbbe-b96d-4f3c-bf9b-1d2bad9727cc",
  "code": 200,
  "message": {}
}
```

## Card Endpoints

### Create Card

Creates a new card.

**Endpoint:** `POST /api/card?Action=CreateCard`

**Request Body:**

```json
{
  "title": "My Note",
  "folderId": "660e8400-e29b-41d4-a716-446655440000",
  "draft": "770e8400-e29b-41d4-a716-446655440000",
  "payload": {},
  "rawText": "Note content here"
}
```

**Parameters:**

- `title` (string, required): Card title (max 1024 chars)
- `folderId` (UUID, optional): Folder ID, null for no folder
- `draft` (UUID, required): Associated draft document ID
- `payload` (object, optional): Additional metadata as JSON
- `rawText` (string, optional): Plain text content for search
- `reviewCount` (int, read-only): Number of times reviewed (managed by system)

**Response:**

```json
{
  "requestId": "8783809c-de1a-4d57-b70c-d78f8b8d5dd5",
  "code": 200,
  "message": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Get Card

Retrieves a specific card by ID.

**Endpoint:** `GET /api/card?Action=GetCard&id=550e8400-e29b-41d4-a716-446655440000`

**Parameters:**

- `id` (UUID, required): Card ID

**Response:**

```json
{
  "requestId": "2bf2a391-d62f-45fb-9709-72e49cb1e1e6",
  "code": 200,
  "message": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": 1707398426630,
    "updatedAt": 1707398426630,
    "serverVersion": 12345,
    "isDeleted": false,
    "creatorId": 2,
    "folderId": "660e8400-e29b-41d4-a716-446655440000",
    "title": "My First Card",
    "draft": "770e8400-e29b-41d4-a716-446655440000",
    "payload": {},
    "rawText": "This is my test note",
    "reviewCount": 0
  }
}
```

### List Cards

Lists all cards in a specific folder.

**Endpoint:** `GET /api/card?Action=ListCards&folderId=660e8400-e29b-41d4-a716-446655440000`

**Parameters:**

- `folderId` (UUID, optional): Folder ID, omit or null for cards without a folder

**Response:**

```json
{
  "requestId": "06a40b1b-e68b-42a5-b422-94c39556935b",
  "code": 200,
  "message": {
    "cards": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "createdAt": 1707398426630,
        "updatedAt": 1707398426630,
        "serverVersion": 12345,
        "isDeleted": false,
        "creatorId": 2,
        "folderId": "660e8400-e29b-41d4-a716-446655440000",
        "title": "My First Card",
        "draft": "770e8400-e29b-41d4-a716-446655440000",
        "payload": {},
        "rawText": "This is my test note",
        "reviewCount": 0
      }
    ]
  }
}
```

### Update Card

Updates card information.

**Endpoint:** `POST /api/card?Action=UpdateCard`

**Request Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Updated Card Title",
  "folderId": "660e8400-e29b-41d4-a716-446655440000",
  "draft": "770e8400-e29b-41d4-a716-446655440000",
  "payload": { "tags": ["important"] },
  "rawText": "Updated content"
}
```

**Parameters:**

- `id` (UUID, required): Card ID
- `title` (string, optional): New card title
- `folderId` (UUID, optional): New folder ID
- `draft` (UUID, optional): Associated draft document ID
- `payload` (object, optional): Updated metadata
- `rawText` (string, optional): Updated plain text content

**Note:** `reviewCount` cannot be updated directly via this endpoint.

**Response:**

```json
{
  "requestId": "19fcaf2f-da90-4736-9d8a-1c20e7ee8e79",
  "code": 200,
  "message": {}
}
```

### Delete Card

Soft deletes a card (sets `isDeleted` to true).

**Endpoint:** `POST /api/card?Action=DeleteCard`

**Headers:**

```
Content-Type: application/json
Remote-Email: test@onlyquant.top
Only-Session-Token: <your-session-token>
```

**Request Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Parameters:**

- `id` (UUID, required): Card ID

**Response:**

```json
{
  "requestId": "2ea7aeee-3bcd-4e71-b24e-a56e7da48a61",
  "code": 200,
  "message": {}
}
```

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
- Missing session token: `"Only-Session-Token header is required"`
- Invalid ID or resource not found: `"can not find card"` or `"can not find folder"`
- Missing required parameters
- Unauthorized access (accessing another user's cards/folders)
- Database errors

## Notes

### General

- All POST endpoints require authentication via session token
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

### Traditional CRUD (`/api/card`)

- Individual operations on cards and folders
- Also uses UUIDs for IDs (consistent with local-first schema)
- Deletion sets `isDeleted` flag (soft delete)
- The `payload` field can store arbitrary JSON for extensibility
- `reviewCount` field is read-only and managed by the system
