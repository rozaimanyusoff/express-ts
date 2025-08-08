import { Router } from 'express';
import * as purchaseController from './purchaseController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// GET all purchases with optional filtering
// Query params:
// - status: requested|ordered|delivered|invoiced|completed
// - costcenter: filter by cost center
// - supplier: filter by supplier (partial match)
// - startDate & endDate: date range filter
// - dateField: pr_date|po_date|do_date|inv_date|grn_date (default: pr_date)
router.get('/', asyncHandler(purchaseController.getPurchases));

// GET purchase summary
router.get('/summary', asyncHandler(purchaseController.getPurchaseSummary));

// GET purchase by ID
router.get('/:id', asyncHandler(purchaseController.getPurchaseById));

// CREATE new purchase
router.post('/', asyncHandler(purchaseController.createPurchase));

// BULK IMPORT purchases (for Excel import)
router.post('/import', asyncHandler(purchaseController.importPurchases));

// UPDATE purchase by ID
router.put('/:id', asyncHandler(purchaseController.updatePurchase));

// DELETE purchase by ID
router.delete('/:id', asyncHandler(purchaseController.deletePurchase));

export default router;
