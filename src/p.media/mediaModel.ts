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
  const uploadUrl = `${process.env.API_BASE_URL || 'http://localhost:3030'}/api/media/upload/${presignId}`;
  const fileUrl = `${process.env.API_BASE_URL || 'http://localhost:3030'}/uploads/media/${kind}/${Date.now()}_${filename}`;

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
    const uploadUrl = `${process.env.API_BASE_URL || 'http://localhost:3030'}/api/media/upload/${presignId}`;
    const fileUrl = `${process.env.API_BASE_URL || 'http://localhost:3030'}/uploads/media/${file.kind}/${Date.now()}_${file.filename}`;

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
const correspondenceRecipientsTable = `${db}.correspondence_recipients`;
const correspondenceRecipientForwardsTable = `${db}.correspondence_recipient_forwards`;

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
  direction: 'incoming' | 'outgoing';
  letter_type: string | null;
  category: string | null;
  priority: 'low' | 'normal' | 'high';
  date_received: string | null;
  letter_date: string | null;
  registered_at: string | null;
  registered_by: string | null;
  /** QA Team fields */
  qa_review_date: string | null;
  qa_reviewed_by: string | null;
  qa_status: string | null;
  qa_remarks: string | null;
  /** General Manager endorsement fields */
  endorsed_by: string | null;
  endorsed_at: string | null;
  endorsed_remarks: string | null;
  endorsed_status: string | null;
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
  reference_no?: string | null;
  sender: string;
  sender_ref: string | null;
  document_cover_page: boolean;
  document_full_letters: boolean;
  document_claim_attachment: boolean;
  document_others: boolean;
  document_others_specify: string | null;
  subject: string;
  direction: 'incoming' | 'outgoing';
  date_received: string | null;
  letter_date: string | null;
  registered_at: string | null;
  registered_by: string | null;
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
  /** searches reference_no, subject, sender */
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

/**
 * Get the next sequence number for a correspondence direction in the current year.
 * Counts ALL records (including soft-deleted) for that direction + year to avoid reusing numbers.
 */
