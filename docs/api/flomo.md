# Flomo API Documentation

Flomo is a card-based note-taking system with folder organization.

Base URL: `/api/card`

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

### Card

```json
{
  "id": 1,
  "createdAt": "2026-02-08T16:00:26.630354+08:00",
  "updatedAt": "2026-02-08T16:00:26.630354+08:00",
  "deletedAt": null,
  "creatorId": 2,
  "folderId": 1,
  "title": "My First Card",
  "draft": 0,
  "payload": {},
  "rawText": "This is my test note",
  "reviewCount": 0
}
```

### Folder

```json
{
  "id": 1,
  "createdAt": "2026-02-08T16:00:08.661847+08:00",
  "updatedAt": "2026-02-08T16:00:08.661847+08:00",
  "deletedAt": null,
  "creatorId": 2,
  "parentId": 0,
  "title": "Test Folder",
  "payload": {}
}
```

## Folder Endpoints

### Create Folder

Creates a new folder.

**Endpoint:** `POST /api/card?Action=CreateFolder`

**Request Body:**

```json
{
  "title": "My Folder",
  "parentId": 0,
  "payload": {}
}
```

**Parameters:**

- `title` (string, required): Folder name (max 1024 chars)
- `parentId` (uint, optional): Parent folder ID, defaults to 0 (root)
- `payload` (object, optional): Additional metadata as JSON

**Response:**

```json
{
  "requestId": "90902d95-81a2-4656-8350-4331bc05a148",
  "code": 200,
  "message": {
    "id": 1
  }
}
```

### Get Folder

Retrieves a specific folder by ID.

**Endpoint:** `GET /api/card?Action=GetFolder&id=1`

**Parameters:**

- `id` (uint, required): Folder ID

**Response:**

```json
{
  "requestId": "0756ccf6-c48e-4cbc-b309-c0aec0b2db80",
  "code": 200,
  "message": {
    "id": 1,
    "createdAt": "2026-02-08T16:00:08.661847+08:00",
    "updatedAt": "2026-02-08T16:00:08.661847+08:00",
    "deletedAt": null,
    "creatorId": 2,
    "parentId": 0,
    "title": "Test Folder",
    "payload": {}
  }
}
```

### List Folders

Lists all folders under a specific parent folder.

**Endpoint:** `GET /api/card?Action=ListFolders&parentId=0`

**Parameters:**

- `parentId` (uint, required): Parent folder ID (0 for root level)

**Response:**

```json
{
  "requestId": "4ae97b39-676f-43f5-b54f-bad0c09faa1e",
  "code": 200,
  "message": {
    "folders": [
      {
        "id": 1,
        "createdAt": "2026-02-08T16:00:08.661847+08:00",
        "updatedAt": "2026-02-08T16:00:08.661847+08:00",
        "deletedAt": null,
        "creatorId": 2,
        "parentId": 0,
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
  "id": 1,
  "title": "Updated Folder Name",
  "parentId": 2,
  "payload": { "color": "blue" }
}
```

**Parameters:**

- `id` (uint, required): Folder ID
- `title` (string, optional): New folder name
- `parentId` (uint, optional): New parent folder ID
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

Soft deletes a folder.

**Endpoint:** `POST /api/card?Action=DeleteFolder`

**Request Body:**

```json
{
  "id": 1
}
```

**Parameters:**

- `id` (uint, required): Folder ID

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
  "folderId": 1,
  "draft": 0,
  "payload": {},
  "rawText": "Note content here"
}
```

**Parameters:**

- `title` (string, required): Card title (max 1024 chars)
- `folderId` (uint, optional): Folder ID, defaults to 0 (no folder)
- `draft` (int, optional): Draft status (0=published, 1=draft), defaults to 0
- `payload` (object, optional): Additional metadata as JSON
- `rawText` (string, optional): Plain text content for search
- `reviewCount` (int, read-only): Number of times reviewed (managed by system)

**Response:**

```json
{
  "requestId": "8783809c-de1a-4d57-b70c-d78f8b8d5dd5",
  "code": 200,
  "message": {
    "id": 1
  }
}
```

### Get Card

Retrieves a specific card by ID.

**Endpoint:** `GET /api/card?Action=GetCard&id=1`

**Parameters:**

- `id` (uint, required): Card ID

**Response:**

```json
{
  "requestId": "2bf2a391-d62f-45fb-9709-72e49cb1e1e6",
  "code": 200,
  "message": {
    "id": 1,
    "createdAt": "2026-02-08T16:00:26.630354+08:00",
    "updatedAt": "2026-02-08T16:00:26.630354+08:00",
    "deletedAt": null,
    "creatorId": 2,
    "folderId": 1,
    "title": "My First Card",
    "draft": 0,
    "payload": {},
    "rawText": "This is my test note",
    "reviewCount": 0
  }
}
```

### List Cards

Lists all cards in a specific folder.

**Endpoint:** `GET /api/card?Action=ListCards&folderId=1`

**Parameters:**

- `folderId` (uint, required): Folder ID (0 for cards without a folder)

**Response:**

```json
{
  "requestId": "06a40b1b-e68b-42a5-b422-94c39556935b",
  "code": 200,
  "message": {
    "cards": [
      {
        "id": 1,
        "createdAt": "2026-02-08T16:00:26.630354+08:00",
        "updatedAt": "2026-02-08T16:00:26.630354+08:00",
        "deletedAt": null,
        "creatorId": 2,
        "folderId": 1,
        "title": "My First Card",
        "draft": 0,
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
  "id": 1,
  "title": "Updated Card Title",
  "folderId": 2,
  "draft": 1,
  "payload": { "tags": ["important"] },
  "rawText": "Updated content"
}
```

**Parameters:**

- `id` (uint, required): Card ID
- `title` (string, optional): New card title
- `folderId` (uint, optional): New folder ID
- `draft` (int, optional): Draft status
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

Soft deletes a card.

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
  "id": 1
}
```

**Parameters:**

- `id` (uint, required): Card ID

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

- All POST endpoints require authentication via session token
- The `Action` parameter is **always** in the URL query string (for both GET and POST)
- All responses include a `requestId` field for request tracking
- All operations are scoped to the authenticated user (via `creatorId`)
- Deletion is soft delete (sets `deletedAt` timestamp)
- Cards are ordered by `created_at DESC` when listed
- The `payload` field can store arbitrary JSON for extensibility
- GET requests use URL parameters, POST requests use JSON body + URL parameters for Action
