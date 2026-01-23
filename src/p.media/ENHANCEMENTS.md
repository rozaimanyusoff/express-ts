# Media Module - Features & Enhancements

## Advanced Features & Implementation Patterns

### 1. S3/GCS Integration (Production-Ready)

#### Feature Overview

Replace local file storage with cloud object storage for:
- Scalability: Handle unlimited storage
- Durability: Built-in replication and backup
- Cost efficiency: Pay-per-use model
- Performance: CDN integration for fast delivery

#### Implementation Pattern

**S3 Pre-signed URL Generation:**

```typescript
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

export const generatePresignedUrlS3 = async (
  userId: number,
  filename: string,
  mimeType: string,
  kind: 'document' | 'image' | 'video'
): Promise<{ uploadUrl: string; fileUrl: string }> => {
  const key = `media/${kind}/${Date.now()}_${filename}`;
  
  const uploadUrl = s3.getSignedUrl('putObject', {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
    Expires: 600, // 10 minutes
    Metadata: {
      userId: userId.toString(),
      kind,
      uploadedAt: new Date().toISOString(),
    },
  });

  const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl };
};
```

**Database Changes:**

```sql
-- Add S3 metadata columns
ALTER TABLE media.media ADD COLUMN s3_key VARCHAR(512);
ALTER TABLE media.media ADD COLUMN s3_etag VARCHAR(100);
ALTER TABLE media.media ADD COLUMN storage_provider ENUM('local', 's3', 'gcs') DEFAULT 'local';
```

**Environment Configuration:**

```env
# AWS S3
AWS_ACCESS_KEY=your_access_key
AWS_SECRET_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=my-media-bucket

# GCS (alternative)
GCS_PROJECT_ID=my-project
GCS_BUCKET_NAME=my-media-bucket
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

#### Benefits

- ✅ Unlimited scalability
- ✅ Automatic backups
- ✅ Global CDN distribution
- ✅ Encryption at rest
- ✅ Access logging and auditing

---

### 2. Thumbnail Generation Pipeline

#### Feature Overview

Automatically generate and cache thumbnails for:
- Images: Convert to WebP, resize multiple sizes
- Videos: Extract keyframes at intervals
- Documents: Generate first page preview

#### Implementation Pattern

**Database Table:**

```sql
CREATE TABLE media.media_thumbnails (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  media_id INT UNSIGNED NOT NULL,
  thumbnail_url VARCHAR(512),
  width INT,
  height INT,
  size INT,
  generated_at TIMESTAMP,
  FOREIGN KEY (media_id) REFERENCES media.media(id) ON DELETE CASCADE
);
```

**Async Job Queue (using Bull/RabbitMQ):**

```typescript
import Queue from 'bull';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg';

const thumbnailQueue = new Queue('thumbnails', {
  redis: { host: '127.0.0.1', port: 6379 }
});

// Queue thumbnail job after media creation
export const queueThumbnailGeneration = async (mediaId: number) => {
  await thumbnailQueue.add({ mediaId }, { delay: 1000 });
};

// Process thumbnails
thumbnailQueue.process(async (job) => {
  const { mediaId } = job.data;
  const media = await getMediaById(mediaId);
  
  if (!media) return;

  try {
    if (media.kind === 'image') {
      // Generate image thumbnail
      const thumbnailPath = await generateImageThumbnail(media.file_url);
      await saveThumbnailRecord(mediaId, thumbnailPath);
    } else if (media.kind === 'video') {
      // Extract video frame
      const framePath = await extractVideoFrame(media.file_url);
      await saveThumbnailRecord(mediaId, framePath);
    }
  } catch (error) {
    console.error(`Failed to generate thumbnail for media ${mediaId}:`, error);
    throw error; // Retry
  }
});

