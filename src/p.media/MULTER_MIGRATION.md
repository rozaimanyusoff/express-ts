# Media Module Upload Migration to createUploader

## Overview

The media module now uses the existing **`createUploader` utility** from `src/utils/fileUploader.ts` instead of custom presigned URL handling. This aligns with how other modules (billing, compliance, asset, training, project) handle file uploads.

## Why This Change?

**Consistency:** All modules now use the same battle-tested upload pattern  
**Maintainability:** Reduces code duplication  
**Standard Features:** Multer handles MIME validation, file size limits, disk storage, and error handling  
**Production Ready:** Proven in multiple modules handling real uploads

## New Endpoints

### 1. POST /api/media/upload/document
Upload documents (50MB max by default)

```bash
curl -X POST http://localhost:3000/api/media/upload/document \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@document.pdf"
```

**Supported MIME Types:**
- application/pdf
- application/msword
- application/vnd.openxmlformats-officedocument.wordprocessingml.document
- application/vnd.ms-excel
- application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- text/plain, text/csv

**Response:**
```json
{
  "status": "success",
  "message": "Document uploaded successfully",
  "data": {
    "id": 1,
    "name": "document.pdf",
    "kind": "document",
    "fileUrl": "/uploads/media/documents/file-123456789.pdf",
    "size": 2048000,
    "mimeType": "application/pdf",
    "userId": 5,
    "createdAt": "2024-01-23T10:30:00Z"
  }
}
```

### 2. POST /api/media/upload/image
Upload images (10MB max by default)

```bash
curl -X POST http://localhost:3000/api/media/upload/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@photo.jpg"
```

**Supported MIME Types:**
- image/jpeg, image/png, image/gif, image/webp, image/svg+xml

### 3. POST /api/media/upload/video
Upload videos (10MB max by default, configurable via UPLOAD_MAX_FILE_SIZE)

```bash
curl -X POST http://localhost:3000/api/media/upload/video \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@video.mp4"
```

**Supported MIME Types:**
- video/mp4, video/mpeg, video/quicktime, video/x-msvideo, video/x-matroska, video/webm

## File Storage

Files are automatically stored in:
- **Documents:** `/uploads/media/documents/{fieldname}-{timestamp}-{random}.{ext}`
- **Images:** `/uploads/media/images/{fieldname}-{timestamp}-{random}.{ext}`
- **Videos:** `/uploads/media/videos/{fieldname}-{timestamp}-{random}.{ext}`

Example: `/uploads/media/documents/file-1705942200000-123456789.pdf`

## Controller Implementation

All three upload endpoints now follow the same pattern:

