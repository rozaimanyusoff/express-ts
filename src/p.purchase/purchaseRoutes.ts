import { Router } from 'express';
import * as purchaseController from './purchaseController';
import { createUploader } from '../utils/fileUploader';
import asyncHandler from '../utils/asyncHandler';
// module_directory for purchases uploads
const purchaseUploader = createUploader('purchases');

const router = Router();

// PURCHASE REQUEST (simple CRUD)
router.get('/requests/:id', asyncHandler(purchaseController.getPurchaseRequestById));
router.get('/requests', asyncHandler(purchaseController.getPurchaseRequests));
router.post('/requests', asyncHandler(purchaseController.createPurchaseRequest));
router.put('/requests/:id', asyncHandler(purchaseController.updatePurchaseRequest));
router.delete('/requests/:id', asyncHandler(purchaseController.deletePurchaseRequest));
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

router.get('/:id', asyncHandler(purchaseController.getPurchaseRequestItemById));// GET purchase by ID
router.get('/summary', asyncHandler(purchaseController.getPurchaseRequestItemSummary));// GET purchase summary
router.get('/', asyncHandler(purchaseController.getPurchaseRequestItems));
// Accept any file fields to support nested delivery uploads like deliveries[0][upload_path]
router.post('/', purchaseUploader.any(), asyncHandler(purchaseController.createPurchaseRequestItem));
router.put('/:id', purchaseUploader.any(), asyncHandler(purchaseController.updatePurchaseRequestItem));
router.delete('/:id', asyncHandler(purchaseController.deletePurchaseRequestItem));// DELETE purchase by ID

// PURCHASE ASSET REGISTRY
router.post('/registry', asyncHandler(purchaseController.createPurchaseAssetsRegistry));
router.get('/registry', asyncHandler(purchaseController.getPurchaseAssetRegistry)); // ?pr_id=123

// PURCHASE DELIVERIES
router.get('/deliveries', asyncHandler(purchaseController.getDeliveries));
router.get('/deliveries/:id', asyncHandler(purchaseController.getDeliveryById));
router.post('/deliveries', purchaseUploader.single('upload_path'), asyncHandler(purchaseController.createDelivery));
router.put('/deliveries/:id', purchaseUploader.single('upload_path'), asyncHandler(purchaseController.updateDelivery));
router.delete('/deliveries/:id', asyncHandler(purchaseController.deleteDelivery));







export default router;