export const getNextCorrespondenceSequence = async (
  direction: 'incoming' | 'outgoing'
): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM ${correspondenceTable}
     WHERE direction = ? AND YEAR(created_at) = YEAR(NOW())`,
    [direction]
  );
  return (rows[0].cnt as number) + 1;
};

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
      subject, direction,
      date_received, letter_date,
      registered_at, registered_by,
      attachment_filename, attachment_mime_type, attachment_size,
      attachment_pdf_page_count, attachment_file_path,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
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
    payload.direction,
    payload.date_received ?? null,
    payload.letter_date ?? null,
    payload.registered_at ?? null,
    payload.registered_by ?? null,
    payload.attachment_filename ?? null,
    payload.attachment_mime_type ?? null,
    payload.attachment_size ?? null,
    payload.attachment_pdf_page_count ?? null,
    payload.attachment_file_path ?? null,
  ];

  const [result] = await pool.query<ResultSetHeader>(sql, params);
  return result.insertId;
};

/**
 * Retrieve correspondences with optional filtering, search and page-based pagination.
 * Returns summary rows: specific columns + recipients_count + workflow_status.
 */
export const getCorrespondences = async (
  filters: CorrespondenceListFilters = {}
): Promise<{ rows: any[]; total: number }> => {
  const conditions: string[] = ['c.deleted_at IS NULL'];
  const params: (string | number)[] = [];

  if (filters.direction) { conditions.push('c.direction = ?'); params.push(filters.direction); }
  if (filters.priority) { conditions.push('c.priority = ?'); params.push(filters.priority); }
  if (filters.category) { conditions.push('c.category = ?'); params.push(filters.category); }
  if (filters.letter_type) { conditions.push('c.letter_type = ?'); params.push(filters.letter_type); }
  if (filters.search) {
    conditions.push('(c.reference_no LIKE ? OR c.subject LIKE ? OR c.sender LIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }
  if (filters.date_from) { conditions.push('c.date_received >= ?'); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push('c.date_received <= ?'); params.push(filters.date_to); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${correspondenceTable} c ${where}`,
    params
  );
  const total = (countRows[0] as any).total as number;

  const limit = filters.limit ?? 20;
  const page = Math.max(filters.page ?? 1, 1);
  const offset = (page - 1) * limit;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       c.id, c.reference_no, c.date_received, c.sender, c.subject, c.direction,
       c.registered_at, c.registered_by,
       c.qa_status, c.qa_reviewed_by,
       c.letter_type, c.category, c.priority,
       c.endorsed_status,
       c.created_at, c.updated_at,
       (SELECT COUNT(*) FROM ${correspondenceRecipientsTable} r WHERE r.correspondence_id = c.id) AS recipients_count
     FROM ${correspondenceTable} c
     ${where}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  if ((rows as any[]).length === 0) return { rows: [], total };

  // Batch-fetch recipient action stats
  const ids = (rows as any[]).map((r) => r.id);
  const idPh = ids.map(() => '?').join(',');

  const [recStats] = await pool.query<RowDataPacket[]>(
    `SELECT
       correspondence_id,
       SUM(action_status IS NULL) AS pending,
       SUM(action_status IS NOT NULL) AS completed
     FROM ${correspondenceRecipientsTable}
     WHERE correspondence_id IN (${idPh})
     GROUP BY correspondence_id`,
    ids
  );

  // Batch-fetch forward action stats (via recipient → forward join)
  const [fwdStats] = await pool.query<RowDataPacket[]>(
    `SELECT
       r.correspondence_id,
       SUM(f.action_status IS NULL) AS pending,
       SUM(f.action_status IS NOT NULL) AS completed
     FROM ${correspondenceRecipientForwardsTable} f
     JOIN ${correspondenceRecipientsTable} r ON f.recipient_id = r.id
     WHERE r.correspondence_id IN (${idPh})
     GROUP BY r.correspondence_id`,
    ids
  );

  const recMap = new Map<number, { pending: number; completed: number }>();
  for (const s of recStats as any[]) {
    recMap.set(Number(s.correspondence_id), { pending: Number(s.pending), completed: Number(s.completed) });
  }
  const fwdMap = new Map<number, { pending: number; completed: number }>();
  for (const s of fwdStats as any[]) {
    fwdMap.set(Number(s.correspondence_id), { pending: Number(s.pending), completed: Number(s.completed) });
  }

  const enriched = (rows as any[]).map((row) => {
    const rec = recMap.get(row.id) ?? { pending: 0, completed: 0 };
    const fwd = fwdMap.get(row.id) ?? { pending: 0, completed: 0 };
    const qa_completed = row.qa_status != null && row.qa_status !== '';
    const endorsed = row.endorsed_status != null && row.endorsed_status !== '';

    let overall_status: string;
    if (!qa_completed) {
      overall_status = 'pending_qa';
    } else if (rec.pending > 0 || fwd.pending > 0) {
      overall_status = 'in_progress';
    } else if (endorsed) {
      overall_status = 'endorsed';
    } else {
      overall_status = 'completed';
    }

    const { endorsed_status, ...rest } = row as any;
    return {
      ...rest,
      recipients_count: Number(row.recipients_count),
      workflow_status: {
        qa_completed,
        department_head_action_pending: rec.pending,
        department_head_action_completed: rec.completed,
        section_head_action_pending: fwd.pending,
        section_head_action_completed: fwd.completed,
        endorsed,
        overall_status,
      },
    };
  });

  return { rows: enriched, total };
};

/**
 * Retrieve a single correspondence by id (excludes soft-deleted).
 * Returns a fully composed object including recipients and their forwarded_to entries.
 */
