import { Router } from 'express';
import asyncHandler from "../../utils/asyncHandler";

import * as roleController from './roleController';

const router = Router();

router.get('/', asyncHandler(roleController.getAllRoles));

export default router;