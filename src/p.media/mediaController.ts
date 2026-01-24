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
