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

/* ============ CORRESPONDENCE ============ */

const correspondenceTable = `${db}.correspondences`;

export interface CorrespondenceRecord extends RowDataPacket {
  id: number;
  reference_no: string;
  sender: string;
  sender_ref: string | null;
  document_cover_page: boolean;
  document_full_letters: boolean;
  document_claim_attachment: boolean;
  document_others: boolean;
  document_others_specify: string | null;
  subject: string;
  correspondent: string;
  direction: 'incoming' | 'outgoing';
  department: string;
  letter_type: string | null;
  category: string | null;
  priority: 'low' | 'normal' | 'high';
  date_received: string | null;
  remarks: string | null;
  registered_at: string | null;
  registered_by: string | null;
  disseminated_at: string | null;
  disseminated_by: string | null;
  attachment_filename: string | null;
  attachment_mime_type: string | null;
  attachment_size: number | null;
  attachment_pdf_page_count: number | null;
  attachment_file_path: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CorrespondenceCreatePayload {
  reference_no: string;
  sender: string;
  sender_ref: string | null;
  document_cover_page: boolean;
  document_full_letters: boolean;
  document_claim_attachment: boolean;
  document_others: boolean;
  document_others_specify: string | null;
  subject: string;
  correspondent: string;
  direction: 'incoming' | 'outgoing';
  department: string;
  letter_type: string | null;
  category: string | null;
  priority: 'low' | 'normal' | 'high';
  date_received: string | null;
  remarks: string | null;
  registered_at: string | null;
  registered_by: string | null;
  disseminated_at: string | null;
  disseminated_by: string | null;
  attachment_filename: string | null;
  attachment_mime_type: string | null;
  attachment_size: number | null;
  attachment_pdf_page_count: number | null;
  attachment_file_path: string | null;
}

export interface CorrespondenceListFilters {
  direction?: 'incoming' | 'outgoing';
  priority?: 'low' | 'normal' | 'high';
  category?: string;
  letter_type?: string;
  department?: string;
  /** searches reference_no, subject, sender, correspondent */
  search?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Insert a new correspondence record. Returns the auto-incremented id.
 */
export const createCorrespondence = async (
  payload: CorrespondenceCreatePayload
): Promise<number> => {
  const sql = `
    INSERT INTO ${correspondenceTable} (
      reference_no, sender, sender_ref,
      document_cover_page, document_full_letters, document_claim_attachment,
      document_others, document_others_specify,
      subject, correspondent, direction, department,
      letter_type, category, priority, date_received, remarks,
      registered_at, registered_by, disseminated_at, disseminated_by,
      attachment_filename, attachment_mime_type, attachment_size,
      attachment_pdf_page_count, attachment_file_path,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      NOW(), NOW()
    )
  `;

  const params = [
    payload.reference_no,
    payload.sender,
    payload.sender_ref ?? null,
    payload.document_cover_page ? 1 : 0,
    payload.document_full_letters ? 1 : 0,
    payload.document_claim_attachment ? 1 : 0,
    payload.document_others ? 1 : 0,
    payload.document_others_specify ?? null,
    payload.subject,
    payload.correspondent,
    payload.direction,
    payload.department,
    payload.letter_type ?? null,
    payload.category ?? null,
    payload.priority,
    payload.date_received ?? null,
    payload.remarks ?? null,
    payload.registered_at ?? null,
    payload.registered_by ?? null,
    payload.disseminated_at ?? null,
    payload.disseminated_by ?? null,
    payload.attachment_filename ?? null,
    payload.attachment_mime_type ?? null,
    payload.attachment_size ?? null,
    payload.attachment_pdf_page_count ?? null,
    payload.attachment_file_path ?? null,
  ];

  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result.insertId;
};

/**
 * Retrieve correspondences with optional filtering, search and pagination.
 */
export const getCorrespondences = async (
  filters: CorrespondenceListFilters = {}
): Promise<{ rows: CorrespondenceRecord[]; total: number }> => {
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: (string | number)[] = [];

  if (filters.direction) { conditions.push('direction = ?'); params.push(filters.direction); }
  if (filters.priority) { conditions.push('priority = ?'); params.push(filters.priority); }
  if (filters.category) { conditions.push('category = ?'); params.push(filters.category); }
  if (filters.letter_type) { conditions.push('letter_type = ?'); params.push(filters.letter_type); }
  if (filters.department) {
    conditions.push('FIND_IN_SET(?, REPLACE(department, ";", ",")) > 0');
    params.push(filters.department);
  }
  if (filters.search) {
    conditions.push(
      '(reference_no LIKE ? OR subject LIKE ? OR sender LIKE ? OR correspondent LIKE ?)'
    );
    const like = `%${filters.search}%`;
    params.push(like, like, like, like);
  }
  if (filters.date_from) { conditions.push('date_received >= ?'); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push('date_received <= ?'); params.push(filters.date_to); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${correspondenceTable} ${where}`,
    params
  );
  const total = (countRows[0] as any).total as number;

  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const [rows] = await pool.execute<CorrespondenceRecord[]>(
    `SELECT * FROM ${correspondenceTable} ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { rows, total };
};

/**
 * Retrieve a single correspondence by id (excludes soft-deleted).
 */
export const getCorrespondenceById = async (
  id: number
): Promise<CorrespondenceRecord | null> => {
  const [rows] = await pool.execute<CorrespondenceRecord[]>(
    `SELECT * FROM ${correspondenceTable} WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
};

/**
 * Partially update a correspondence record. Only provided fields are changed.
 */
export const updateCorrespondence = async (
  id: number,
  payload: Partial<CorrespondenceCreatePayload>
): Promise<boolean> => {
  const fieldMap: Record<string, unknown> = {
    reference_no: payload.reference_no,
    sender: payload.sender,
    sender_ref: payload.sender_ref,
    document_cover_page: payload.document_cover_page !== undefined ? (payload.document_cover_page ? 1 : 0) : undefined,
    document_full_letters: payload.document_full_letters !== undefined ? (payload.document_full_letters ? 1 : 0) : undefined,
    document_claim_attachment: payload.document_claim_attachment !== undefined ? (payload.document_claim_attachment ? 1 : 0) : undefined,
    document_others: payload.document_others !== undefined ? (payload.document_others ? 1 : 0) : undefined,
    document_others_specify: payload.document_others_specify,
    subject: payload.subject,
    correspondent: payload.correspondent,
    direction: payload.direction,
    department: payload.department,
    letter_type: payload.letter_type,
    category: payload.category,
    priority: payload.priority,
    date_received: payload.date_received,
    remarks: payload.remarks,
    registered_at: payload.registered_at,
    registered_by: payload.registered_by,
    disseminated_at: payload.disseminated_at,
    disseminated_by: payload.disseminated_by,
    attachment_filename: payload.attachment_filename,
    attachment_mime_type: payload.attachment_mime_type,
    attachment_size: payload.attachment_size,
    attachment_pdf_page_count: payload.attachment_pdf_page_count,
    attachment_file_path: payload.attachment_file_path,
  };

  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [col, val] of Object.entries(fieldMap)) {
    if (val !== undefined) { setClauses.push(`${col} = ?`); params.push(val); }
  }

  if (setClauses.length === 0) return false;

  setClauses.push('updated_at = NOW()');
  params.push(id);

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE ${correspondenceTable} SET ${setClauses.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
    params
  );
  return result.affectedRows > 0;
};

/**
 * Update attachment fields after a file has been uploaded.
 */
export const updateCorrespondenceAttachment = async (
  id: number,
  attachment: {
    attachment_filename: string;
    attachment_mime_type: string;
    attachment_size: number;
    attachment_pdf_page_count: number | null;
    attachment_file_path: string;
  }
): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE ${correspondenceTable}
     SET attachment_filename = ?, attachment_mime_type = ?, attachment_size = ?,
         attachment_pdf_page_count = ?, attachment_file_path = ?, updated_at = NOW()
     WHERE id = ? AND deleted_at IS NULL`,
    [
      attachment.attachment_filename,
      attachment.attachment_mime_type,
      attachment.attachment_size,
      attachment.attachment_pdf_page_count ?? null,
      attachment.attachment_file_path,
      id,
    ]
  );
  return result.affectedRows > 0;
};

/**
 * Soft-delete a correspondence by setting deleted_at.
 */
export const deleteCorrespondence = async (id: number): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE ${correspondenceTable} SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return result.affectedRows > 0;
};

/**
 * CREATE TABLE DDL for the correspondences table.
 * Run once during DB initialisation / migration.
 */
export const correspondenceTableDDL = `
CREATE TABLE IF NOT EXISTS ${correspondenceTable} (
  id                        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_no              VARCHAR(100)  NOT NULL,
  sender                    VARCHAR(255)  NOT NULL,
  sender_ref                VARCHAR(255)  NULL,
  document_cover_page       TINYINT(1)    NOT NULL DEFAULT 0,
  document_full_letters     TINYINT(1)    NOT NULL DEFAULT 0,
  document_claim_attachment TINYINT(1)    NOT NULL DEFAULT 0,
  document_others           TINYINT(1)    NOT NULL DEFAULT 0,
  document_others_specify   TEXT          NULL,
  subject                   TEXT          NOT NULL,
  correspondent             TEXT          NOT NULL,
  direction                 ENUM('incoming','outgoing') NOT NULL,
  department                TEXT          NOT NULL,
  letter_type               VARCHAR(100)  NULL,
  category                  VARCHAR(100)  NULL,
  priority                  ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
  date_received             DATE          NULL,
  remarks                   TEXT          NULL,
  registered_at             DATETIME      NULL,
  registered_by             VARCHAR(255)  NULL,
  disseminated_at           DATETIME      NULL,
  disseminated_by           VARCHAR(255)  NULL,
  attachment_filename       VARCHAR(255)  NULL,
  attachment_mime_type      VARCHAR(100)  NULL,
  attachment_size           BIGINT        NULL,
  attachment_pdf_page_count INT           NULL,
  attachment_file_path      TEXT          NULL,
  created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at                DATETIME      NULL,
  INDEX idx_direction       (direction),
  INDEX idx_priority        (priority),
  INDEX idx_date_received   (date_received),
  INDEX idx_reference_no    (reference_no),
  INDEX idx_deleted_at      (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
