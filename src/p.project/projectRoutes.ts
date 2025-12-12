import { Router } from 'express';

import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';
import * as projectController from './projectController';

const router = Router();
const projectUploader = createUploader('projects');

/* ======= DEV CORE TASKS CRUD ======= */
// POST /api/projects/devcore-tasks - Create a new dev core task
router.post('/dev-tasks', asyncHandler(projectController.createDevCoreTask));
// GET /api/projects/devcore-tasks/:id - Get a dev core task by ID
router.get('/dev-tasks/:id', asyncHandler(projectController.getDevCoreTaskById));
// GET /api/projects/devcore-tasks - Get all dev core tasks
router.get('/dev-tasks', asyncHandler(projectController.getDevCoreTasks));
// PUT /api/projects/devcore-tasks/:id - Update a dev core task by ID
router.put('/dev-tasks/:id', asyncHandler(projectController.updateDevCoreTask));

// DELETE /api/projects/devcore-tasks/:id - Delete a dev core task by ID
router.delete('/dev-tasks/:id', asyncHandler(projectController.deleteDevCoreTask));

/* ======= APP CORE FEATURES CRUD ======= */
// POST /api/projects/core-features - Create a new core feature
router.post('/features', asyncHandler(projectController.createCoreFeature));

// GET /api/projects/core-features - Get all core features
router.get('/features', asyncHandler(projectController.getCoreFeatures));

// GET /api/projects/core-features/:id - Get a core feature by ID
router.get('/features/:id', asyncHandler(projectController.getCoreFeatureById));

// PUT /api/projects/core-features/:id - Update a core feature by ID
router.put('/features/:id', asyncHandler(projectController.updateCoreFeature));

// DELETE /api/projects/core-features/:id - Delete a core feature by ID
router.delete('/features/:id', asyncHandler(projectController.deleteCoreFeature));

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
