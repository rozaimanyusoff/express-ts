import { Router } from 'express';

import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';
import * as purchaseController from './purchaseController';
// module_directory for purchases uploads
const purchaseUploader = createUploader('purchases');

const router = Router();

// PURCHASE REQUEST (simple CRUD)
// Query params: ?ramco={ramco_id} to filter by requester
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

// MATCH MODELS - Frontend input to find matching models
router.post('/match-models', asyncHandler(purchaseController.matchModels));

// MATCH SUPPLIERS - Frontend input to find matching suppliers
router.post('/match-suppliers', asyncHandler(purchaseController.matchSuppliers));




// PURCHASE ASSET REGISTRY
router.post('/registry', asyncHandler(purchaseController.createPurchaseAssetsRegistry));
router.get('/registry/all', asyncHandler(purchaseController.getPurchaseAssetRegistry)); // GET all assets
router.get('/registry-model-checker', asyncHandler(purchaseController.checkRegistryModels)); // Check registry models against assets.models
router.put('/registry/:id', asyncHandler(purchaseController.updatePurchaseAssetsRegistry)); // Update registry entry by ID
router.get('/registry', asyncHandler(purchaseController.getPurchaseAssetRegistryByPrId)); // ?pr_id=123

// GET all purchases with optional filtering
// Query params:
// - status: requested|ordered|delivered|invoiced|completed
// - costcenter: filter by cost center
// - supplier: filter by supplier (partial match)
// - startDate & endDate: date range filter
// - dateField: pr_date|po_date|do_date|inv_date|grn_date (default: pr_date)
router.get('/:id', asyncHandler(purchaseController.getPurchaseRequestItemById));// GET purchase by ID
router.get('/summary', asyncHandler(purchaseController.getPurchaseRequestItemSummary));// GET purchase summary
router.post('/:id/resend-notification', asyncHandler(purchaseController.resendPurchaseNotification)); // POST resend notification for purchase
router.get('/', asyncHandler(purchaseController.getPurchaseRequestItems));
// Accept any file fields to support nested delivery uploads like deliveries[0][upload_path]
router.post('/', purchaseUploader.any(), asyncHandler(purchaseController.createPurchaseRequestItem));
router.put('/:id', purchaseUploader.any(), asyncHandler(purchaseController.updatePurchaseRequestItem));
router.delete('/:id', asyncHandler(purchaseController.deletePurchaseRequestItem));// DELETE purchase by ID


// PURCHASE DELIVERIES
router.get('/deliveries', asyncHandler(purchaseController.getDeliveries));
router.get('/deliveries/:id', asyncHandler(purchaseController.getDeliveryById));
router.post('/deliveries', purchaseUploader.single('upload_path'), asyncHandler(purchaseController.createDelivery));
router.put('/deliveries/:id', purchaseUploader.single('upload_path'), asyncHandler(purchaseController.updateDelivery));
router.delete('/deliveries/:id', asyncHandler(purchaseController.deleteDelivery));

// IMPORT FROM purchase_item_import
router.post('/import', asyncHandler(purchaseController.importPurchaseData));

export default router;
