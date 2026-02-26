import { Request, Response } from 'express';
import path from 'path';
import * as mediaModel from './mediaModel';

// Get base URL from environment, default to localhost
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

/**
 * Helper function to ensure file_url is a full URL with BACKEND_URL
 */
function normalizeMediaUrl(media: any) {
  if (media.file_url && !media.file_url.startsWith('http')) {
    return {
      ...media,
      file_url: `${BACKEND_URL}${media.file_url}`,
    };
  }
  return media;
}

/**
 * Helper function to normalize an array of media items
 */
function normalizeMediaUrls(items: any[]) {
  return items.map(normalizeMediaUrl);
}

/* ============ FILE UPLOAD ENDPOINTS ============ */

/**
 * POST /api/media/upload/document
 * Upload document with automatic processing
 * Body: multipart form-data with 'file' field
 */
export const uploadDocument = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded',
      data: null,
    });
  }

  if (!userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized - User ID not found in token',
      data: null,
    });
  }

  try {
    const mediaId = await mediaModel.createMedia(userId, {
      name: file.originalname,
      kind: 'document',
      fileUrl: `${BACKEND_URL}/uploads/media/documents/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
    });

    const media = await mediaModel.getMediaById(mediaId);

    return res.status(201).json({
      status: 'success',
      message: 'Document uploaded successfully',
      data: normalizeMediaUrl(media),
    });
  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error occurred';
    console.error('Document upload error:', errorMessage);
    console.error('Error details:', error);
    return res.status(500).json({
      status: 'error',
      message: `Upload failed: ${errorMessage}`,
      data: null,
    });
  }
};

/**
 * POST /api/media/upload/image
 * Upload image with automatic processing
 * Body: multipart form-data with 'file' field
 */
export const uploadImage = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded',
      data: null,
    });
  }

  if (!userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized - User ID not found in token',
      data: null,
    });
  }

  try {
    const mediaId = await mediaModel.createMedia(userId, {
      name: file.originalname,
      kind: 'image',
      fileUrl: `${BACKEND_URL}/uploads/media/images/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
    });

    const media = await mediaModel.getMediaById(mediaId);

    return res.status(201).json({
      status: 'success',
      message: 'Image uploaded successfully',
      data: normalizeMediaUrl(media),
    });
  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error occurred';
    console.error('Image upload error:', errorMessage);
    console.error('Error details:', error);
    return res.status(500).json({
      status: 'error',
      message: `Upload failed: ${errorMessage}`,
      data: null,
    });
  }
};

/**
 * POST /api/media/upload/video
 * Upload video with automatic processing
 * Body: multipart form-data with 'file' field
 */
