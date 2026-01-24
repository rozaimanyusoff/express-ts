import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { createUploader, validateUploadedFile } from '../utils/fileUploader';
import * as mediaController from './mediaController';

const router = Router();

// Create uploaders for different media kinds with appropriate MIME types and size limits
const documentUploader = createUploader('media/documents', [
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'text/plain',
	'text/csv',
]);

const imageUploader = createUploader('media/images', [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
]);

const videoUploader = createUploader('media/videos', [
	'video/mp4',
	'video/mpeg',
	'video/quicktime',
	'video/x-msvideo',
	'video/x-matroska',
	'video/webm',
]);

/* ============ FILE UPLOAD ENDPOINTS ============ */

/**
 * POST /api/media/upload/document
 * Upload document with automatic processing
 */
router.post('/upload/document', documentUploader.single('file'), validateUploadedFile, asyncHandler(mediaController.uploadDocument));

/**
 * POST /api/media/upload/image
 * Upload image with automatic processing
 */
router.post('/upload/image', imageUploader.single('file'), validateUploadedFile, asyncHandler(mediaController.uploadImage));

/**
 * POST /api/media/upload/video
 * Upload video with automatic processing
 */
router.post('/upload/video', videoUploader.single('file'), validateUploadedFile, asyncHandler(mediaController.uploadVideo));

/* ============ MEDIA CRUD ============ */

/**
 * POST /api/media
 * Create a new media record
 */
router.post('/', asyncHandler(mediaController.createMedia));

/**
 * GET /api/media
 * List all media with filters
 */
router.get('/', asyncHandler(mediaController.listMedia));

/**
 * GET /api/media/:id
 * Get a specific media by ID
 */
router.get('/:id', asyncHandler(mediaController.getMedia));

/**
 * PUT /api/media/:id
 * Update media metadata
 */
router.put('/:id', asyncHandler(mediaController.updateMedia));

/**
 * DELETE /api/media/:id
 * Delete media (soft delete)
 */
router.delete('/:id', asyncHandler(mediaController.deleteMedia));

/* ============ UTILITY ENDPOINTS ============ */

/**
 * GET /api/media/stats
 * Get media statistics
 */
router.get('/stats/overview', asyncHandler(mediaController.getMediaStats));

/**
 * POST /api/media/:id/thumbnail
 * Generate thumbnail for media
 */
router.post('/:id/thumbnail', asyncHandler(mediaController.generateThumbnail));

/**
 * GET /api/media/:id/stream
 * Stream media with range request support
 */
router.get('/:id/stream', asyncHandler(mediaController.streamMedia));

export default router;
