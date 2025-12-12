import { Router } from 'express';

import { createGroup1, getAllGroups1, getAllGroupsStructured, getGroupById1, updateGroup1 } from '../p.group/groupController.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();
router.get('/', asyncHandler(getAllGroupsStructured));
router.get('/:id', asyncHandler(getGroupById1));
router.post('/', asyncHandler(createGroup1));
router.put('/:id', asyncHandler(updateGroup1));

export default router;