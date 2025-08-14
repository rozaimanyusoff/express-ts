// src/p.jobbank/jobbankRoutes.ts
import { Router } from 'express';
import * as jobbankController from './jobbankController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// ========== JOBS CRUD ==========
router.get('/jobs', asyncHandler(jobbankController.getJobs));
router.get('/jobs/:id', asyncHandler(jobbankController.getJobById));
router.post('/jobs', asyncHandler(jobbankController.createJob));
router.put('/jobs/:id', asyncHandler(jobbankController.updateJob));
router.delete('/jobs/:id', asyncHandler(jobbankController.deleteJob));

/* ========== ADD MORE ROUTES HERE ========== */

// Placeholder routes - will be implemented based on your database structure
// Examples:
// router.get('/applications', asyncHandler(jobbankController.getApplications));
// router.get('/applications/:id', asyncHandler(jobbankController.getApplicationById));
// router.post('/applications', asyncHandler(jobbankController.createApplication));

// router.get('/companies', asyncHandler(jobbankController.getCompanies));
// router.get('/companies/:id', asyncHandler(jobbankController.getCompanyById));
// router.post('/companies', asyncHandler(jobbankController.createCompany));

// router.get('/categories', asyncHandler(jobbankController.getJobCategories));
// router.get('/jobs/category/:categoryId', asyncHandler(jobbankController.getJobsByCategory));

// router.get('/jobs/search', asyncHandler(jobbankController.searchJobs));
// router.get('/jobs/filter', asyncHandler(jobbankController.filterJobs));

export default router;
