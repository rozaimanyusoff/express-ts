import { Router } from 'express';
import * as nrwStockController from './nrwStockController';
import asyncHandler from '../../utils/asyncHandler';

const router = Router();


// ---- TEAM ----
router.post('/teams', asyncHandler(nrwStockController.createTeam));
router.get('/teams', asyncHandler(nrwStockController.getTeams));
router.get('/teams/:id', asyncHandler(nrwStockController.getTeamById));
router.put('/teams/:id', asyncHandler(nrwStockController.updateTeam));
router.delete('/teams/:id', asyncHandler(nrwStockController.deleteTeam));


// ---- STOCK PURCHASES ----
router.post('/purchases/with-items', asyncHandler(nrwStockController.createStockPurchase));
router.get('/purchases', asyncHandler(nrwStockController.getStockPurchases));
router.get('/purchases/:id', asyncHandler(nrwStockController.getStockPurchaseById));
router.put('/purchases/:id', asyncHandler(nrwStockController.updateStockPurchase));
router.delete('/purchases/:id', asyncHandler(nrwStockController.deleteStockPurchase));

// ---- STOCK PURCHASE ITEMS ----
router.post('/purchases/:purchaseId/items', asyncHandler(nrwStockController.createStockPurchaseItem));
router.get('/purchases/:purchaseId/items', asyncHandler(nrwStockController.getStockPurchaseItems));
router.put('/purchase-items/:id', asyncHandler(nrwStockController.updateStockPurchaseItem));
router.delete('/purchase-items/:id', asyncHandler(nrwStockController.deleteStockPurchaseItem));

// ---- STOCK TRANSACTIONS ----
router.post('/transactions', asyncHandler(nrwStockController.createStockTransaction));
router.get('/transactions', asyncHandler(nrwStockController.getStockTransactions));
router.get('/transactions/:id', asyncHandler(nrwStockController.getStockTransactionById));
router.get('/transactions/item/:itemId', asyncHandler(nrwStockController.getStockTransactionsByItemId));
router.put('/transactions/:id', asyncHandler(nrwStockController.updateStockTransaction));
router.delete('/transactions/:id', asyncHandler(nrwStockController.deleteStockTransaction));

// ---- STOCK CARD ----
router.post('/cards', asyncHandler(nrwStockController.createStockCard));
router.get('/cards/with-items', asyncHandler(nrwStockController.getStockCardsWithItems));
router.get('/cards/item/:itemId', asyncHandler(nrwStockController.getStockCardByItemId));
router.get('/cards', asyncHandler(nrwStockController.getStockCards));
router.put('/cards/:id', asyncHandler(nrwStockController.updateStockCard));
router.delete('/cards/:id', asyncHandler(nrwStockController.deleteStockCard));

// ---- STOCK TRACKING ----
router.post('/tracking', asyncHandler(nrwStockController.createStockTracking));
router.get('/tracking', asyncHandler(nrwStockController.getStockTrackings));
router.get('/tracking/:id', asyncHandler(nrwStockController.getStockTrackingById));
router.put('/tracking/:id', asyncHandler(nrwStockController.updateStockTracking));
router.delete('/tracking/:id', asyncHandler(nrwStockController.deleteStockTracking));

// ---- STOCK ANALYSIS ----
router.get('/analysis', asyncHandler(nrwStockController.generateStockAnalysis));

// ---- STOCK REQUEST ----
router.post('/requests', asyncHandler(nrwStockController.createStockRequest));
router.get('/requests', asyncHandler(nrwStockController.getStockRequests));
router.get('/requests/:id', asyncHandler(nrwStockController.getStockRequestById));
router.put('/requests/:id', asyncHandler(nrwStockController.updateStockRequest));
router.delete('/requests/:id', asyncHandler(nrwStockController.deleteStockRequest));

// ---- STOCK REQUEST ITEMS ----
router.post('/requests/:requestId/items', asyncHandler(nrwStockController.addStockRequestItem));
router.get('/requests/:requestId/items', asyncHandler(nrwStockController.getStockRequestItems));
router.put('/request-items/:id', asyncHandler(nrwStockController.updateStockRequestItem));
router.delete('/request-items/:id', asyncHandler(nrwStockController.deleteStockRequestItem));


/* ======== MANUFACTURERS ======== */
router.get('/manufacturers/:id', asyncHandler(nrwStockController.getManufacturerById));
// get manufacturers by ids
router.post('/manufacturers/by-ids', asyncHandler(nrwStockController.getManufacturersByIds));
router.get('/manufacturers', asyncHandler(nrwStockController.getManufacturers));
router.post('/manufacturers', asyncHandler(nrwStockController.createManufacturer));
router.put('/manufacturers/:id', asyncHandler(nrwStockController.updateManufacturer));
router.delete('/manufacturers/:id', asyncHandler(nrwStockController.deleteManufacturer));

/* ======== SUPPLIERS ======== */
router.get('/suppliers/:id', asyncHandler(nrwStockController.getSupplierById));
// get suppliers by ids
router.post('/suppliers/by-ids', asyncHandler(nrwStockController.getSuppliersByIds));
router.get('/suppliers', asyncHandler(nrwStockController.getSuppliers));
router.post('/suppliers', asyncHandler(nrwStockController.createSupplier));
router.put('/suppliers/:id', asyncHandler(nrwStockController.updateSupplier));
router.delete('/suppliers/:id', asyncHandler(nrwStockController.deleteSupplier));

/* ========== ITEMS ========== */
router.get('/items/:id', asyncHandler(nrwStockController.getItemById));
//get item by ids
router.post('/items/by-ids', asyncHandler(nrwStockController.getItemsByIds));
router.get('/items', asyncHandler(nrwStockController.getItems));
router.post('/items', asyncHandler(nrwStockController.createItem));
router.put('/items/:id', asyncHandler(nrwStockController.updateItem));
router.delete('/items/:id', asyncHandler(nrwStockController.deleteItem));

/* ========== ITEM SIZES ========== */
router.get('/sizes/:id', asyncHandler(nrwStockController.getSizeById));
router.get('/sizes', asyncHandler(nrwStockController.getSizes));
router.post('/sizes', asyncHandler(nrwStockController.createSize));
router.put('/sizes/:id', asyncHandler(nrwStockController.updateSize));
router.delete('/sizes/:id', asyncHandler(nrwStockController.deleteSize));

/* ========== FIXED ASSETS ======= */
// raw data for all stock in items
router.post('/', asyncHandler(nrwStockController.createStock));
router.get('/:id', asyncHandler(nrwStockController.getStockById));
router.get('/', asyncHandler(nrwStockController.getStocks));
router.get('/:id/in-stock', asyncHandler(nrwStockController.getStockInStock));
router.put('/:id', asyncHandler(nrwStockController.updateStock));
router.delete('/:id', asyncHandler(nrwStockController.deleteStock));

export default router;
