# Media Module - Visual Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Application                          │
│  (Web, Mobile, Desktop - any HTTP client)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express.js API Server (src/app.ts)                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         /api/media Routes (src/p.media/)                │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ • tokenValidator middleware (JWT authentication)         │  │
│  │ • mediaRoutes with 13 core endpoints                    │  │
│  │ • asyncHandler wrapper for error handling              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         mediaController (Business Logic)                │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ • Presigned URL generation                              │  │
│  │ • Media CRUD operations                                 │  │
│  │ • Validation (MIME, size, fields)                      │  │
│  │ • Response formatting                                   │  │
│  │ • Error handling with proper status codes              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         mediaModel (Data Layer)                         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ • Database queries                                       │  │
│  │ • Connection pooling (mysql2/promise)                   │  │
│  │ • Soft delete operations                                │  │
│  │ • Pagination and filtering                              │  │
│  │ • Statistics aggregation                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────┬────────────────────────────┬──────────────────────────┘
         │                            │
         ▼                            ▼
    ┌─────────────┐          ┌──────────────────┐
    │ MySQL DB    │          │ File Storage     │
    │  (media)    │          │ (/uploads/media) │
    ├─────────────┤          ├──────────────────┤
    │ • media     │          │ • documents/     │
    │ • media_    │          │ • images/        │
    │   tags      │          │ • videos/        │
    │ • media_    │          │                  │
    │   access_   │          │ (or S3/GCS)      │
    │   log       │          │                  │
    │ • media_    │          │                  │
    │   thumbs    │          │                  │
    └─────────────┘          └──────────────────┘
```

## Request/Response Flow

### 1. Generate Presigned URL Flow

```
Client                          Server                    Storage
  │                               │                          │
  ├─ POST /api/media/presign ────>│                          │
  │  Headers: Authorization       │                          │
  │  Body: { filename,            │                          │
  │         mimeType,             │                          │
  │         kind }                │                          │
  │                               │                          │
  │                       Generate presign ID                │
  │                       Validate MIME & size               │
  │                       Create upload URL                  │
  │                       Create file URL                    │
  │                               │                          │
  │<────── 201 Created ───────────┤                          │
  │  { presignId,                 │                          │
  │    uploadUrl,                 │                          │
  │    fileUrl,                   │                          │
  │    expiresIn: 600 }           │                          │
  │                               │                          │
  │                               │  (10-minute window)      │
  │                               │                          │
  └─ PUT {uploadUrl} ────────────────────────────────────────>
     [file content]                                          │
                                                      Store file
                                                             │
  <────────── 200 OK ─────────────────────────────────────────┘
```

### 2. Create Media Record Flow

```
Client                          Server                    Database
  │                               │                          │
  ├─ POST /api/media ────────────>│                          │
  │  Headers: Authorization       │                          │
  │  Body: {                       │                          │
  │    name, kind,                │                          │
  │    fileUrl,                   │                          │
  │    size, mimeType,            │                          │
  │    tags, projectId            │                          │
  │  }                            │                          │
  │                               │                          │
  │                       Validate all fields                │
  │                       Extract user_id from JWT           │
  │                       Insert into media table            │
  │                               ├─ INSERT media ──────────>
  │                               │  (with timestamps)       │
  │                               │<───── insertId ─────────┤
  │                       Query inserted record              │
  │                               ├─ SELECT * ──────────────>
  │                               │<───── media row ────────┤
  │                               │                          │
  │<────── 201 Created ───────────┤                          │
  │  { id, name, kind,            │                          │
  │    file_url, size,            │                          │
  │    created_at, ... }          │                          │
  │                               │                          │
```

### 3. List Media with Filters Flow

```
Client                          Server                    Database
  │                               │                          │
  ├─ GET /api/media ─────────────>│                          │
  │  ?kind=document               │                          │
  │  &search=invoice              │                          │
  │  &projectId=42                │                          │
  │  &page=1&limit=20             │                          │
  │  Headers: Authorization       │                          │
  │                               │                          │
  │                       Validate pagination                │
  │                       Build WHERE clauses:               │
  │                       - deleted_at IS NULL               │
  │                       - kind = ?                         │
  │                       - name LIKE ?                      │
  │                       - project_id = ?                   │
  │                               │                          │
  │                               ├─ SELECT COUNT(*) ───────>
  │                               │<───── total count ──────┤
  │                       Calculate offset: (1-1)*20 = 0     │
  │                               │                          │
  │                               ├─ SELECT * ... ──────────>
  │                               │  WHERE ... LIMIT 20      │
  │                               │  OFFSET 0                │
  │                               │<───── 20 rows ──────────┤
  │                               │                          │
  │<────── 200 OK ────────────────┤                          │
  │  { items: [...],              │                          │
  │    pagination: {              │                          │
  │      page: 1,                 │                          │
  │      limit: 20,               │                          │
  │      total: 150,              │                          │
  │      totalPages: 8            │                          │
  │    }                          │                          │
  │  }                            │                          │