// Image thumbnail generation
async function generateImageThumbnail(fileUrl: string) {
  const filename = path.basename(fileUrl);
  const thumbnailPath = `/uploads/thumbnails/image/${Date.now()}_${filename}`;
  
  await sharp(fileUrl)
    .resize(300, 300, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(path.join(process.cwd(), thumbnailPath));
  
  return thumbnailPath;
}

// Video frame extraction
async function extractVideoFrame(fileUrl: string) {
  const filename = path.basename(fileUrl);
  const framePath = `/uploads/thumbnails/video/${Date.now()}_${filename}.png`;
  
  return new Promise((resolve, reject) => {
    ffmpeg(fileUrl)
      .on('error', reject)
      .on('end', () => resolve(framePath))
      .screenshot({
        count: 1,
        folder: path.dirname(framePath),
        filename: path.basename(framePath),
        timestamps: ['25%'], // 25% into video
      });
  });
}
```

**API Enhancement:**

```typescript
// Update controller
export const generateThumbnail = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mediaId = parseInt(id);

  try {
    const media = await getMediaById(mediaId);
    if (!media) {
      return res.status(404).json({
        status: 'error',
        message: 'Media not found',
        data: null,
      });
    }

    // Queue generation
    await queueThumbnailGeneration(mediaId);

    return res.json({
      status: 'success',
      message: 'Thumbnail generation queued',
      data: { mediaId, status: 'processing' },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

// Add endpoint to retrieve thumbnail
export const getThumbnail = async (req: Request, res: Response) => {
  const { id } = req.params;
  const thumbnail = await getThumbnailRecord(parseInt(id));
  
  if (!thumbnail) {
    return res.status(404).json({
      status: 'error',
      message: 'Thumbnail not found',
      data: null,
    });
  }

  return res.json({
    status: 'success',
    message: 'Thumbnail retrieved',
    data: thumbnail,
  });
};
```

#### Benefits

- ✅ Faster UI rendering
- ✅ Better user experience
- ✅ Reduced bandwidth for previews
- ✅ Async processing prevents blocking

---

### 3. Video Streaming with Range Requests

#### Feature Overview

Enable efficient video playback with:
- HTTP 206 Partial Content responses
- Seeking support in video players
- Adaptive bitrate streaming

#### Implementation Pattern

```typescript
import fs from 'fs';
import path from 'path';

export const streamMedia = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mediaId = parseInt(id);

  try {
    const media = await getMediaById(mediaId);
    if (!media) {
      return res.status(404).json({
        status: 'error',
        message: 'Media not found',
        data: null,
      });
    }

    // Only support streaming for video/audio
    if (!['video', 'audio'].includes(media.kind)) {
      return res.status(400).json({
        status: 'error',
        message: 'Streaming not supported for this media type',
        data: null,
      });
    }

    const filepath = media.file_url.replace(process.env.API_BASE_URL, process.cwd());
    const stat = fs.statSync(filepath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Handle range request
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        return res.status(416).json({
          status: 'error',
          message: 'Range Not Satisfiable',
          data: null,
        });
      }

      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': media.mime_type,
      });

      fs.createReadStream(filepath, { start, end }).pipe(res);
    } else {
      // Full file stream
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': media.mime_type,
      });

      fs.createReadStream(filepath).pipe(res);
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};
```

**Add Route:**

```typescript
router.get('/:id/stream', asyncHandler(streamMedia));
```

#### Client-Side Usage

```html
<video width="640" height="360" controls>
  <source src="/api/media/123/stream" type="video/mp4">
  Your browser does not support the video tag.
</video>
```

#### Benefits

- ✅ Efficient playback of large videos
- ✅ Seeking support
- ✅ Reduced initial buffer time
- ✅ Better mobile experience

---

### 4. Access Logging & Audit Trail

#### Feature Overview

Track all media access for:
- Compliance and audit requirements
- Usage analytics
- Security monitoring

#### Implementation Pattern

**Logging Service:**

```typescript
import { pool } from '../utils/db';

