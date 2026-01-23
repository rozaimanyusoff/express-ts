# Media Module - Database Schema

## Database Structure

```
media/
├── media (primary table)
├── media_tags (normalized tags)
├── media_access_log (audit trail)
└── media_thumbnails (cached previews)
```

## Core Tables

### `media.media`

Main table storing media metadata with soft delete support.

#### SQL Definition

```sql
CREATE TABLE IF NOT EXISTS `media`.`media` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `kind` ENUM('document', 'image', 'video') NOT NULL,
  `file_url` VARCHAR(512) NOT NULL,
  `size` BIGINT UNSIGNED NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `project_id` INT UNSIGNED,
  `tags` VARCHAR(500),
  `etag` VARCHAR(100),
  `checksum` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_kind` (`kind`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_project_id` (`project_id`),
  INDEX `idx_deleted_at` (`deleted_at`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_name_search` (`name`),
  FULLTEXT INDEX `idx_tags_search` (`tags`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### TypeScript Interface

```typescript
interface MediaRecord extends RowDataPacket {
  id: number;
  name: string;
  kind: 'document' | 'image' | 'video';
  file_url: string;
  size: number;
  mime_type: string;
  project_id?: number;
  user_id: number;
  tags?: string; // Comma-separated
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  etag?: string;
  checksum?: string;
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Unique media identifier |
| `name` | VARCHAR | User-friendly media name |
| `kind` | ENUM | Type: document, image, or video |
| `file_url` | VARCHAR | Storage URL reference |
| `size` | BIGINT | File size in bytes |
| `mime_type` | VARCHAR | MIME type (application/pdf, image/png, etc.) |
| `user_id` | INT | Owner user ID |
| `project_id` | INT | Associated project (nullable) |
| `tags` | VARCHAR | Comma-separated tags for categorization |
| `etag` | VARCHAR | Storage ETag for cache validation |
| `checksum` | VARCHAR | Integrity checksum for verification |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp (NULL = active) |

#### Key Queries

**Get active media**
```sql
SELECT * FROM media.media WHERE deleted_at IS NULL;
```

**Get media by kind**
```sql
SELECT * FROM media.media 
WHERE kind = 'document' AND deleted_at IS NULL 
ORDER BY created_at DESC;
```

**Search media**
```sql
SELECT * FROM media.media 
WHERE (name LIKE '%invoice%' OR tags LIKE '%invoice%') 
  AND deleted_at IS NULL;
```

**Get user's media**
```sql
SELECT * FROM media.media 
WHERE user_id = ? AND deleted_at IS NULL 
ORDER BY created_at DESC;
```

**Get project media**
```sql
SELECT * FROM media.media 
WHERE project_id = ? AND deleted_at IS NULL 
ORDER BY created_at DESC;
```

**Soft delete**
```sql
UPDATE media.media SET deleted_at = NOW() WHERE id = ?;
```

**Get statistics**
```sql
SELECT 
  COUNT(*) as total,
  SUM(size) as totalSize,
  kind,
  COUNT(*) as count
FROM media.media
WHERE deleted_at IS NULL
GROUP BY kind;
```

---

### `media.media_tags` (Optional - Normalized)

Normalized tag table for efficient tag-based queries.

#### SQL Definition

```sql
CREATE TABLE IF NOT EXISTS `media`.`media_tags` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT UNSIGNED NOT NULL,
  `tag` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`media_id`) REFERENCES `media`.`media`(`id`) ON DELETE CASCADE,
  INDEX `idx_tag` (`tag`),
  INDEX `idx_media_id` (`media_id`),
  UNIQUE KEY `uq_media_tag` (`media_id`, `tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Key Queries

**Find media by tag**
```sql
SELECT DISTINCT m.* FROM media.media m
JOIN media.media_tags mt ON m.id = mt.media_id
WHERE mt.tag = 'quarterly' AND m.deleted_at IS NULL;
```

**Find media by multiple tags**
```sql
SELECT m.* FROM media.media m
WHERE m.id IN (
  SELECT media_id FROM media.media_tags 
  WHERE tag IN ('quarterly', 'finance')
  GROUP BY media_id
  HAVING COUNT(DISTINCT tag) = 2
) AND m.deleted_at IS NULL;
```

---

### `media.media_access_log` (Optional - Audit Trail)

Track all access events for compliance and analytics.

#### SQL Definition

```sql
CREATE TABLE IF NOT EXISTS `media`.`media_access_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED,
  `action` ENUM('view', 'download', 'share') NOT NULL,
  `ip_address` VARCHAR(45),
  `user_agent` VARCHAR(500),
  `accessed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`media_id`) REFERENCES `media`.`media`(`id`) ON DELETE CASCADE,
  INDEX `idx_media_id` (`media_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_accessed_at` (`accessed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Key Queries

**Get access history for media**
```sql
SELECT * FROM media.media_access_log 
WHERE media_id = ? 
ORDER BY accessed_at DESC;
```

**Get user access history**
```sql
SELECT * FROM media.media_access_log 
WHERE user_id = ? 
ORDER BY accessed_at DESC;
```

---

### `media.media_thumbnails` (Optional - Cache)

Store pre-generated thumbnails for faster rendering.

#### SQL Definition

```sql
CREATE TABLE IF NOT EXISTS `media`.`media_thumbnails` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `media_id` INT UNSIGNED NOT NULL,
  `thumbnail_url` VARCHAR(512) NOT NULL,
  `width` INT,
  `height` INT,
  `size` INT,
  `generated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`media_id`) REFERENCES `media`.`media`(`id`) ON DELETE CASCADE,
  INDEX `idx_media_id` (`media_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Key Queries

**Get thumbnail**
```sql
SELECT * FROM media.media_thumbnails WHERE media_id = ?;
```

---

## Database Relationships

```
media (primary)
├── 1:N with media_tags (via media_id)
├── 1:N with media_access_log (via media_id)
└── 1:1 with media_thumbnails (via media_id)
```

## Performance Considerations

### Indexes

- `idx_kind`: Filter by document/image/video type
- `idx_user_id`: Get user's media library
- `idx_project_id`: Get project media
- `idx_deleted_at`: Exclude soft-deleted records
- `idx_created_at`: Sort by creation date
- `idx_name_search`: Search by name
- `idx_tags_search`: Full-text search on tags (FULLTEXT)

### Query Optimization

**Standard pagination with filters:**
```sql
SELECT * FROM media.media 
WHERE deleted_at IS NULL AND kind = 'document'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

**Without deleted_at filter in WHERE clause:**
- Index on `deleted_at` allows MySQL to skip deleted records efficiently
- Combined with other filters, use composite indexes if frequently filtered

**Full-text search:**
- `FULLTEXT INDEX idx_tags_search` enables natural language search
- Use MATCH(tags) AGAINST() syntax for relevance scoring

### Storage Estimation

Assuming 1M media records:
- Base table: ~150MB (id, timestamps, IDs)
- With tags field: ~450MB
- media_tags table (5 tags/media avg): ~100MB
- media_access_log (10 logs/media avg): ~800MB
- Total: ~1.3GB

## Sample Data

### Media Record

```json
{
  "id": 1,
  "name": "Q4 2024 Financial Report",
  "kind": "document",
  "file_url": "http://localhost:3000/uploads/media/document/1704067200000_report.pdf",
  "size": 5242880,
  "mime_type": "application/pdf",
  "user_id": 42,
  "project_id": 10,
  "tags": "quarterly,finance,2024",
  "etag": "abc123def456",
  "checksum": "chk_1704067200000",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z",
  "deleted_at": null
}
```

### Insert Example

```sql
INSERT INTO media.media 
(name, kind, file_url, size, mime_type, user_id, project_id, tags, created_at, updated_at)
VALUES 
('Q4 Report', 'document', 'http://...', 5242880, 'application/pdf', 42, 10, 'quarterly,finance', NOW(), NOW());
```

### Tag Records

```json
[
  {"media_id": 1, "tag": "quarterly"},
  {"media_id": 1, "tag": "finance"},
  {"media_id": 1, "tag": "2024"}
]
```

## Maintenance

### Cleanup Soft-Deleted Records

```sql
-- Archive deleted records (after 90 days)
INSERT INTO media.media_archive
SELECT * FROM media.media WHERE deleted_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

DELETE FROM media.media WHERE deleted_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### Analyze Table

```sql
ANALYZE TABLE media.media;
ANALYZE TABLE media.media_tags;
```

### Optimize Table

```sql
OPTIMIZE TABLE media.media;
```
