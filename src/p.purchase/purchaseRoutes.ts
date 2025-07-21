// src/p.purchase/purchaseRoutes.ts
import { Router } from 'express';

import * as purchaseController from './purchaseController';
import asyncHandler from '../utils/asyncHandler';


const router = Router();

router.get('/:id', asyncHandler(purchaseController.getPurchaseRequestById));
router.post('/', asyncHandler(purchaseController.createPurchaseRequest));
router.delete('/:id', purchaseController.deletePurchaseRequest);

export default router;
