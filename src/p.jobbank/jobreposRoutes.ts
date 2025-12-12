// src/p.jobbank/jobbankRoutes.ts
import { Router } from 'express';

import asyncHandler from '../utils/asyncHandler';
import * as jobReposController from './jobreposController';

const router = Router();

// ========== JOBS CRUD ==========
// All routes under /api/jobs/repos

router.get('/repos', asyncHandler(jobReposController.getAllJobRepos));
router.get('/repos/:id', asyncHandler(jobReposController.getJobReposById));
router.post('/repos', asyncHandler(jobReposController.createJobRepos));
router.put('/repos/:id', asyncHandler(jobReposController.updateJobRepos));
router.delete('/repos/:id', asyncHandler(jobReposController.deleteJobRepos));

export default router;