export const getCorrespondenceById = async (
  id: number
): Promise<(CorrespondenceRecord & { recipients: any[] }) | null> => {
  const [rows] = await pool.query<CorrespondenceRecord[]>(
    `SELECT * FROM ${correspondenceTable} WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  );
  const record = rows[0] ?? null;
  if (!record) return null;

  // Fetch recipients with action fields
  const [recipientRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, recipient_ramco_id AS ramco_id, department_id,
            action_date, action_status, action_remarks
     FROM ${correspondenceRecipientsTable}
     WHERE correspondence_id = ? ORDER BY id`,
    [id]
  );

  // For each recipient, fetch their forwards
  const recipients = await Promise.all(
    (recipientRows as any[]).map(async (r) => {
      const [fwdRows] = await pool.query<RowDataPacket[]>(
        `SELECT ramco_id, department_id, action_date, action_status, action_remarks
         FROM ${correspondenceRecipientForwardsTable}
         WHERE recipient_id = ? ORDER BY id`,
        [r.id]
      );
      const forwarded_to = (fwdRows as any[]).map((f) => ({
        ramco_id: f.ramco_id,
        department_id: f.department_id,
        action: {
          date: f.action_date,
          status: f.action_status,
          remarks: f.action_remarks,
        },
      }));
      const hasForwards = forwarded_to.length > 0;
      return {
        ramco_id: r.ramco_id,
        department_id: r.department_id,
        action: {
          date: r.action_date,
          status: r.action_status,
          remarks: r.action_remarks,
          ...(hasForwards ? { forwarded_to } : {}),
        },
      };
    })
  );

  return { ...record, recipients };
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
    direction: payload.direction,
    date_received: payload.date_received,
    letter_date: payload.letter_date,
    registered_at: payload.registered_at,
    registered_by: payload.registered_by,
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

  const [result] = await pool.query<ResultSetHeader>(
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
  const [result] = await pool.query<ResultSetHeader>(
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
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE ${correspondenceTable} SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return result.affectedRows > 0;
};

/**
 * CREATE TABLE DDL for the correspondences table (with QA + endorsement columns).
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
  direction                 ENUM('incoming','outgoing') NOT NULL,
  letter_type               VARCHAR(100)  NULL,
  category                  VARCHAR(100)  NULL,
  priority                  ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
  date_received             DATE          NULL,
  letter_date               DATE          NULL,
  registered_at             DATETIME      NULL,
  registered_by             VARCHAR(50)   NULL,
  qa_review_date            DATETIME      NULL,
  qa_reviewed_by            VARCHAR(50)   NULL,
  qa_status                 VARCHAR(50)   NULL,
  qa_remarks                TEXT          NULL,
  endorsed_by               VARCHAR(50)   NULL,
  endorsed_at               DATETIME      NULL,
  endorsed_remarks          TEXT          NULL,
  endorsed_status           VARCHAR(50)   NULL,
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

// ---------------------------------------------------------------------------
// Correspondence Recipients
// ---------------------------------------------------------------------------

export interface CorrespondenceRecipient extends RowDataPacket {
  id: number;
  correspondence_id: number;
  recipient_ramco_id: string;
  department_id: number;
  action_date: string | null;
  action_status: string | null;
  action_remarks: string | null;
  created_at: Date;
}

export interface CorrespondenceRecipientForward extends RowDataPacket {
  id: number;
  recipient_id: number;
  ramco_id: string;
  department_id: number;
  action_date: string | null;
  action_status: string | null;
  action_remarks: string | null;
  created_at: Date;
}

/**
 * Update QA classification + review fields on a correspondence.
 * Returns true if the record was found and updated.
 */
export const updateCorrespondenceQA = async (
  id: number,
  payload: {
    category: string;
    letter_type: string;
    priority?: 'high' | 'low' | 'normal';
    qa_review_date?: null | string;
    qa_reviewed_by?: null | string;
    qa_remarks?: null | string;
    qa_status?: null | string;
  }
): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE ${correspondenceTable}
     SET letter_type = ?, category = ?, priority = ?,
         qa_review_date = ?, qa_reviewed_by = ?, qa_status = ?, qa_remarks = ?,
         updated_at = NOW()
     WHERE id = ? AND deleted_at IS NULL`,
    [
      payload.letter_type,
      payload.category,
      payload.priority ?? 'normal',
      payload.qa_review_date ?? null,
      payload.qa_reviewed_by ?? null,
      payload.qa_status ?? null,
      payload.qa_remarks ?? null,
      id,
    ]
  );
  return result.affectedRows > 0;
};

/**
 * Update General Manager endorsement fields on a correspondence.
 */
export const updateCorrespondenceEndorsement = async (
  id: number,
  payload: {
    endorsed_by: string;
    endorsed_at?: null | string;
    endorsed_remarks?: null | string;
    endorsed_status: string;
  }
): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE ${correspondenceTable}
     SET endorsed_by = ?, endorsed_at = ?, endorsed_remarks = ?, endorsed_status = ?, updated_at = NOW()
     WHERE id = ? AND deleted_at IS NULL`,
    [
      payload.endorsed_by,
      payload.endorsed_at ?? null,
      payload.endorsed_remarks ?? null,
      payload.endorsed_status,
      id,
    ]
  );
  return result.affectedRows > 0;
};

/**
 * Replace the full recipients list for a correspondence (delete-then-insert).
 * Also deletes any existing forwards for the replaced recipients.
 */
