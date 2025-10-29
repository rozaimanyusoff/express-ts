import { Router } from 'express';
import * as controller from './projectController';
import asyncHandler from '../utils/asyncHandler';
import tokenValidator from '../middlewares/tokenValidator';

const router = Router();

router.get('/', tokenValidator, asyncHandler(controller.listProjects));
router.post('/', tokenValidator, asyncHandler(controller.createProject));
router.post('/:id/progress-log', tokenValidator, asyncHandler(controller.addProgressLog));

export default router;
