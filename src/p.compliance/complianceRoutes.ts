import { Router } from 'express';
import * as summonController from './complianceController';
import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';

const router = Router();

/* ====== SUMMONS ====== */
const uploader = createUploader('summons');
router.get('/summon/:id', asyncHandler(summonController.getSummonById));
router.get('/summon', asyncHandler(summonController.getSummons));
router.post('/summon', uploader.single('attachment'), asyncHandler(summonController.createSummon));
router.put('/summon/:id', uploader.single('attachment'), asyncHandler(summonController.updateSummon));
router.delete('/summon/:id', asyncHandler(summonController.deleteSummon));

export default router;
