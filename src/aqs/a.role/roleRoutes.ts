import { Router } from 'express';

import asyncHandler from "../../utils/asyncHandler";
import * as roleController from './roleController';

const router = Router();

router.get('/', asyncHandler(roleController.getAllRoles));
router.post('/create', asyncHandler(roleController.addRole));
router.put('/update/:id', asyncHandler(roleController.updateRole));
router.put('/toggle/:id', asyncHandler(roleController.toggleRole));

export default router;