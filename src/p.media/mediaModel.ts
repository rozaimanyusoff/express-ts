import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../utils/db';

// Database and table declarations
const db = 'media';
const mediaTable = `${db}.media`;
const mediaTagsTable = `${db}.media_tags`;

// Interfaces for type safety
export interface MediaRecord extends RowDataPacket {
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

export interface MediaPresignRequest {
  filename: string;
  mimeType: string;
  kind: 'document' | 'image' | 'video';
  size?: number;
}

export interface MediaCreateRequest {
  name: string;
  kind: 'document' | 'image' | 'video';
  fileUrl: string;
  size: number;
  mimeType: string;
  tags?: string[];
  projectId?: number;
  etag?: string;
  checksum?: string;
}

/* ============ PRESIGN OPERATIONS ============ */

/**
 * Generate a pre-signed URL token and store metadata
 * Returns { uploadUrl, fileUrl, expiresIn, maxSize, presignId }
 */
export const generatePresignedUrl = async (
  userId: number,
  filename: string,
  mimeType: string,
  kind: 'document' | 'image' | 'video',
  size?: number
): Promise<{
  presignId: string;
  uploadUrl: string;
  fileUrl: string;
  expiresIn: number;
  maxSize: number;
  checksum?: string;
}> => {
  // Define size limits per kind
  const sizeLimit = {
    document: 52428800, // 50MB
    image: 10485760, // 10MB
    video: 524288000, // 500MB
  };

  const maxBytes = sizeLimit[kind];
  const expiresIn = 600; // 10 minutes

  // Generate presign ID for tracking
  const presignId = `presign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Build upload URL - in production, this would be S3/GCS presigned URL
  // For now, we use a temporary endpoint that the client will PUT to
  const uploadUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/media/upload/${presignId}`;
  const fileUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}/uploads/media/${kind}/${Date.now()}_${filename}`;

  // Optional: Generate checksum for integrity verification
  const checksum = `chk_${Date.now()}`;

  return {
    presignId,
    uploadUrl,
    fileUrl,
    expiresIn,
    maxSize: maxBytes,
    checksum,
  };
};

/**
 * Batch presigned URL generation
 */
export const generatePresignedUrlBatch = async (
  userId: number,
  files: MediaPresignRequest[]
): Promise<Array<{
  filename: string;
  presignId: string;
  uploadUrl: string;
  fileUrl: string;
  expiresIn: number;
  maxSize: number;
}>> => {
  const sizeLimit = {
    document: 52428800,
    image: 10485760,
    video: 524288000,
  };

  return files.map((file) => {
    const maxBytes = sizeLimit[file.kind];
    const expiresIn = 600;
    const presignId = `presign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const uploadUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/media/upload/${presignId}`;
    const fileUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}/uploads/media/${file.kind}/${Date.now()}_${file.filename}`;

    return {
      filename: file.filename,
      presignId,
      uploadUrl,
      fileUrl,
      expiresIn,
      maxSize: maxBytes,
    };
  });
};

/* ============ CRUD OPERATIONS ============ */

/**
 * Create a new media record after successful upload
 */
export const createMedia = async (
  userId: number,
  data: MediaCreateRequest
): Promise<number> => {
  const sql = `
    INSERT INTO ${mediaTable} 
    (name, kind, file_url, size, mime_type, user_id, project_id, tags, etag, checksum, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const params = [
    data.name,
    data.kind,
    data.fileUrl,
    data.size,
    data.mimeType,
    userId,
    data.projectId || null,
    data.tags ? data.tags.join(',') : null,
    data.etag || null,
    data.checksum || null,
  ];

  const [result] = await pool.query<ResultSetHeader>(sql, params);
  return result.insertId;
};

/**
 * Get paginated media with filters
 */
export const getMedia = async (
  kind?: 'document' | 'image' | 'video',
  search?: string,
  projectId?: number,
  page: number = 1,
  limit: number = 20,
  userId?: number
): Promise<{ items: MediaRecord[]; total: number }> => {
  const offset = (page - 1) * limit;
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: any[] = [];

  if (kind) {
    conditions.push('kind = ?');
    params.push(kind);
  }

  if (search) {
    conditions.push('(name LIKE ? OR tags LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (projectId) {
    conditions.push('project_id = ?');
    params.push(projectId);
  }

  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countSql = `SELECT COUNT(*) as count FROM ${mediaTable} ${whereClause}`;
  const [countRows] = await pool.query<any[]>(countSql, params);
  const total = countRows[0]?.count || 0;

  // Get paginated items
  const sql = `
    SELECT * FROM ${mediaTable}
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [items] = await pool.query<MediaRecord[]>(sql, [...params, limit, offset]);
  return { items, total };
};

