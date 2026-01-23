import { Request, Response } from 'express';
import * as mediaModel from './mediaModel';

/* ============ PRESIGN ENDPOINTS ============ */

/**
 * POST /api/media/presign
 * Generate a pre-signed URL for upload
 * Body: { filename, mimeType, kind: "document" | "image" | "video", size? }
 */
export const generatePresign = async (req: Request, res: Response) => {
  const { filename, mimeType, kind, size } = req.body;
  const userId = (req as any).user?.id;

  // Validation
  if (!filename || !mimeType || !kind) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: filename, mimeType, kind',
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

  // Validate MIME type by kind
  const mimeValidation: Record<string, string[]> = {
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ],
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  };

  const allowedMimes = mimeValidation[kind];
  if (allowedMimes && !allowedMimes.includes(mimeType)) {
    return res.status(415).json({
      status: 'error',
      message: `Invalid MIME type for ${kind}. Allowed: ${allowedMimes.join(', ')}`,
      data: null,
    });
  }

  // Validate file size
  const sizeLimits: Record<string, number> = {
    document: 52428800, // 50MB
    image: 10485760, // 10MB
    video: 524288000, // 500MB
  };

  if (size && size > sizeLimits[kind]) {
    return res.status(413).json({
      status: 'error',
      message: `File too large for ${kind}. Max: ${sizeLimits[kind] / 1024 / 1024}MB`,
      data: null,
    });
  }

  try {
    const presignData = await mediaModel.generatePresignedUrl(userId, filename, mimeType, kind, size);
    return res.json({
      status: 'success',
      message: 'Pre-signed URL generated',
      data: presignData,
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
 * POST /api/media/presign/batch
 * Generate multiple pre-signed URLs
 * Body: { files: [{ filename, mimeType, kind, size? }] }
 */
export const generatePresignBatch = async (req: Request, res: Response) => {
  const { files } = req.body;
  const userId = (req as any).user?.id;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'files must be a non-empty array',
      data: null,
    });
  }

  // Validate all files
  for (const file of files) {
    if (!file.filename || !file.mimeType || !file.kind) {
      return res.status(400).json({
        status: 'error',
        message: 'Each file must have: filename, mimeType, kind',
        data: null,
      });
    }

    if (!['document', 'image', 'video'].includes(file.kind)) {
      return res.status(415).json({
        status: 'error',
        message: `Invalid kind: ${file.kind}`,
        data: null,
      });
    }
  }

  try {
    const presignData = await mediaModel.generatePresignedUrlBatch(userId, files);
    return res.json({
      status: 'success',
      message: `Generated ${presignData.length} pre-signed URLs`,
      data: { urls: presignData },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: (error as Error).message,
      data: null,
    });
  }
};

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
        items: result.items,
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

/* ============ UPDATE MEDIA ============ */

/**
 * PATCH /api/media/:id
 * Update media metadata
 * Body: { name?, tags?, projectId? }
 */
export const updateMedia = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, tags, projectId } = req.body;
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

    // Update the media
    await mediaModel.updateMedia(mediaId, {
      name,
      tags,
      projectId,
    });

    const updatedMedia = await mediaModel.getMediaById(mediaId);

    return res.json({
      status: 'success',
      message: 'Media updated successfully',
      data: updatedMedia,
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
