# Media Module - Quick Reference

## Module Location

```
src/p.media/
├── mediaModel.ts      - Database operations
├── mediaController.ts - Business logic
├── mediaRoutes.ts     - Route definitions
├── README.md          - Overview & quick start
├── SCHEMA.md          - Database structure
├── API.md             - Complete API reference
└── ENHANCEMENTS.md    - Advanced features
```

## Database Schema

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS `media`;

-- Run migration
mysql < db/migrations/create_media_module.sql
```

## API Endpoints

### Core Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| **POST** | `/api/media/presign` | Generate presigned URL |
| **POST** | `/api/media/presign/batch` | Batch presigned URLs |
| **POST** | `/api/media` | Create media record |
| **GET** | `/api/media` | List media (with filters) |
| **GET** | `/api/media/:id` | Get single media |
| **PATCH** | `/api/media/:id` | Update media |
| **DELETE** | `/api/media/:id` | Delete media (soft) |

### Utility Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| **GET** | `/api/media/stats/overview` | Get statistics |
| **POST** | `/api/media/:id/thumbnail` | Generate thumbnail |
| **GET** | `/api/media/:id/stream` | Stream media with range support |

## Size Limits & MIME Types

### Document (50MB)
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `text/plain`

### Image (10MB)
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`

### Video (500MB)
- `video/mp4`
- `video/mpeg`
- `video/quicktime`
- `video/x-msvideo`
- `video/webm`

## Upload Workflow

```
1. Client → POST /api/media/presign
   ↓
2. Server returns { uploadUrl, fileUrl }
   ↓
3. Client → PUT {uploadUrl} with file content
   ↓
4. Storage accepts file
   ↓
5. Client → POST /api/media with { fileUrl, metadata }
   ↓
6. Server creates media record in database
```

## Environment Variables

```bash
# Optional - API base URL for presigned URLs
API_BASE_URL=http://localhost:3000

# Upload path configuration
UPLOAD_BASE_PATH=/uploads

# AWS S3 (for future integration)
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
AWS_REGION=us-east-1
AWS_BUCKET_NAME=
```

## Common Queries

### Get user's media
```bash
curl -X GET "http://localhost:3000/api/media?page=1&limit=20" \
  -H "Authorization: Bearer {token}"
```

### Filter by kind
```bash
curl -X GET "http://localhost:3000/api/media?kind=document" \
  -H "Authorization: Bearer {token}"
```

### Search
```bash
curl -X GET "http://localhost:3000/api/media?search=invoice" \
  -H "Authorization: Bearer {token}"
```

### Get project media
```bash
curl -X GET "http://localhost:3000/api/media?projectId=42" \
  -H "Authorization: Bearer {token}"
```

### Filter + Paginate
```bash
curl -X GET "http://localhost:3000/api/media?kind=image&page=2&limit=50" \
  -H "Authorization: Bearer {token}"
```

## Authentication

All endpoints require JWT token:

```
Authorization: Bearer {jwt_token}
```

Token is validated by `tokenValidator` middleware.
User ID extracted from `req.user.id` for ownership tracking.

## Response Format

### Success
```json
{
  "status": "success",
  "message": "Operation description",
  "data": { /* resource */ }
}
```

### Error
```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

## Error Codes

| Status | Meaning |
|--------|---------|
| 200 | OK (GET, PATCH) |
| 201 | Created (POST) |
| 400 | Bad request |
| 401 | Unauthorized |
| 404 | Not found |
| 413 | File too large |
| 415 | Invalid MIME type |
| 500 | Server error |

## Database Tables

| Table | Purpose |
|-------|---------|
| `media.media` | Core media metadata |
| `media.media_tags` | Normalized tags (optional) |
| `media.media_access_log` | Access audit trail (optional) |
| `media.media_thumbnails` | Cached thumbnails (optional) |

## Module Integration

### In app.ts
```typescript
import mediaRoutes from './p.media/mediaRoutes';

// With authentication required
app.use('/api/media', tokenValidator, mediaRoutes);
```

## TypeScript Interfaces

```typescript
interface MediaRecord {
  id: number;
  name: string;
  kind: 'document' | 'image' | 'video';
  file_url: string;
  size: number;
  mime_type: string;
  project_id?: number;
  user_id: number;
  tags?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  etag?: string;
  checksum?: string;
}
```

## Features

✅ Pre-signed URLs for secure uploads
✅ Multi-kind support (document, image, video)
✅ Batch operations for efficiency
✅ Soft delete with audit trail
✅ Pagination and filtering
✅ Search by name and tags
✅ Project-scoped media
✅ Size and MIME type validation
✅ Streaming support with range requests
✅ Thumbnail generation pipeline
✅ Access logging and statistics

## Future Enhancements

- [ ] S3/GCS integration
- [ ] Thumbnail generation (images/videos)
- [ ] Video streaming with HTTP 206
- [ ] Access logging & audit trail
- [ ] Batch operations (create, delete, move)
- [ ] Permission-based access control
- [ ] Advanced search (Elasticsearch)
- [ ] Media versioning/history
- [ ] Sharing and permissions
- [ ] OCR for documents
- [ ] Image analysis & recognition

## Testing Checklist

- [ ] Generate presigned URL
- [ ] Upload file to presigned URL
- [ ] Create media record
- [ ] List all media
- [ ] Filter by kind
- [ ] Search media
- [ ] Get single media
- [ ] Update media metadata
- [ ] Delete media
- [ ] Test pagination
- [ ] Test invalid inputs
- [ ] Test MIME type validation
- [ ] Test size limits
- [ ] Test authentication
- [ ] Verify soft delete
- [ ] Check statistics endpoint

## Quick Debugging

### Check module registration
```bash
grep -r "mediaRoutes" src/app.ts
```

### Verify database tables
```sql
SHOW TABLES FROM media;
DESC media.media;
```

### Check routes
```bash
# See all registered routes
grep -r "/api/media" src/p.media/
```

### View logs
```bash
npm run dev
# Check console for any errors during module loading
```

## Documentation Files

- [README.md](README.md) - Overview & quick start
- [SCHEMA.md](SCHEMA.md) - Database structure & relationships
- [API.md](API.md) - Complete API reference with examples
- [ENHANCEMENTS.md](ENHANCEMENTS.md) - Advanced features & patterns
