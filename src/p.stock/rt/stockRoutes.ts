import { Router } from 'express';
import * as stockController from './stockController';
import asyncHandler from '../../utils/asyncHandler';

const router = Router();

// SUPPLIERS
router.post('/suppliers', asyncHandler(stockController.createSupplier));
router.get('/suppliers', asyncHandler(stockController.getSuppliers));
router.get('/suppliers/:id', asyncHandler(stockController.getSupplierById));
router.put('/suppliers/:id', asyncHandler(stockController.updateSupplier));
router.delete('/suppliers/:id', asyncHandler(stockController.deleteSupplier));

// TEAM
router.post('/teams', asyncHandler(stockController.createTeam));
router.get('/teams', asyncHandler(stockController.getTeams));
router.get('/teams/:id', asyncHandler(stockController.getTeamById));
router.put('/teams/:id', asyncHandler(stockController.updateTeam));
router.delete('/teams/:id', asyncHandler(stockController.deleteTeam));

// STOCK ITEMS
router.post('/items', asyncHandler(stockController.createStockItem));
router.get('/items/:id', asyncHandler(stockController.getStockItemById));
router.get('/items', asyncHandler(stockController.getStockItems));
router.put('/items/:id', asyncHandler(stockController.updateStockItem));
router.delete('/items/:id', asyncHandler(stockController.deleteStockItem));

// PURCHASES
router.post('/purchase', asyncHandler(stockController.createStockPurchase));
router.get('/purchase/items/:id', asyncHandler(stockController.getStockPurchaseItemById));
router.get('/purchase/:purchase_id/items', asyncHandler(stockController.getStockPurchaseItems));
router.get('/purchase/:id', asyncHandler(stockController.getStockPurchaseById));
router.get('/purchase', asyncHandler(stockController.getStockPurchases));

router.put('/purchase/:id', asyncHandler(stockController.updateStockPurchase));
router.delete('/purchase/:id', asyncHandler(stockController.deleteStockPurchase));

// Child table: rt_stock_purchase_items
router.post('/purchase/:purchase_id/items', asyncHandler((req, res) => {
    req.body.purchase_id = Number(req.params.purchase_id);
    return stockController.createStockPurchaseItem(req, res);
  }));

router.put('/purchase/items/:id', asyncHandler(stockController.updateStockPurchaseItem));
router.delete('/purchase/items/:id', asyncHandler(stockController.deleteStockPurchaseItem));

// ---- STOCK CARD ROUTES ----
router.get('/cards', asyncHandler(stockController.getStockCards));
router.get('/cards/:id', asyncHandler(stockController.getStockCardByItemId));
router.post('/cards', asyncHandler(stockController.createStockCard));
router.put('/cards/:id', asyncHandler(stockController.updateStockCard));
router.delete('/cards/:id', asyncHandler(stockController.deleteStockCard));

// ---- STOCK TRACKING ROUTES ----
router.post('/tracking', asyncHandler(stockController.createStockTracking));
router.get('/tracking', asyncHandler(stockController.getStockTrackings));
router.get('/tracking/:id', asyncHandler(stockController.getStockTrackingById));
router.put('/tracking/:id', asyncHandler(stockController.updateStockTracking));
router.delete('/tracking/:id', asyncHandler(stockController.deleteStockTracking));

// ---- STOCK ANALYSIS ROUTE ----
router.get('/analysis', asyncHandler(stockController.getStockAnalysis));

export default router;
