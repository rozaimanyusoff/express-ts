# Media Module Documentation

## Overview

The Media module manages and serves media contents (documents, images, videos) with pre-signed URLs, metadata storage, and comprehensive filtering capabilities. It provides a complete workflow from upload initiation through storage and retrieval.

### Key Features

- **Pre-signed URL generation** for secure, time-bound uploads
- **Multi-kind support**: documents, images, videos with kind-specific validation
- **Soft-delete audit trail** for compliance and recovery
- **Batch presign operations** for efficient multi-file uploads
- **Flexible filtering** by kind, project, tags, and search terms
- **Pagination support** with customizable limits
- **Media statistics** and analytics
- **Streaming support** with range request capability
- **Thumbnail generation** pipeline for images and videos

## Architecture

### MVC Structure

```
src/p.media/
├── mediaModel.ts      # Database operations and queries
├── mediaController.ts # Business logic and request handling
├── mediaRoutes.ts     # Route definitions and validation
```

### Database Design

The module uses the `media` database with:
- **media** table: Core metadata storage with soft deletes
- **media_tags** table: Normalized tag system (optional)
- **media_access_log** table: Audit trail for access tracking
- **media_thumbnails** table: Cached thumbnails for performance

See [SCHEMA.md](SCHEMA.md) for detailed table structures.

## Main Workflows

1. **Single File Upload**
   - Client calls `POST /api/media/presign` with filename, mimeType, kind
   - Receives presigned URL and file URL
   - Client performs PUT request to presigned URL
   - Client calls `POST /api/media` with metadata and returned file URL

2. **Batch Upload**
   - Client calls `POST /api/media/presign/batch` with array of files
   - Receives array of presigned URLs
   - Client uploads all files in parallel
   - Client calls `POST /api/media` separately for each file (or implement bulk endpoint)

3. **Media Listing**
   - Call `GET /api/media` with optional filters (kind, search, projectId, page, limit)
   - Receives paginated results with metadata

4. **Media Update**
   - Call `PATCH /api/media/:id` with updatable fields (name, tags, projectId)

5. **Media Deletion**
   - Call `DELETE /api/media/:id` for soft delete
   - Mark as deleted with timestamp for audit trail

## Quick Start Examples

### Generate Pre-signed URL

```bash
curl -X POST http://localhost:3000/api/media/presign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "report.pdf",
    "mimeType": "application/pdf",
    "kind": "document",
    "size": 5242880
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Pre-signed URL generated",
  "data": {
    "presignId": "presign_1704067200000_abc123def",
    "uploadUrl": "http://localhost:3000/api/media/upload/presign_1704067200000_abc123def",
    "fileUrl": "http://localhost:3000/uploads/media/document/1704067200000_report.pdf",
    "expiresIn": 600,
    "maxSize": 52428800,
    "checksum": "chk_1704067200000"
  }
}
```

### Upload File

```bash
# Using the uploadUrl from presign response
curl -X PUT "http://localhost:3000/api/media/upload/presign_1704067200000_abc123def" \
  -H "Content-Type: application/pdf" \
  --data-binary @report.pdf
```

### Create Media Record

```bash
curl -X POST http://localhost:3000/api/media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q4 2024 Report",
    "kind": "document",
    "fileUrl": "http://localhost:3000/uploads/media/document/1704067200000_report.pdf",
    "size": 5242880,
    "mimeType": "application/pdf",
    "tags": ["quarterly", "finance", "2024"],
    "projectId": 42
  }'
```

### List Media

```bash
# Get documents
curl -X GET "http://localhost:3000/api/media?kind=document&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Search media
curl -X GET "http://localhost:3000/api/media?search=invoice&kind=document" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get media for specific project
curl -X GET "http://localhost:3000/api/media?projectId=42" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Media

```bash
curl -X PATCH http://localhost:3000/api/media/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q4 2024 Final Report",
    "tags": ["quarterly", "final", "finance"]
  }'
```

### Delete Media

```bash
curl -X DELETE http://localhost:3000/api/media/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Module Dependencies

| Module | Usage | Path |
|--------|-------|------|
| DB Connection | Pool queries | `src/utils/db.ts` |
| Async Handler | Route wrapper | `src/utils/asyncHandler.ts` |
| Token Validator | Authentication | `src/middlewares/tokenValidator.ts` |
| Error Handler | Global errors | `src/middlewares/errorHandler.ts` |

## Technologies Used

- **Database**: MySQL 8.0+ with InnoDB
- **ORM**: mysql2/promise for connection pooling
- **Validation**: Built-in parameter validation
- **Security**: JWT token validation, MIME type restrictions
- **File Storage**: Configurable upload path (default: `/uploads/media/{kind}/`)

## Access Control

All endpoints require JWT authentication via `tokenValidator` middleware:

```typescript
app.use('/api/media', tokenValidator, mediaRoutes);
```

User ID extracted from JWT token (`req.user.id`) for:
- User ownership tracking
- User-scoped media queries
- Audit logging

## Key Metrics

| Metric | Value |
|--------|-------|
| Tables | 4 (primary + 3 optional) |
| Endpoints | 13 (core) + 2 (streaming) |
| Pre-signed URL expiry | 10 minutes |
| Document max size | 50 MB |
| Image max size | 10 MB |
| Video max size | 500 MB |
| Soft delete support | Yes |
| Pagination support | Yes |

## Common Error Scenarios

### 413 Payload Too Large
- Happens when file size exceeds kind limit
- **Solution**: Compress or split large files

### 415 Unsupported Media Type
- MIME type not allowed for kind
- **Solution**: Use allowed MIME types per kind

### 404 Media Not Found
- Media ID doesn't exist or has been deleted
- **Solution**: Verify media ID and check it wasn't soft-deleted

### 401 Unauthorized
- Missing or invalid JWT token
- **Solution**: Ensure valid token in Authorization header

## Next Steps

- **[API.md](API.md)** - Complete endpoint reference with examples
- **[SCHEMA.md](SCHEMA.md)** - Database tables and relationships
- **[ENHANCEMENTS.md](ENHANCEMENTS.md)** - Advanced features and implementation patterns
