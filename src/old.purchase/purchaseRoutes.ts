// src/p.purchase/purchaseRoutes.ts
import { Router } from 'express';
import * as purchaseController from './purchaseController';
import asyncHandler from '../utils/asyncHandler';
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });


const router = Router();


router.get('/:id', asyncHandler(purchaseController.getPurchaseRequestById));
router.get('/', asyncHandler(purchaseController.getPurchaseRequests));
router.post('/', upload.single('request_upload'), asyncHandler(purchaseController.createPurchaseRequest));
router.delete('/:id', purchaseController.deletePurchaseRequest);

export default router;
