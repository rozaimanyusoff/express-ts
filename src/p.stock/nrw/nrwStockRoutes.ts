import { Router } from 'express';
import * as nrwStockController from './nrwStockController';
import asyncHandler from '../../utils/asyncHandler';

const router = Router();

// ---- SUPPLIERS ----
router.post('/suppliers', asyncHandler(nrwStockController.createSupplier));
router.get('/suppliers', asyncHandler(nrwStockController.getSuppliers));
router.get('/suppliers/:id', asyncHandler(nrwStockController.getSupplierById));
router.put('/suppliers/:id', asyncHandler(nrwStockController.updateSupplier));
router.delete('/suppliers/:id', asyncHandler(nrwStockController.deleteSupplier));

// ---- TEAM ----
router.post('/teams', asyncHandler(nrwStockController.createTeam));
router.get('/teams', asyncHandler(nrwStockController.getTeams));
router.get('/teams/:id', asyncHandler(nrwStockController.getTeamById));
router.put('/teams/:id', asyncHandler(nrwStockController.updateTeam));
router.delete('/teams/:id', asyncHandler(nrwStockController.deleteTeam));

// ---- FIXED ASSETS ----
router.post('/items', asyncHandler(nrwStockController.createStockItem));
router.get('/items', asyncHandler(nrwStockController.getStockItems));
router.get('/items/:id', asyncHandler(nrwStockController.getStockItemById));
router.get('/items/:id/transactions', asyncHandler(nrwStockController.getStockItemTransactions));
router.get('/items/:id/in-stock', asyncHandler(nrwStockController.getStockItemInStock));
router.put('/items/:id', asyncHandler(nrwStockController.updateStockItem));
router.delete('/items/:id', asyncHandler(nrwStockController.deleteStockItem));

// ---- STOCK PURCHASES ----
router.post('/purchases', asyncHandler(nrwStockController.createStockPurchase));
router.get('/purchases', asyncHandler(nrwStockController.getStockPurchases));
router.get('/purchases/:id', asyncHandler(nrwStockController.getStockPurchaseById));
router.put('/purchases/:id', asyncHandler(nrwStockController.updateStockPurchase));
router.delete('/purchases/:id', asyncHandler(nrwStockController.deleteStockPurchase));

// ---- STOCK PURCHASE ITEMS ----
router.post('/purchases/:purchaseId/items', asyncHandler(nrwStockController.createStockPurchaseItem));
router.get('/purchases/:purchaseId/items', asyncHandler(nrwStockController.getStockPurchaseItems));
router.put('/purchase-items/:id', asyncHandler(nrwStockController.updateStockPurchaseItem));
router.delete('/purchase-items/:id', asyncHandler(nrwStockController.deleteStockPurchaseItem));

// ---- STOCK CARD ----
router.post('/cards', asyncHandler(nrwStockController.createStockCard));
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

export default router;