```

### 4. Delete Media Flow

```
Client                          Server                    Database
  │                               │                          │
  ├─ DELETE /api/media/123 ──────>│                          │
  │  Headers: Authorization       │                          │
  │                               │                          │
  │                       Validate media exists              │
  │                               ├─ SELECT * ──────────────>
  │                               │  WHERE id = 123          │
  │                               │<───── media row ────────┤
  │                               │                          │
  │                       Soft delete (mark as deleted)      │
  │                               ├─ UPDATE media ──────────>
  │                               │  SET deleted_at = NOW()  │
  │                               │  WHERE id = 123          │
  │                               │<───── OK ──────────────┤
  │                               │                          │
  │<────── 200 OK ────────────────┤                          │
  │  { id: 123,                   │                          │
  │    deletedAt: "2024-01-15..." │                          │
  │  }                            │                          │
  │                               │                          │
  │ (Media still in DB, marked deleted for audit)           │
```

## Data Model Diagram

```
┌─────────────────────────────────────────┐
│         media (Primary Table)            │
├─────────────────────────────────────────┤
│ PK  id (INT)                            │
│ --- name (VARCHAR)                      │
│ --- kind (ENUM: document|image|video)   │
│ --- file_url (VARCHAR)                  │
│ --- size (BIGINT)                       │
│ --- mime_type (VARCHAR)                 │
│ FK  user_id (INT)                       │
│ FK  project_id (INT, nullable)          │
│ --- tags (VARCHAR, comma-separated)     │
│ --- etag (VARCHAR, nullable)            │
│ --- checksum (VARCHAR, nullable)        │
│ --- created_at (TIMESTAMP)              │
│ --- updated_at (TIMESTAMP)              │
│ --- deleted_at (TIMESTAMP, nullable)    │
├─────────────────────────────────────────┤
│ Indexes: kind, user_id, project_id,     │
│          deleted_at, created_at,        │
│          name, FULLTEXT(tags)           │
└────────────────┬────────────────────────┘
                 │ 1:N
                 │
    ┌────────────┴──────────────┐
    │                           │
    ▼                           ▼
┌──────────────────┐  ┌───────────────────┐
│  media_tags      │  │ media_access_log  │
├──────────────────┤  ├───────────────────┤
│ PK  id           │  │ PK  id            │
│ FK  media_id ────┼─ │ FK  media_id ─────┼─\
│ --- tag          │  │ FK  user_id       │  (optional)
│ --- created_at   │  │ --- action        │
├──────────────────┤  │ --- ip_address    │
│ Index: media_id, │  │ --- user_agent    │
│        tag       │  │ --- accessed_at   │
└──────────────────┘  └───────────────────┘
                            │ 1:N
                            │
                            ▼
                    ┌──────────────────┐
                    │ media_thumbnails │
                    ├──────────────────┤
                    │ PK  id           │
                    │ FK  media_id ────┼─\
                    │ --- thumbnail_   │  (optional)
                    │     url          │
                    │ --- width        │
                    │ --- height       │
                    │ --- size         │
                    │ --- generated_at │
                    └──────────────────┘
```

## API Endpoint Hierarchy

```
/api/media
├── /presign
│   ├── POST /presign           ← Single URL
│   └── POST /presign/batch     ← Multiple URLs
│
├── POST /                      ← Create media
│
├── GET /                       ← List with filters
│   └── Query params:
│       ├── ?kind=document|image|video
│       ├── ?search=...
│       ├── ?projectId=...
│       ├── ?page=1
│       └── ?limit=20
│
├── /:id
│   ├── GET /:id                ← Get single
│   ├── PATCH /:id              ← Update
│   └── DELETE /:id             ← Soft delete
│
├── /stats
│   └── GET /stats/overview     ← Statistics
│
└── /:id
    ├── POST /:id/thumbnail    ← Generate thumbnail
    └── GET /:id/stream        ← Stream video
```

## Error Response Flow

```
Client Request
        │
        ▼
