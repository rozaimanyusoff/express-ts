// src/p.jobbank/jobbankRoutes.ts
import { Router } from 'express';
import * as jobReposController from './jobreposController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// ========== JOBS CRUD ==========
// All routes under /api/jobs/repos

router.get('/repos', asyncHandler(jobReposController.getAllJobRepos));
router.get('/repos/:id', asyncHandler(jobReposController.getJobReposById));
router.post('/repos', asyncHandler(jobReposController.createJobRepos));
router.put('/repos/:id', asyncHandler(jobReposController.updateJobRepos));
router.delete('/repos/:id', asyncHandler(jobReposController.deleteJobRepos));

export default router;
