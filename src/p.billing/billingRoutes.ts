// src/p.billing/billingRoutes.ts
import { Router } from 'express';
import * as billingController from './billingController';

const router = Router();

router.get('/', billingController.getAllBillings);
//router.get('/:id', billingController.getBillingById);
router.post('/', billingController.createBilling);
router.put('/:id', billingController.updateBilling);
router.delete('/:id', billingController.deleteBilling);

export default router;
