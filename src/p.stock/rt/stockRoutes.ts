import { Router } from 'express';

import asyncHandler from '../../utils/asyncHandler';
import * as stockController from './stockController';
import * as stockModel from './stockModel';

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
// Get all stock transactions for a given item_id
router.get('/items/:id/transactions', asyncHandler(stockController.getStockTransactionsByItemId));
// Get in-stock data for a given item_id
router.get('/items/:id/in-stock', asyncHandler(stockController.getStockInStockByItemId));
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

// ---- STOCK REQUEST ROUTES ----
router.post('/requests', asyncHandler(stockController.createStockRequest));
router.get('/requests', asyncHandler(stockController.getStockRequests));
router.get('/requests/:id', asyncHandler(stockController.getStockRequestById));
router.put('/requests/:id', asyncHandler(stockController.updateStockRequest));
router.delete('/requests/:id', asyncHandler(stockController.deleteStockRequest));

// Child table: rt_stock_request_items
router.post('/requests/:request_id/items', asyncHandler((req, res) => {
  req.body.stock_out_id = Number(req.params.request_id);
  return stockController.addStockRequestItem(req, res);
}));
router.get('/requests/:request_id/items', asyncHandler(async (req, res) => {
  const request_id = Number(req.params.request_id);
  if (isNaN(request_id)) return res.status(400).json({ data: null, message: 'Invalid request_id', status: 'error' });
  const request = await stockModel.getStockRequestById(request_id);
  res.json({
    data: request && Array.isArray(request.items) ? request.items : [],
    message: 'Stock request items retrieved',
    status: 'success'
  });
}));
router.get('/requests/items/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
  // Fallback: get item by id from rt_stock_request_items
  const [rows] = await require('../../utils/db').query('SELECT * FROM stock.rt_stock_request_items WHERE id = ?', [id]);
  const item = Array.isArray(rows) && rows.length ? rows[0] : null;
  if (!item) return res.status(404).json({ data: null, message: 'Not found', status: 'error' });
  res.json({
    data: item,
    message: 'Stock request item retrieved',
    status: 'success'
  });
}));
router.put('/requests/items/:id', asyncHandler(stockController.updateStockRequestItem));
router.delete('/requests/items/:id', asyncHandler(stockController.deleteStockRequestItem));

export default router;