export const uploadVideo = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded',
      data: null,
    });
  }

  if (!userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized - User ID not found in token',
      data: null,
    });
  }

  try {
    const mediaId = await mediaModel.createMedia(userId, {
      name: file.originalname,
      kind: 'video',
      fileUrl: `${BACKEND_URL}/uploads/media/videos/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
    });

    const media = await mediaModel.getMediaById(mediaId);

    return res.status(201).json({
      status: 'success',
      message: 'Video uploaded successfully',
      data: normalizeMediaUrl(media),
    });
  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error occurred';
    console.error('Video upload error:', errorMessage);
    console.error('Error details:', error);
    return res.status(500).json({
      status: 'error',
      message: `Upload failed: ${errorMessage}`,
      data: null,
    });
  }
};

/* ============ MEDIA CRUD ============ */


/* ============ CREATE MEDIA ============ */

/**
 * POST /api/media
 * Create a media record after successful upload
 * Body: { name, kind, fileUrl, size, mimeType, tags?, projectId? }
 */
export const createMedia = async (req: Request, res: Response) => {
  const { name, kind, fileUrl, size, mimeType, tags, projectId } = req.body;
  const userId = (req as any).user?.id;

  // Validation
  if (!name || !kind || !fileUrl || !size || !mimeType) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: name, kind, fileUrl, size, mimeType',
      data: null,
    });
  }

  if (!['document', 'image', 'video'].includes(kind)) {
    return res.status(415).json({
      status: 'error',
      message: 'Invalid kind. Must be one of: document, image, video',
      data: null,
    });
  }

  try {
    const mediaId = await mediaModel.createMedia(userId, {
      name,
      kind,
      fileUrl,
      size,
      mimeType,
      tags: Array.isArray(tags) ? tags : undefined,
      projectId,
    });

    const media = await mediaModel.getMediaById(mediaId);

    return res.status(201).json({
      status: 'success',
      message: 'Media created successfully',
      data: normalizeMediaUrl(media),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

/* ============ GET MEDIA ============ */

/**
 * GET /api/media
 * List media with filters
 * Query: ?kind=document|image|video&search=...&projectId=...&page=1&limit=20
 */
export const listMedia = async (req: Request, res: Response) => {
  const kind = req.query.kind as 'document' | 'image' | 'video' | undefined;
  const search = req.query.search as string | undefined;
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

  if (kind && !['document', 'image', 'video'].includes(kind)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid kind parameter',
      data: null,
    });
  }

  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid pagination parameters',
      data: null,
    });
  }

  try {
    const result = await mediaModel.getMedia(kind, search, projectId, page, limit);

    return res.json({
      status: 'success',
      message: 'Media retrieved successfully',
      data: {
        items: normalizeMediaUrls(result.items),
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

/**
 * GET /api/media/:id
 * Get a specific media by ID
 */
export const getMedia = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mediaId = parseInt(String(id));

  if (isNaN(mediaId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid media ID',
      data: null,
    });
  }

  try {
    const media = await mediaModel.getMediaById(mediaId);

    if (!media) {
      return res.status(404).json({
        status: 'error',
        message: 'Media not found',
        data: null,
      });
    }

    return res.json({
      status: 'success',
      message: 'Media retrieved',
      data: normalizeMediaUrl(media),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

/* ============ UPDATE MEDIA ============ */

/**
 * PUT /api/media/:id
 * Update media metadata
 * Body: { name?, kind?, tags?, projectId? }
 */
export const updateMedia = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, kind, tags, projectId } = req.body;
  const mediaId = parseInt(String(id));

  if (isNaN(mediaId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid media ID',
      data: null,
    });
  }

  try {
    // Check if media exists
    const media = await mediaModel.getMediaById(mediaId);
    if (!media) {
      return res.status(404).json({
        status: 'error',
        message: 'Media not found',
        data: null,
      });
    }

    // Validate kind if provided
    if (kind && !['document', 'image', 'video'].includes(kind)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid kind. Must be one of: document, image, video',
        data: null,
      });
    }

    // Update the media
    await mediaModel.updateMedia(mediaId, {
      name,
      kind,
      tags,
      projectId,
    });

    const updatedMedia = await mediaModel.getMediaById(mediaId);

    return res.json({
      status: 'success',
      message: 'Media updated successfully',
      data: normalizeMediaUrl(updatedMedia),
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

/* ============ DELETE MEDIA ============ */

/**
 * DELETE /api/media/:id
 * Soft delete a media (mark as deleted)
 */
export const deleteMedia = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mediaId = parseInt(String(id));

  if (isNaN(mediaId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid media ID',
      data: null,
    });
  }

  try {
    const media = await mediaModel.getMediaById(mediaId);
    if (!media) {
      return res.status(404).json({
        status: 'error',
        message: 'Media not found',
        data: null,
      });
    }

    const deleted = await mediaModel.softDeleteMedia(mediaId);

    if (!deleted) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to delete media',
        data: null,
      });
    }

    return res.json({
      status: 'success',
      message: 'Media deleted successfully',
      data: { id: mediaId, deletedAt: new Date().toISOString() },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

/* ============ UTILITY ENDPOINTS ============ */

/**
 * GET /api/media/stats
 * Get media statistics
 */
export const getMediaStats = async (req: Request, res: Response) => {
  try {
    const stats = await mediaModel.getMediaStats();

    return res.json({
      status: 'success',
      message: 'Statistics retrieved',
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

/**
 * POST /api/media/:id/thumbnail
 * Generate or retrieve thumbnail for media (mainly for images/videos)
 * Optional: can be triggered immediately or asynchronously
 */
export const generateThumbnail = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mediaId = parseInt(String(id));

  if (isNaN(mediaId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid media ID',
      data: null,
    });
  }

  try {
    const media = await mediaModel.getMediaById(mediaId);
    if (!media) {
      return res.status(404).json({
        status: 'error',
        message: 'Media not found',
        data: null,
      });
    }

    // For now, return a placeholder response
    // In production, you would:
    // 1. Use ffmpeg for video keyframes
    // 2. Use ImageMagick for PDF previews
    // 3. Store thumbnail in a separate location
    // 4. Return thumbnail URL

    return res.json({
      status: 'success',
      message: 'Thumbnail generation queued',
      data: {
        mediaId,
        status: 'processing',
        message: 'Thumbnail generation is processing asynchronously',
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

/**
 * GET /api/media/:id/stream
 * Stream media with range request support
 * Useful for large video/audio files
 */
export const streamMedia = async (req: Request, res: Response) => {
  const { id } = req.params;
  const mediaId = parseInt(String(id));

  if (isNaN(mediaId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid media ID',
      data: null,
    });
  }

  try {
    const media = await mediaModel.getMediaById(mediaId);
    if (!media) {
      return res.status(404).json({
        status: 'error',
        message: 'Media not found',
        data: null,
      });
    }

    // Return pre-signed URL for streaming
    // In production, implement actual streaming with range requests
    return res.json({
      status: 'success',
      message: 'Stream URL generated',
      data: {
        mediaId,
        streamUrl: media.file_url,
        mimeType: media.mime_type,
        size: media.size,
        supportsRangeRequests: true,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

/* ============ CORRESPONDENCE ============ */

function normaliseAttachmentPath(record: any) {
  if (record?.attachment_file_path && !record.attachment_file_path.startsWith('http')) {
    return { ...record, attachment_file_path: `${BACKEND_URL}${record.attachment_file_path}` };
  }
  return record;
}

/**
 * POST /api/media/correspondence
 * Create a new correspondence record.
 * Accepts multipart/form-data — include an optional "file" field to attach a document.
 */
export const createCorrespondence = async (req: Request, res: Response) => {
  const body = req.body as Record<string, string>;
  const file = req.file as Express.Multer.File | undefined;

  const requiredFields = [
    'reference_no', 'sender', 'subject', 'correspondent', 'direction', 'department', 'priority',
  ] as const;

  for (const field of requiredFields) {
    if (!body[field]) {
      return res.status(400).json({ status: 'error', message: `Missing required field: ${field}`, data: null });
    }
  }

  const direction = body.direction as 'incoming' | 'outgoing';
  if (!['incoming', 'outgoing'].includes(direction)) {
    return res.status(400).json({ status: 'error', message: 'direction must be "incoming" or "outgoing"', data: null });
  }

  const priority = (body.priority ?? 'normal') as 'low' | 'normal' | 'high';
  if (!['low', 'normal', 'high'].includes(priority)) {
    return res.status(400).json({ status: 'error', message: 'priority must be "low", "normal", or "high"', data: null });
  }

  let attachmentFilename: string | null = null;
  let attachmentMimeType: string | null = null;
  let attachmentSize: number | null = null;
  let attachmentFilePath: string | null = null;

  if (file) {
    attachmentFilename = file.originalname;
    attachmentMimeType = file.mimetype;
    attachmentSize = file.size;
    attachmentFilePath = `/uploads/media/correspondence/${file.filename}`;
  }

  const payload: mediaModel.CorrespondenceCreatePayload = {
    reference_no: body.reference_no,
    sender: body.sender,
    sender_ref: body.sender_ref ?? null,
    document_cover_page: body.document_cover_page === 'true' || body.document_cover_page === '1',
    document_full_letters: body.document_full_letters === 'true' || body.document_full_letters === '1',
    document_claim_attachment: body.document_claim_attachment === 'true' || body.document_claim_attachment === '1',
    document_others: body.document_others === 'true' || body.document_others === '1',
    document_others_specify: body.document_others_specify ?? null,
    subject: body.subject,
    correspondent: body.correspondent,
    direction,
    department: body.department,
    letter_type: body.letter_type ?? null,
    category: body.category ?? null,
    priority,
    date_received: body.date_received ?? null,
    remarks: body.remarks ?? null,
    registered_at: body.registered_at ?? null,
    registered_by: body.registered_by ?? null,
    disseminated_at: body.disseminated_at ?? null,
    disseminated_by: body.disseminated_by ?? null,
    attachment_filename: body.attachment_filename ?? attachmentFilename,
    attachment_mime_type: body.attachment_mime_type ?? attachmentMimeType,
    attachment_size: body.attachment_size ? Number(body.attachment_size) : attachmentSize,
    attachment_pdf_page_count: body.attachment_pdf_page_count ? Number(body.attachment_pdf_page_count) : null,
    attachment_file_path: body.attachment_file_path ?? attachmentFilePath,
  };

  const id = await mediaModel.createCorrespondence(payload);

  return res.status(201).json({
    status: 'success',
    message: 'Correspondence created successfully',
    data: { id },
  });
};

/**
 * GET /api/media/correspondence
 * List correspondences with optional filters.
 * Query: direction, priority, category, letter_type, department,
 *        search, date_from, date_to, limit (max 200), offset
 */
export const listCorrespondences = async (req: Request, res: Response) => {
  const query = req.query as Record<string, string>;

  const filters: mediaModel.CorrespondenceListFilters = {
    direction: query.direction as 'incoming' | 'outgoing' | undefined,
    priority: query.priority as 'low' | 'normal' | 'high' | undefined,
    category: query.category,
    letter_type: query.letter_type,
    department: query.department,
    search: query.search,
    date_from: query.date_from,
    date_to: query.date_to,
    limit: query.limit ? Math.min(Number(query.limit), 200) : 20,
    offset: query.offset ? Number(query.offset) : 0,
  };

  const { rows, total } = await mediaModel.getCorrespondences(filters);

  return res.json({
    status: 'success',
    message: 'Correspondences retrieved',
    data: { total, limit: filters.limit, offset: filters.offset, rows: rows.map(normaliseAttachmentPath) },
  });
};

/**
 * GET /api/media/correspondence/:id
 * Get a single correspondence by id.
 */
export const getCorrespondence = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
  }

  const record = await mediaModel.getCorrespondenceById(id);
  if (!record) {
    return res.status(404).json({ status: 'error', message: 'Correspondence not found', data: null });
  }

  return res.json({ status: 'success', message: 'Correspondence retrieved', data: normaliseAttachmentPath(record) });
};

/**
 * PUT /api/media/correspondence/:id
 * Partial update — only provided fields are changed. Send as JSON body.
 */
export const updateCorrespondence = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
  }

  const body = req.body as Partial<mediaModel.CorrespondenceCreatePayload>;
  const updated = await mediaModel.updateCorrespondence(id, body);

  if (!updated) {
    return res.status(404).json({ status: 'error', message: 'Correspondence not found or no changes applied', data: null });
  }

  return res.json({ status: 'success', message: 'Correspondence updated', data: { id } });
};

/**
 * PATCH /api/media/correspondence/:id/attachment
 * Upload or replace the attachment for an existing correspondence.
 * Send as multipart/form-data with "file" field.
 * Optional body field: pdf_page_count (integer)
 */
export const uploadCorrespondenceAttachment = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
  }

  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded', data: null });
  }

  const existing = await mediaModel.getCorrespondenceById(id);
  if (!existing) {
    return res.status(404).json({ status: 'error', message: 'Correspondence not found', data: null });
  }

  const filePath = `/uploads/media/correspondence/${file.filename}`;
  const pdfPageCount: number | null = req.body?.pdf_page_count ? Number(req.body.pdf_page_count) : null;

  const updated = await mediaModel.updateCorrespondenceAttachment(id, {
    attachment_filename: file.originalname,
    attachment_mime_type: file.mimetype,
    attachment_size: file.size,
    attachment_pdf_page_count: pdfPageCount,
    attachment_file_path: filePath,
  });

  if (!updated) {
    return res.status(500).json({ status: 'error', message: 'Failed to update attachment record', data: null });
  }

  return res.json({
    status: 'success',
    message: 'Attachment uploaded and linked',
    data: {
      id,
      attachment_file_path: `${BACKEND_URL}${filePath}`,
      attachment_filename: file.originalname,
      attachment_mime_type: file.mimetype,
      attachment_size: file.size,
    },
  });
};

/**
 * DELETE /api/media/correspondence/:id
 * Soft-delete a correspondence.
 */
export const deleteCorrespondence = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ status: 'error', message: 'Invalid id', data: null });
  }

  const deleted = await mediaModel.deleteCorrespondence(id);
  if (!deleted) {
    return res.status(404).json({ status: 'error', message: 'Correspondence not found', data: null });
  }

  return res.json({ status: 'success', message: 'Correspondence deleted', data: { id } });
};
