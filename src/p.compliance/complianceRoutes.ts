import { Router } from 'express';
import * as summonController from './complianceController';
import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';

const router = Router();

/* ====== SUMMONS ====== */
// Use canonical module_directory for summons uploads
const uploader = createUploader('compliance/summon');
router.get('/summon/:id', asyncHandler(summonController.getSummonById));
router.get('/summon', asyncHandler(summonController.getSummons));
router.post('/summon', uploader.single('summon_upl'), asyncHandler(summonController.createSummon));
router.put('/summon/:id', uploader.single('summon_upl'), asyncHandler(summonController.updateSummon));
router.post('/summon/:id/payment', uploader.single('summon_receipt'), asyncHandler(summonController.uploadSummonPayment));
router.post('/summon/notify', asyncHandler(summonController.resendSummonNotification));
router.delete('/summon/:id', asyncHandler(summonController.deleteSummon));

export default router;