┌──────────────────┐
│ Validate Request │
└────────┬─────────┘
         │ Error?
         ├─ NO ──> [Process Request] ──> [Success Response]
         │
         └─ YES ──> [Determine Error Type]
                    │
                    ├─ Bad Request (400)
                    │  Missing/invalid fields
                    │
                    ├─ Unauthorized (401)
                    │  Missing/invalid JWT
                    │
                    ├─ Not Found (404)
                    │  Media doesn't exist
                    │
                    ├─ Payload Too Large (413)
                    │  File exceeds limit
                    │
                    ├─ Unsupported Type (415)
                    │  Invalid MIME type
                    │
                    └─ Server Error (500)
                       Database/system error
                            │
                            ▼
                    Return Error Response:
                    {
                      "status": "error",
                      "message": "Description",
                      "data": null
                    }
```

## Middleware Stack

```
Request
   │
   ▼
┌──────────────────────────────┐
│ Express Middleware           │
├──────────────────────────────┤
│ • urlencoded parser          │
│ • json parser                │
│ • cors middleware            │
│ • security headers           │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ API Endpoint (e.g., POST /)  │
├──────────────────────────────┤
│ • tokenValidator             │ ← Check JWT
│   (all /api/media routes)    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Route Handler                │
├──────────────────────────────┤
│ router.post('/', handler)    │
│ (wrapped in asyncHandler)    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Controller Function          │
├──────────────────────────────┤
│ • Validate input             │
│ • Call model functions       │
│ • Format response            │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Model Functions              │
├──────────────────────────────┤
│ • Database queries           │
│ • Error handling             │
│ • Data transformation        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ MySQL Connection Pool        │
├──────────────────────────────┤
│ • Execute query              │
│ • Return results             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Global Error Handler         │
├──────────────────────────────┤
│ • Catch async errors         │
│ • Format error response      │
│ • Log errors                 │
└──────────────┬───────────────┘
               │
               ▼
Response to Client
```

## Database Query Examples

### Get active documents with pagination
```
SELECT * FROM media
WHERE kind = 'document' 
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20 OFFSET 0
```

### Search media
```
SELECT * FROM media
WHERE (name LIKE '%invoice%' 
    OR tags LIKE '%invoice%')
  AND deleted_at IS NULL
ORDER BY created_at DESC
```

### Get statistics
```
SELECT 
  COUNT(*) as total,
  SUM(size) as totalSize,
  kind,
  COUNT(*) as count
FROM media
WHERE deleted_at IS NULL
GROUP BY kind
```

### Soft delete
```
UPDATE media 
SET deleted_at = NOW()
WHERE id = 123
  AND deleted_at IS NULL
```

## Performance Optimization

```
┌─────────────────────────────────┐
│  Optimization Techniques        │
├─────────────────────────────────┤
│                                 │
│ ✓ Database Indexes              │
│   - idx_kind (fast filtering)   │
│   - idx_user_id (ownership)     │
│   - idx_deleted_at (soft delete)│
│   - FULLTEXT(tags) (search)     │
│                                 │
│ ✓ Connection Pooling            │
│   - Reuse connections           │
│   - Prevent connection overhead │
│                                 │
│ ✓ Pagination                    │
│   - Limit result sets           │
│   - Reduce memory usage         │
│                                 │
│ ✓ Caching Strategy (future)     │
│   - Cache popular media         │
│   - Thumbnail cache             │
│   - Query result cache          │
│                                 │
│ ✓ Async Operations (future)     │
│   - Thumbnail generation        │
│   - Access logging              │
│   - Email notifications         │
│                                 │
└─────────────────────────────────┘
```

## Deployment Architecture (Future)

```
                    ┌──────────────┐
                    │    CDN       │
                    │  (Images)    │
                    └──────┬───────┘
                           │
┌──────────┐    ┌──────────┴─────────┐    ┌──────────┐
│ Client 1 │    │  Load Balancer     │    │ Client 2 │
└──────┬───┘    └──────────┬─────────┘    └────┬─────┘
       │                   │                    │
       └───────────────────┼────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐     ┌──────────┐    ┌──────────┐
    │  Server  │     │  Server  │    │  Server  │
    │    1     │     │    2     │    │    3     │
    └────┬─────┘     └────┬─────┘    └────┬─────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐   ┌──────────┐
    │   S3     │    │   MySQL  │   │  Redis   │
    │ Storage  │    │Database  │   │ (cache)  │
    └──────────┘    └──────────┘   └──────────┘
```

---

This visual guide complements the detailed documentation in `src/p.media/` directory.