```typescript
export const uploadDocument = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const file = req.file; // Provided by multer middleware

  if (!file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded',
      data: null,
    });
  }

  try {
    // Create media record in database
    const mediaId = await mediaModel.createMedia(userId, {
      name: file.originalname,
      kind: 'document',
      fileUrl: `/uploads/media/documents/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
    });

    // Fetch and return created media
    const media = await mediaModel.getMediaById(mediaId);

    return res.status(201).json({
      status: 'success',
      message: 'Document uploaded successfully',
      data: media,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};
```

## Route Registration

```typescript
import { createUploader, validateUploadedFile } from '../utils/fileUploader';

const documentUploader = createUploader('media/documents', [
  'application/pdf',
  // ... other MIME types
]);

const imageUploader = createUploader('media/images', [
  'image/jpeg',
  // ... other MIME types
]);

const videoUploader = createUploader('media/videos', [
  'video/mp4',
  // ... other MIME types
]);

// Routes with multer middleware
router.post(
  '/upload/document',
  documentUploader.single('file'),
  validateUploadedFile,
  asyncHandler(mediaController.uploadDocument)
);

router.post(
  '/upload/image',
  imageUploader.single('file'),
  validateUploadedFile,
  asyncHandler(mediaController.uploadImage)
);

router.post(
  '/upload/video',
  videoUploader.single('file'),
  validateUploadedFile,
  asyncHandler(mediaController.uploadVideo)
);
```

## Middleware Chain

For each upload endpoint:

1. **createUploader()** - Multer middleware
   - Validates MIME type
   - Checks file size limit
   - Stores file to disk
   - Populates `req.file` with metadata

2. **validateUploadedFile** - Custom middleware
   - Ensures file was actually uploaded
   - Returns 400 if missing

3. **asyncHandler** - Error wrapper
   - Catches async errors
   - Formats error responses

4. **Controller** - Business logic
   - Creates database record
   - Returns media metadata

## Configuration

### Environment Variables

Set `UPLOAD_MAX_FILE_SIZE` to control all upload sizes (bytes):

```bash
# Default: 10MB
UPLOAD_MAX_FILE_SIZE=10485760

# 500MB for videos
UPLOAD_MAX_FILE_SIZE=524288000

# 50MB for documents
UPLOAD_MAX_FILE_SIZE=52428800
```

### Custom MIME Types

Modify the uploader instantiation in `mediaRoutes.ts`:

```typescript
const documentUploader = createUploader('media/documents', [
  'application/pdf',
  'application/msword',
  // Add your custom MIME types here
]);
```

## Removed Features

The following presigned URL endpoints are no longer available:

- ~~POST /api/media/presign~~ → Use POST /api/media/upload/{kind}
- ~~POST /api/media/presign/batch~~ → Use individual upload endpoints
- ~~PUT /api/media/upload/:presignId~~ → Handled directly by multer

## Comparison: Old vs New

| Feature | Old (Presigned) | New (Multer) |
|---------|---|---|
| Flow | presign → PUT /upload/:id | Direct POST /upload/:kind |
| MIME Validation | Custom in controller | Multer fileFilter |
| Size Validation | Custom in controller | Multer limits |
| File Storage | Custom stream handling | Multer diskStorage |
| File Naming | Timestamp + presignId | Multer default pattern |
| Directory Creation | Manual with fs.mkdir | Automatic by multer |
| Error Cleanup | Manual unlinkSync | Automatic on error |
| Consistency | Custom implementation | Standard across codebase |

## Testing

### Test Document Upload
```bash
curl -X POST http://localhost:3000/api/media/upload/document \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test.pdf" \
  -v
```

### Test Image Upload
```bash
curl -X POST http://localhost:3000/api/media/upload/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@image.jpg" \
  -v
```

### Test with Invalid MIME Type
```bash
# This should fail (executable file, not a document)
curl -X POST http://localhost:3000/api/media/upload/document \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@script.exe"
# Response: 400 Bad Request - Unsupported file type
```

### Test Oversized File
```bash
# Create a 100MB file and try to upload (if limit is 50MB)
# Should fail with file size validation error
```

## Related Files

- [mediaRoutes.ts](mediaRoutes.ts) - Route definitions with multer setup
- [mediaController.ts](mediaController.ts) - Upload handlers
- [../utils/fileUploader.ts](../utils/fileUploader.ts) - createUploader utility
- [SCHEMA.md](SCHEMA.md) - Database schema
- [API.md](API.md) - Complete API reference (updated)

## Migration Guide for Developers

If you were using the old presigned URL approach:

### Before
```typescript
// Step 1: Generate presigned URL
POST /api/media/presign
Body: { filename, mimeType, kind, size }

// Step 2: Upload using presigned URL
PUT /api/media/upload/:presignId
Body: raw file content

// Step 3: Create media record
POST /api/media
Body: { name, kind, fileUrl, size, mimeType }
```

### After
```typescript
// Single step: Upload and create record atomically
POST /api/media/upload/document | /upload/image | /upload/video
Body: multipart form-data with 'file' field
```

## Notes

- All uploads require JWT authentication (tokenValidator middleware)
- Files are stored in predictable directories for easy access
- Database records are created automatically upon successful upload
- MIME type and size validation happen before file storage
- Failed uploads don't clutter the filesystem (multer handles cleanup)