/**
 * Get single media by ID
 */
export const getMediaById = async (id: number): Promise<MediaRecord | null> => {
  const sql = `SELECT * FROM ${mediaTable} WHERE id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query<MediaRecord[]>(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Update media metadata
 */
export const updateMedia = async (
  id: number,
  data: Partial<{
    name: string;
    kind: string;
    tags: string[];
    projectId: number;
  }>
): Promise<boolean> => {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }

  if (data.kind !== undefined) {
    updates.push('kind = ?');
    params.push(data.kind);
  }

  if (data.tags !== undefined) {
    updates.push('tags = ?');
    params.push(data.tags.join(','));
  }

  if (data.projectId !== undefined) {
    updates.push('project_id = ?');
    params.push(data.projectId);
  }

  if (updates.length === 0) return true;

  updates.push('updated_at = NOW()');
  const sql = `UPDATE ${mediaTable} SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
  params.push(id);

  const [result] = await pool.query<ResultSetHeader>(sql, params);
  return result.affectedRows > 0;
};

/**
 * Soft delete media (mark as deleted, don't actually remove)
 */
export const softDeleteMedia = async (id: number): Promise<boolean> => {
  const sql = `UPDATE ${mediaTable} SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`;
  const [result] = await pool.query<ResultSetHeader>(sql, [id]);
  return result.affectedRows > 0;
};

/**
 * Hard delete media (actually remove from database)
 * Use with caution - typically for cleanup operations
 */
export const hardDeleteMedia = async (id: number): Promise<boolean> => {
  const sql = `DELETE FROM ${mediaTable} WHERE id = ?`;
  const [result] = await pool.query<ResultSetHeader>(sql, [id]);
  return result.affectedRows > 0;
};

/* ============ SEARCH & FILTERING ============ */

/**
 * Get media by kind with search
 */
export const getMediaByKind = async (
  kind: 'document' | 'image' | 'video',
  page: number = 1,
  limit: number = 20
): Promise<{ items: MediaRecord[]; total: number }> => {
  return getMedia(kind, undefined, undefined, page, limit);
};

/**
 * Search media across all kinds
 */
export const searchMedia = async (
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{ items: MediaRecord[]; total: number }> => {
  return getMedia(undefined, query, undefined, page, limit);
};

/**
 * Get media for a specific project
 */
export const getMediaByProject = async (
  projectId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ items: MediaRecord[]; total: number }> => {
  return getMedia(undefined, undefined, projectId, page, limit);
};

/**
 * Get user's media library
 */
export const getUserMedia = async (
  userId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ items: MediaRecord[]; total: number }> => {
  return getMedia(undefined, undefined, undefined, page, limit, userId);
};

/* ============ UTILITY FUNCTIONS ============ */

/**
 * Get media statistics
 */
export const getMediaStats = async (): Promise<{
  total: number;
  byKind: Record<string, number>;
  totalSize: number;
}> => {
  const sql = `
    SELECT 
      COUNT(*) as total,
      SUM(size) as totalSize,
      kind,
      COUNT(*) as count
    FROM ${mediaTable}
    WHERE deleted_at IS NULL
    GROUP BY kind
  `;

  const [rows] = await pool.query<any[]>(sql);

  const byKind: Record<string, number> = {};
  let total = 0;
  let totalSize = 0;

  for (const row of rows) {
    byKind[row.kind] = row.count;
    total += row.count;
    totalSize += row.totalSize || 0;
  }

  return { total, byKind, totalSize };
};

/**
 * Get media by tags
 */
export const getMediaByTags = async (
  tags: string[],
  page: number = 1,
  limit: number = 20
): Promise<{ items: MediaRecord[]; total: number }> => {
  const offset = (page - 1) * limit;
  const tagConditions = tags.map(() => 'tags LIKE ?').join(' OR ');
  const tagParams = tags.map((tag) => `%${tag}%`);

  const sql = `
    SELECT * FROM ${mediaTable}
    WHERE deleted_at IS NULL AND (${tagConditions})
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [items] = await pool.query<MediaRecord[]>(sql, [...tagParams, limit, offset]);

  const countSql = `SELECT COUNT(*) as count FROM ${mediaTable} WHERE deleted_at IS NULL AND (${tagConditions})`;
  const [countRows] = await pool.query<any[]>(countSql, tagParams);
  const total = countRows[0]?.count || 0;

  return { items, total };
};