export const logMediaAccess = async (
  mediaId: number,
  userId: number,
  action: 'view' | 'download' | 'share',
  ipAddress?: string,
  userAgent?: string
) => {
  const sql = `
    INSERT INTO media.media_access_log 
    (media_id, user_id, action, ip_address, user_agent, accessed_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  await pool.query(sql, [mediaId, userId, action, ipAddress, userAgent]);
};

// Get access history
export const getAccessHistory = async (
  mediaId: number,
  limit: number = 100
) => {
  const sql = `
    SELECT * FROM media.media_access_log 
    WHERE media_id = ? 
    ORDER BY accessed_at DESC 
    LIMIT ?
  `;

  const [logs] = await pool.query(sql, [mediaId, limit]);
  return logs;
};

// Get user activity
export const getUserActivity = async (
  userId: number,
  kind?: string,
  limit: number = 100
) => {
  let sql = `
    SELECT mal.*, m.kind, m.name 
    FROM media.media_access_log mal
    JOIN media.media m ON mal.media_id = m.id
    WHERE mal.user_id = ?
  `;
  const params: any[] = [userId];

  if (kind) {
    sql += ' AND m.kind = ?';
    params.push(kind);
  }

  sql += ' ORDER BY mal.accessed_at DESC LIMIT ?';
  params.push(limit);

  const [logs] = await pool.query(sql, params);
  return logs;
};
```

**Middleware to Track Access:**

```typescript
const accessLogMiddleware = (action: 'view' | 'download' | 'share') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const mediaId = parseInt(req.params.id);
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    if (userId && !isNaN(mediaId)) {
      logMediaAccess(mediaId, userId, action, ipAddress, userAgent).catch(err => {
        console.error('Failed to log media access:', err);
      });
    }

    next();
  };
};

// Apply to endpoints
router.get('/:id', accessLogMiddleware('view'), asyncHandler(getMedia));
router.get('/:id/download', accessLogMiddleware('download'), asyncHandler(downloadMedia));
```

**Analytics Endpoint:**

```typescript
export const getMediaAnalytics = async (req: Request, res: Response) => {
  const { mediaId, days = 30 } = req.query;

  try {
    const sql = `
      SELECT 
        action,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM media.media_access_log
      WHERE media_id = ? AND accessed_at > DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY action
    `;

    const [stats] = await pool.query(sql, [mediaId, days]);

    return res.json({
      status: 'success',
      data: { mediaId, period: `last_${days}_days`, stats },
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

#### Benefits

- ✅ Compliance with audit requirements
- ✅ Security monitoring
- ✅ Usage insights
- ✅ User accountability

---

### 5. Batch Operations

#### Feature Overview

Optimize bulk operations:
- Batch upload
- Batch delete
- Batch move to project
- Batch tag

#### Implementation Pattern

```typescript
// Batch create media records
export const bulkCreateMedia = async (req: Request, res: Response) => {
  const { items } = req.body;
  const userId = req.user?.id;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'items must be a non-empty array',
      data: null,
    });
  }

  try {
    const results: any[] = [];
    const errors: any[] = [];

    for (const item of items) {
      try {
        const mediaId = await createMedia(userId, item);
        const media = await getMediaById(mediaId);
        results.push({ success: true, data: media });
      } catch (error) {
        errors.push({
          item: item.name,
          error: (error as Error).message,
        });
      }
    }

    return res.status(201).json({
      status: 'partial', // or 'success' if no errors
      message: `Created ${results.length} media records${errors.length ? `, ${errors.length} failed` : ''}`,
      data: { created: results, errors },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

// Batch delete
export const bulkDeleteMedia = async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'ids must be a non-empty array',
      data: null,
    });
  }

  try {
    const deleted: number[] = [];
    const notFound: number[] = [];

    for (const id of ids) {
      const media = await getMediaById(id);
      if (!media) {
        notFound.push(id);
      } else {
        await softDeleteMedia(id);
        deleted.push(id);
      }
    }

    return res.json({
      status: deleted.length === ids.length ? 'success' : 'partial',
      message: `Deleted ${deleted.length} media${notFound.length ? `, ${notFound.length} not found` : ''}`,
      data: { deleted, notFound },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

// Batch move to project
export const bulkMoveToProject = async (req: Request, res: Response) => {
  const { ids, projectId } = req.body;

  if (!Array.isArray(ids) || !projectId) {
    return res.status(400).json({
      status: 'error',
      message: 'ids and projectId required',
      data: null,
    });
  }

  try {
    const updated: number[] = [];

    for (const id of ids) {
      const success = await updateMedia(id, { projectId });
      if (success) updated.push(id);
    }

    return res.json({
      status: 'success',
      message: `Moved ${updated.length}/${ids.length} media to project ${projectId}`,
      data: { updated, count: updated.length },
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

**Add Routes:**

```typescript
router.post('/bulk', asyncHandler(bulkCreateMedia));
router.delete('/bulk', asyncHandler(bulkDeleteMedia));
router.patch('/bulk/move', asyncHandler(bulkMoveToProject));
```

#### Benefits

- ✅ Faster bulk operations
- ✅ Better API efficiency
- ✅ Reduced network overhead
- ✅ Atomic transactions

---

### 6. Permission-Based Access Control

#### Feature Overview

Control media access by:
- User ownership
- Project membership
- Role-based permissions

#### Implementation Pattern

```typescript
// Check if user can access media
export const canAccessMedia = async (
  userId: number,
  mediaId: number,
  action: 'view' | 'edit' | 'delete'
): Promise<boolean> => {
  const media = await getMediaById(mediaId);
  
  if (!media) return false;

  // Owner can do anything
  if (media.user_id === userId) return true;

  // Project access check
  if (media.project_id) {
    const isProjectMember = await checkProjectMembership(userId, media.project_id);
    if (isProjectMember) {
      // Could implement role-based permission here
      return true;
    }
  }

  return false;
};

// Middleware to protect endpoints
export const mediaAccessMiddleware = (action: 'view' | 'edit' | 'delete') => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const mediaId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
        data: null,
      });
    }

    const hasAccess = await canAccessMedia(userId, mediaId, action);

    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        data: null,
      });
    }

    next();
  });
};

// Apply to sensitive endpoints
router.patch('/:id', mediaAccessMiddleware('edit'), asyncHandler(updateMedia));
router.delete('/:id', mediaAccessMiddleware('delete'), asyncHandler(deleteMedia));
```

---

## Long-Term Enhancements

### Short-term (Next 1-2 sprints)

- [ ] Thumbnail generation pipeline
- [ ] Access logging and audit trail
- [ ] Batch operations (create, delete, move)
- [ ] S3/GCS integration preparation
- [ ] Video streaming with range requests

### Medium-term (Next quarter)

- [ ] Full S3/GCS migration
- [ ] Advanced search with Elasticsearch
- [ ] Media versioning/history
- [ ] Sharing and permissions system
- [ ] Watermarking for sensitive documents

### Long-term (Future)

- [ ] Machine learning-based tagging
- [ ] OCR for document indexing
- [ ] Image analysis and recognition
- [ ] Media federation (multi-tenant)
- [ ] Real-time collaboration features
