import { Router, Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import * as mediaController from './mediaController';

const router = Router();

/* ============ PRESIGN ENDPOINTS ============ */

/**
 * POST /api/media/presign
 * Generate a pre-signed URL for upload
 */
router.post('/presign', asyncHandler(mediaController.generatePresign));

/**
 * POST /api/media/presign/batch
 * Generate multiple pre-signed URLs
 */
router.post('/presign/batch', asyncHandler(mediaController.generatePresignBatch));

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
 * PATCH /api/media/:id
 * Update media metadata
 */
router.patch('/:id', asyncHandler(mediaController.updateMedia));

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