export const replaceCorrespondenceRecipients = async (
  correspondenceId: number,
  recipients: Array<{ department_id: number; recipient_ramco_id: string }>
): Promise<void> => {
  // Delete forwards for existing recipients first
  const [existingRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM ${correspondenceRecipientsTable} WHERE correspondence_id = ?`,
    [correspondenceId]
  );
  const existingIds = (existingRows as any[]).map((r) => r.id);
  if (existingIds.length > 0) {
    const ph = existingIds.map(() => '?').join(',');
    await pool.query(`DELETE FROM ${correspondenceRecipientForwardsTable} WHERE recipient_id IN (${ph})`, existingIds);
  }
  await pool.query(
    `DELETE FROM ${correspondenceRecipientsTable} WHERE correspondence_id = ?`,
    [correspondenceId]
  );
  if (recipients.length === 0) return;
  const placeholders = recipients.map(() => '(?, ?, ?)').join(', ');
  const values = recipients.flatMap((r) => [correspondenceId, r.recipient_ramco_id, r.department_id]);
  await pool.query(
    `INSERT INTO ${correspondenceRecipientsTable} (correspondence_id, recipient_ramco_id, department_id) VALUES ${placeholders}`,
    values
  );
};

/**
 * Fetch all recipients for a correspondence.
 */
export const getCorrespondenceRecipients = async (
  correspondenceId: number
): Promise<CorrespondenceRecipient[]> => {
  const [rows] = await pool.query<CorrespondenceRecipient[]>(
    `SELECT * FROM ${correspondenceRecipientsTable} WHERE correspondence_id = ? ORDER BY id`,
    [correspondenceId]
  );
  return rows;
};

/**
 * Update the action fields (date, status, remarks) for a specific recipient row.
 */
export const updateRecipientAction = async (
  recipientId: number,
  payload: {
    action_date?: null | string;
    action_remarks?: null | string;
    action_status: string;
  }
): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE ${correspondenceRecipientsTable}
     SET action_date = ?, action_status = ?, action_remarks = ?
     WHERE id = ?`,
    [payload.action_date ?? null, payload.action_status, payload.action_remarks ?? null, recipientId]
  );
  return result.affectedRows > 0;
};

/**
 * Get forwards for a specific recipient.
 */
export const getRecipientForwards = async (
  recipientId: number
): Promise<CorrespondenceRecipientForward[]> => {
  const [rows] = await pool.query<CorrespondenceRecipientForward[]>(
    `SELECT * FROM ${correspondenceRecipientForwardsTable} WHERE recipient_id = ? ORDER BY id`,
    [recipientId]
  );
  return rows;
};

/**
 * Replace all forwards for a recipient (delete-then-insert).
 */
export const replaceRecipientForwards = async (
  recipientId: number,
  forwards: Array<{ ramco_id: string; department_id: number; action_date?: null | string; action_status?: null | string; action_remarks?: null | string }>
): Promise<void> => {
  await pool.query(
    `DELETE FROM ${correspondenceRecipientForwardsTable} WHERE recipient_id = ?`,
    [recipientId]
  );
  if (forwards.length === 0) return;
  const placeholders = forwards.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const values = forwards.flatMap((f) => [
    recipientId,
    f.ramco_id,
    f.department_id,
    f.action_date ?? null,
    f.action_status ?? null,
    f.action_remarks ?? null,
  ]);
  await pool.query(
    `INSERT INTO ${correspondenceRecipientForwardsTable} (recipient_id, ramco_id, department_id, action_date, action_status, action_remarks) VALUES ${placeholders}`,
    values
  );
};

export const correspondenceRecipientsTableDDL = `
CREATE TABLE IF NOT EXISTS ${correspondenceRecipientsTable} (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  correspondence_id    INT UNSIGNED NOT NULL,
  recipient_ramco_id   VARCHAR(50)  NOT NULL,
  department_id        INT          NOT NULL,
  action_date          DATETIME     NULL,
  action_status        VARCHAR(50)  NULL,
  action_remarks       TEXT         NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_correspondence_id (correspondence_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export const correspondenceRecipientForwardsTableDDL = `
CREATE TABLE IF NOT EXISTS ${correspondenceRecipientForwardsTable} (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recipient_id    INT UNSIGNED  NOT NULL,
  ramco_id        VARCHAR(50)   NOT NULL,
  department_id   INT           NOT NULL,
  action_date     DATETIME      NULL,
  action_status   VARCHAR(50)   NULL,
  action_remarks  TEXT          NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recipient_id (recipient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
