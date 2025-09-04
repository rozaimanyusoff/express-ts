import { Router } from 'express';
import * as purchaseController from './purchaseController';
import { createUploader } from '../utils/fileUploader';
import asyncHandler from '../utils/asyncHandler';
// module_directory for purchases uploads
const purchaseUploader = createUploader('purchases/docs');

const router = Router();

/* SUPPLIERS */

router.get('/suppliers/:id', asyncHandler(purchaseController.getSupplierById));
router.get('/suppliers', asyncHandler(purchaseController.getSuppliers));
router.post('/suppliers', asyncHandler(purchaseController.createSupplier));
router.put('/suppliers/:id', asyncHandler(purchaseController.updateSupplier));
router.delete('/suppliers/:id', asyncHandler(purchaseController.deleteSupplier));


// GET all purchases with optional filtering
// Query params:
// - status: requested|ordered|delivered|invoiced|completed
// - costcenter: filter by cost center
// - supplier: filter by supplier (partial match)
// - startDate & endDate: date range filter
// - dateField: pr_date|po_date|do_date|inv_date|grn_date (default: pr_date)
// GET purchase by ID
router.get('/:id', asyncHandler(purchaseController.getPurchaseById));
router.get('/', asyncHandler(purchaseController.getPurchases));
// GET purchase summary
router.get('/summary', asyncHandler(purchaseController.getPurchaseSummary));
// CREATE new purchase (supports optional file upload under field 'upload_path')
router.post('/', purchaseUploader.single('upload_path'), asyncHandler(purchaseController.createPurchase));
// BULK IMPORT purchases (for Excel import)
router.post('/import', asyncHandler(purchaseController.importPurchases));
// UPDATE purchase by ID (supports optional file upload under field 'upload_path')
router.put('/:id', purchaseUploader.single('upload_path'), asyncHandler(purchaseController.updatePurchase));
// DELETE purchase by ID
router.delete('/:id', asyncHandler(purchaseController.deletePurchase));


export default router;
