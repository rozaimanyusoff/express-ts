import { Router } from 'express';
import asyncHandler from "../../utils/asyncHandler";

import * as moduleController from './moduleController';

const router = Router();

router.get('/', asyncHandler(moduleController.getAllModules));
router.post('/create', asyncHandler(moduleController.saveModule));
router.put('/update/:id', asyncHandler(moduleController.updateModule));
router.put('/toggle/:id', asyncHandler(moduleController.toggleModule));

export default router;