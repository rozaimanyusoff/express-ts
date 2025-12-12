import { Router } from 'express';

import asyncHandler from "../../utils/asyncHandler";
import * as requestController from './requestController';

const router = Router();

router.get('/', asyncHandler(requestController.findAllRequests));
router.post('/create', asyncHandler(requestController.createRequestAccess));

export default router;