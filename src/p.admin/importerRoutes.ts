import { Router } from 'express';

import * as importerController from '../p.admin/importerController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// TEMP TABLE IMPORTER
router.post('/import-temp-table', asyncHandler(importerController.importTempTable));

// TEMP TABLE METADATA
router.get('/tables', asyncHandler(importerController.getTempTables));

export default router;
