import { Router } from 'express';
import * as projectController from './projectController';
import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';

const router = Router();
const projectUploader = createUploader('projects');

/* ========== ASSIGNMENTS ========== */
// Global assignment endpoints - must be placed after project-specific routes
router.get('/assignments/workload', asyncHandler(projectController.getWorkloadSummary));
router.get('/assignments/assignee/:assignee', asyncHandler(projectController.getAssignmentsByAssignee));
router.get('/assignments', asyncHandler(projectController.getAllAssignments));

/* ========== PROJECTS ========== */
router.get('/:id', asyncHandler(projectController.getProjectById));
router.get('/', asyncHandler(projectController.getProjects));
router.post('/', projectUploader.any(), asyncHandler(projectController.createProject));
router.put('/:id', projectUploader.any(), asyncHandler(projectController.updateProject));
router.post('/:id/scopes', projectUploader.any(), asyncHandler(projectController.addScope));
// Important: place the more specific route before the dynamic :scopeId route to avoid matching "reorder" as a scopeId
router.put('/:id/scopes/reorder', asyncHandler(projectController.reorderScopes));
router.put('/:id/scopes/:scopeId', projectUploader.any(), asyncHandler(projectController.updateScope));
router.delete('/:id/scopes/:scopeId', asyncHandler(projectController.removeScope));
router.get('/:id/assignments', asyncHandler(projectController.getProjectAssignments));
router.delete('/:id', asyncHandler(projectController.deleteProject));


export default router;
