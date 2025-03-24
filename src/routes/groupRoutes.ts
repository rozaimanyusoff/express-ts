import { Router } from 'express';
import { getAllGroups1, getGroupById1, createGroup1, updateGroup1 } from '../controllers/groupController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();
router.get('/', asyncHandler(getAllGroups1));
router.get('/:id', asyncHandler(getGroupById1));
router.post('/', asyncHandler(createGroup1));
router.put('/:id', asyncHandler(updateGroup1));


export default router;