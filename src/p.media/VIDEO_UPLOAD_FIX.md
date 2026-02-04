# Video Upload Size Limit Fix

## Issue
Video uploads were failing with sizing limit errors despite having `UPLOAD_MAX_FILE_SIZE=524288000` (500MB) configured in `.env`.

## Root Cause
The Express.js middleware body size limits were hardcoded to 10MB in `src/app.ts`:
```typescript
app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(json({ limit: '10mb' }));
```

This caused all requests larger than 10MB to be rejected by Express before reaching the multer upload handler, which had a much higher limit configured.

## Solution
Updated the Express middleware limits in [src/app.ts](src/app.ts) to 500MB to match the multer configuration:

```typescript
// Increase request size limits to support large file uploads (especially videos)
// Note: UPLOAD_MAX_FILE_SIZE in .env controls multer's individual file size limit
app.use(urlencoded({ extended: true, limit: '500mb' }));
app.use(json({ limit: '500mb' }));
```

## Configuration Summary

| Component | Limit | Configuration |
|-----------|-------|----------------|
| Express Body Size | 500MB | `src/app.ts` |
| Multer File Size | 500MB | `.env: UPLOAD_MAX_FILE_SIZE=524288000` |
| Supported Media Types | Video, Image, Document | `src/p.media/mediaRoutes.ts` |

## Supported Video Formats
- `video/mp4` - MP4 files
- `video/mpeg` - MPEG video
- `video/quicktime` - MOV files
- `video/x-msvideo` - AVI files
- `video/x-matroska` - MKV files
- `video/webm` - WebM files

## Testing Video Upload
```bash
# Test with curl
curl -X POST http://localhost:3000/api/media/upload/video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@video.mp4"
```

## Changes Made
- Modified: [src/app.ts](src/app.ts#L63-L64)
- Rebuilt: TypeScript compilation successful
- Status: Ready for deployment

## Environment Variables
- `UPLOAD_MAX_FILE_SIZE` - Individual file size limit in bytes (default: 500MB)
- `TRUST_PROXY` - Enable if behind reverse proxy
- `BACKEND_URL` - Base URL for serving uploaded files
