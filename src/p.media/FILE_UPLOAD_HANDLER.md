# Media Module - File Upload Handler Implementation

## What Was Added

### New Endpoint: PUT /api/media/upload/:presignId

This endpoint handles the **actual file upload** using the presigned URL returned from `POST /api/media/presign`.

## Upload Workflow

```
1. Client → POST /api/media/presign
   ↓
2. Server returns { uploadUrl, fileUrl, presignId, expiresIn }
   ↓
3. Client → PUT /api/media/upload/:presignId
   with file content in request body
   ↓
4. Server receives file, validates it, saves to disk
   ↓
5. Server returns { fileUrl, filename, size, uploadedAt }
   ↓
6. Client → POST /api/media
   with fileUrl and metadata
   ↓
7. Server creates media record in database
   ↓
8. File is now accessible at: /uploads/media/{kind}/{filename}
```

## Implementation Details

### New Controller Function: `handleFileUpload()`

**Location:** `src/p.media/mediaController.ts`

**Features:**
- Accepts raw file content in request body
- Determines file type from Content-Type header
- Validates MIME type
- Creates upload directory if needed
- Saves file to disk with timestamp
- Returns fileUrl for media record creation
- Handles upload errors gracefully
- Cleans up partial files on error

**MIME Type to Extension Mapping:**
```typescript
{
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'video/mp4': '.mp4',
  // ... 15+ types total
}
```

### New Route

**Location:** `src/p.media/mediaRoutes.ts`

```typescript
router.put('/upload/:presignId', asyncHandler(mediaController.handleFileUpload));
```

### File Storage Path

Files are saved to:
```
{UPLOAD_BASE_PATH}/media/{kind}/{timestamp}_{presignId}
```

Example:
```
/uploads/media/document/1704067200000_presign_abc123
/uploads/media/image/1704067200000_presign_def456
/uploads/media/video/1704067200000_presign_ghi789
```

## Updated Upload Workflow

### Step 1: Generate Presigned URL
```bash
curl -X POST http://localhost:3000/api/media/presign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "document.pdf",
    "mimeType": "application/pdf",
    "kind": "document"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Pre-signed URL generated",
  "data": {
    "presignId": "presign_1704067200000_abc123",
    "uploadUrl": "http://localhost:3000/api/media/upload/presign_1704067200000_abc123",
    "fileUrl": "http://localhost:3000/uploads/media/document/1704067200000_document.pdf",
    "expiresIn": 600,
    "maxSize": 52428800
  }
}
```

### Step 2: Upload File to Presigned URL
```bash
curl -X PUT "http://localhost:3000/api/media/upload/presign_1704067200000_abc123" \
  -H "Content-Type: application/pdf" \
  --data-binary @document.pdf
```

**Response:**
```json
{
  "status": "success",
  "message": "File uploaded successfully",
  "data": {
    "presignId": "presign_1704067200000_abc123",
    "filename": "1704067200000_presign_abc123.pdf",
    "fileUrl": "http://localhost:3000/uploads/media/document/1704067200000_presign_abc123.pdf",
    "size": 5242880,
    "mimeType": "application/pdf",
    "uploadedAt": "2024-01-23T22:40:00Z"
  }
}
```

### Step 3: Create Media Record
```bash
curl -X POST http://localhost:3000/api/media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Document",
    "kind": "document",
    "fileUrl": "http://localhost:3000/uploads/media/document/1704067200000_presign_abc123.pdf",
    "size": 5242880,
    "mimeType": "application/pdf",
    "tags": ["important", "2024"],
    "projectId": 42
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Media created successfully",
  "data": {
    "id": 1,
    "name": "My Document",
    "kind": "document",
    "file_url": "http://localhost:3000/uploads/media/document/1704067200000_presign_abc123.pdf",
    "size": 5242880,
    "mime_type": "application/pdf",
    "user_id": 42,
    "project_id": 42,
    "tags": "important,2024",
    "created_at": "2024-01-23T22:40:00Z",
    "updated_at": "2024-01-23T22:40:00Z",
    "deleted_at": null
  }
}
```

## How It Works

### File Stream Processing

```typescript
req.pipe(writeStream)
  .on('finish', () => {
    // File saved successfully
    // Return fileUrl and metadata
  })
  .on('error', (error) => {
    // Clean up partial file
    // Return error response
  });
```

### Directory Creation

```typescript
const uploadDir = path.join(UPLOAD_BASE_PATH, 'media', kind);
fs.mkdirSync(uploadDir, { recursive: true });
```

Creates directory structure if it doesn't exist:
```
{UPLOAD_BASE_PATH}/media/
├── document/
├── image/
└── video/
```

### Error Handling

- ✅ Missing presignId → 400 Bad Request
- ✅ Missing Content-Type → 400 Bad Request
- ✅ Stream write error → 500 Server Error
- ✅ File system error → 500 Server Error
- ✅ Partial file cleanup on error

## Updated API Documentation

### Complete Upload Endpoint

**PUT** `/api/media/upload/:presignId`

**Description:** Upload file content to presigned URL

**Headers:**
```
Content-Type: application/pdf (or appropriate MIME type)
```

**Body:**
Raw file binary content

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `presignId` | string | Presign ID from presign response |

**Response (200):**
```json
{
  "status": "success",
  "message": "File uploaded successfully",
  "data": {
    "presignId": "presign_...",
    "filename": "1704067200000_presign_abc123.pdf",
    "fileUrl": "http://localhost:3000/uploads/media/document/...",
    "size": 5242880,
    "mimeType": "application/pdf",
    "uploadedAt": "2024-01-23T22:40:00Z"
  }
}
```

**Errors:**

| Status | Message |
|--------|---------|
| 400 | Invalid presign ID |
| 400 | Content-Type header required |
| 500 | Upload failed: {error message} |

## Files Modified

1. **src/p.media/mediaController.ts**
   - Added `import fs from 'fs'`
   - Added `import path from 'path'`
   - Added `UPLOAD_BASE_PATH` constant
   - Added `handleFileUpload()` function
   - Added `getFileExtensionFromMimeType()` helper

2. **src/p.media/mediaRoutes.ts**
   - Added `PUT /upload/:presignId` route

## Testing the Upload

### Using cURL

```bash
# 1. Generate presigned URL
PRESIGN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/media/presign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.pdf",
    "mimeType": "application/pdf",
    "kind": "document"
  }')

# Extract uploadUrl from response
UPLOAD_URL=$(echo $PRESIGN_RESPONSE | jq -r '.data.uploadUrl')
FILE_URL=$(echo $PRESIGN_RESPONSE | jq -r '.data.fileUrl')

# 2. Upload file
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary @test.pdf

# 3. Create media record
curl -X POST http://localhost:3000/api/media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Document\",
    \"kind\": \"document\",
    \"fileUrl\": \"$FILE_URL\",
    \"size\": $(stat -f%z test.pdf),
    \"mimeType\": \"application/pdf\"
  }"

# 4. Verify file exists
ls -lh /uploads/media/document/
```

## Summary

✅ **File upload handler** - `PUT /api/media/upload/:presignId`
✅ **File stream processing** - Efficient piping to disk
✅ **Directory creation** - Auto-creates upload directories
✅ **MIME type mapping** - Correct file extensions
✅ **Error handling** - Cleanup and proper responses
✅ **Response metadata** - Returns fileUrl and metadata for next step

The media module now has a **complete working upload pipeline**!
