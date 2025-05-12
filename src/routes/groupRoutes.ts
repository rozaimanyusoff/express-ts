import { Router } from 'express';
import { getAllGroupsStructured, getAllGroups1, getGroupById1, createGroup1, updateGroup1 } from '../controllers/groupController.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();
router.get('/', asyncHandler(getAllGroupsStructured));
router.get('/:id', asyncHandler(getGroupById1));
router.post('/', asyncHandler(createGroup1));
router.put('/:id', asyncHandler(updateGroup1));

export default router;