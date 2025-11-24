import { Request, Response } from 'express';
import * as nrwStockModel from './nrwStockModel';

// ---- STOCK PURCHASES ----

export const createStockPurchase = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockPurchase(data);
  res.status(201).json({ 
    status: 'success', 
    message: 'Stock purchase created', 
    data: result 
  });
};

export const getStockPurchases = async (req: Request, res: Response) => {
  const purchases = await nrwStockModel.getStockPurchases();
  
  // Enrich with items if needed
  const purchaseIds = (purchases as any[]).map((p: any) => p.id);
  const allItems = await nrwStockModel.getStockPurchaseItemsForPurchases(purchaseIds);
  
  // Group items by purchase_id
  const itemsByPurchase = (allItems as any[]).reduce((acc: any, item: any) => {
    if (!acc[item.purchase_id]) acc[item.purchase_id] = [];
    acc[item.purchase_id].push(item);
    return acc;
  }, {});
  
  // Enrich with supplier details
  const supplierIds = [...new Set((purchases as any[]).map((p: any) => p.supplier_id).filter(Boolean))];
  const suppliers = await nrwStockModel.getSuppliersByIds(supplierIds);
  const suppliersById = (suppliers as any[]).reduce((acc: any, s: any) => {
    acc[s.id] = s;
    return acc;
  }, {});
  
  const enrichedPurchases = (purchases as any[]).map((p: any) => ({
    ...p,
    items: itemsByPurchase[p.id] || [],
    supplier: suppliersById[p.supplier_id] || null
  }));
  
  res.json({ 
    status: 'success', 
    message: 'Stock purchases retrieved', 
    data: enrichedPurchases 
  });
};

export const getStockPurchaseById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const purchase = await nrwStockModel.getStockPurchaseById(Number(id));
  
  if (!purchase) {
    return res.status(404).json({ 
      status: 'error', 
      message: 'Stock purchase not found', 
      data: null 
    });
  }
  
  // Get items
  const items = await nrwStockModel.getStockPurchaseItems(Number(id));
  
  // Get supplier
  const supplier = (purchase as any).supplier_id 
    ? await nrwStockModel.getSupplierById((purchase as any).supplier_id)
    : null;
  
  res.json({ 
    status: 'success', 
    message: 'Stock purchase retrieved', 
    data: { 
      ...purchase, 
      items, 
      supplier 
    } 
  });
};

export const updateStockPurchase = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockPurchase(Number(id), data);
  res.json({ 
    status: 'success', 
    message: 'Stock purchase updated', 
    data: result 
  });
};

export const deleteStockPurchase = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockPurchase(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Stock purchase deleted', 
    data: result 
  });
};

// ---- STOCK PURCHASE ITEMS ----

export const createStockPurchaseItem = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockPurchaseItem(data);
  res.status(201).json({ 
    status: 'success', 
    message: 'Stock purchase item created', 
    data: result 
  });
};

export const getStockPurchaseItems = async (req: Request, res: Response) => {
  const { purchaseId } = req.params;
  const items = await nrwStockModel.getStockPurchaseItems(Number(purchaseId));
  res.json({ 
    status: 'success', 
    message: 'Stock purchase items retrieved', 
    data: items 
  });
};

export const updateStockPurchaseItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockPurchaseItem(Number(id), data);
  res.json({ 
    status: 'success', 
    message: 'Stock purchase item updated', 
    data: result 
  });
};

export const deleteStockPurchaseItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockPurchaseItem(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Stock purchase item deleted', 
    data: result 
  });
};

// ---- SUPPLIERS ----

export const createSupplier = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createSupplier(data);
  res.status(201).json({ 
    status: 'success', 
    message: 'Supplier created', 
    data: result 
  });
};

export const getSuppliers = async (req: Request, res: Response) => {
  const suppliers = await nrwStockModel.getSuppliers();
  res.json({ 
    status: 'success', 
    message: 'Suppliers retrieved', 
    data: suppliers 
  });
};

export const getSupplierById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const supplier = await nrwStockModel.getSupplierById(Number(id));
  
  if (!supplier) {
    return res.status(404).json({ 
      status: 'error', 
      message: 'Supplier not found', 
      data: null 
    });
  }
  
  res.json({ 
    status: 'success', 
    message: 'Supplier retrieved', 
    data: supplier 
  });
};

export const updateSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateSupplier(Number(id), data);
  res.json({ 
    status: 'success', 
    message: 'Supplier updated', 
    data: result 
  });
};

export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteSupplier(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Supplier deleted', 
    data: result 
  });
};

// ---- TEAM ----

export const createTeam = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createTeam(data);
  res.status(201).json({ 
    status: 'success', 
    message: 'Team created', 
    data: result 
  });
};

export const getTeams = async (req: Request, res: Response) => {
  const teams = await nrwStockModel.getTeams();
  res.json({ 
    status: 'success', 
    message: 'Teams retrieved', 
    data: teams 
  });
};

export const getTeamById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const team = await nrwStockModel.getTeamById(Number(id));
  
  if (!team) {
    return res.status(404).json({ 
      status: 'error', 
      message: 'Team not found', 
      data: null 
    });
  }
  
  res.json({ 
    status: 'success', 
    message: 'Team retrieved', 
    data: team 
  });
};

export const updateTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateTeam(Number(id), data);
  res.json({ 
    status: 'success', 
    message: 'Team updated', 
    data: result 
  });
};

export const deleteTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteTeam(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Team deleted', 
    data: result 
  });
};

// ---- STOCK ITEMS ----

export const createStockItem = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockItem(data);
  res.status(201).json({ 
    status: 'success', 
    message: 'Stock item created', 
    data: result 
  });
};

export const getStockItems = async (req: Request, res: Response) => {
  const items = await nrwStockModel.getStockItems();
  res.json({ 
    status: 'success', 
    message: 'Stock items retrieved', 
    data: items 
  });
};

export const getStockItemById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const item = await nrwStockModel.getStockItemById(Number(id));
  
  if (!item) {
    return res.status(404).json({ 
      status: 'error', 
      message: 'Stock item not found', 
      data: null 
    });
  }
  
  res.json({ 
    status: 'success', 
    message: 'Stock item retrieved', 
    data: item 
  });
};

export const getStockItemTransactions = async (req: Request, res: Response) => {
  const { id } = req.params;
  const transactions = await nrwStockModel.getStockTransactionsByItemId(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Stock item transactions retrieved', 
    data: transactions 
  });
};

export const getStockItemInStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const stockCard = await nrwStockModel.getStockCardByItemId(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Stock item in-stock retrieved', 
    data: stockCard 
  });
};

export const updateStockItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockItem(Number(id), data);
  res.json({ 
    status: 'success', 
    message: 'Stock item updated', 
    data: result 
  });
};

export const deleteStockItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockItem(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Stock item deleted', 
    data: result 
  });
};

// ---- STOCK CARD ----

export const createStockCard = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockCard(data);
  res.status(201).json({ 
    status: 'success', 
    message: 'Stock card created', 
    data: result 
  });
};

export const getStockCards = async (req: Request, res: Response) => {
  const cards = await nrwStockModel.getStockCards();
  res.json({ 
    status: 'success', 
    message: 'Stock cards retrieved', 
    data: cards 
  });
};

export const updateStockCard = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockCard(Number(id), data);
  res.json({ 
    status: 'success', 
    message: 'Stock card updated', 
    data: result 
  });
};

export const deleteStockCard = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockCard(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Stock card deleted', 
    data: result 
  });
};

// ---- STOCK TRACKING ----

export const createStockTracking = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockTracking(data);
  res.status(201).json({ 
    status: 'success', 
    message: 'Stock tracking created', 
    data: result 
  });
};

export const getStockTrackings = async (req: Request, res: Response) => {
  const trackings = await nrwStockModel.getStockTrackings();
  res.json({ 
    status: 'success', 
    message: 'Stock trackings retrieved', 
    data: trackings 
  });
};

export const getStockTrackingById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tracking = await nrwStockModel.getStockTrackingById(Number(id));
  
  if (!tracking) {
    return res.status(404).json({ 
      status: 'error', 
      message: 'Stock tracking not found', 
      data: null 
    });
  }
  
  res.json({ 
    status: 'success', 
    message: 'Stock tracking retrieved', 
    data: tracking 
  });
};

export const updateStockTracking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockTracking(Number(id), data);
  res.json({ 
    status: 'success', 
    message: 'Stock tracking updated', 
    data: result 
  });
};

export const deleteStockTracking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockTracking(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Stock tracking deleted', 
    data: result 
  });
};

// ---- STOCK REQUEST ----

export const createStockRequest = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockRequest(data);
  res.status(201).json({ 
    status: 'success', 
    message: 'Stock request created', 
    data: result 
  });
};

export const getStockRequests = async (req: Request, res: Response) => {
  const requests = await nrwStockModel.getStockRequests();
  res.json({ 
    status: 'success', 
    message: 'Stock requests retrieved', 
    data: requests 
  });
};

export const getStockRequestById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const request = await nrwStockModel.getStockRequestById(Number(id));
  
  if (!request) {
    return res.status(404).json({ 
      status: 'error', 
      message: 'Stock request not found', 
      data: null 
    });
  }
  
  res.json({ 
    status: 'success', 
    message: 'Stock request retrieved', 
    data: request 
  });
};

export const updateStockRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockRequest(Number(id), data);
  res.json({ 
    status: 'success', 
    message: 'Stock request updated', 
    data: result 
  });
};

export const deleteStockRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockRequest(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Stock request deleted', 
    data: result 
  });
};

// ---- STOCK REQUEST ITEMS ----

export const addStockRequestItem = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.addStockRequestItem(data);
  res.status(201).json({ 
    status: 'success', 
    message: 'Stock request item added', 
    data: result 
  });
};

export const getStockRequestItems = async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const items = await nrwStockModel.getStockRequestItems(Number(requestId));
  res.json({ 
    status: 'success', 
    message: 'Stock request items retrieved', 
    data: items 
  });
};

export const updateStockRequestItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockRequestItem(Number(id), data);
  res.json({ 
    status: 'success', 
    message: 'Stock request item updated', 
    data: result 
  });
};

export const deleteStockRequestItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockRequestItem(Number(id));
  res.json({ 
    status: 'success', 
    message: 'Stock request item deleted', 
    data: result 
  });
};

// ---- STOCK ANALYSIS ----

export const generateStockAnalysis = async (req: Request, res: Response) => {
  // Get all stock items with their current stock levels
  const items = await nrwStockModel.getStockItems();
  const cards = await nrwStockModel.getStockCards();
  
  // Create a map of item_id to stock card
  const cardsByItemId = (cards as any[]).reduce((acc: any, card: any) => {
    acc[card.item_id] = card;
    return acc;
  }, {});
  
  // Enrich items with stock card data
  const analysis = (items as any[]).map((item: any) => {
    const card = cardsByItemId[item.id];
    return {
      ...item,
      current_stock: card ? card.current_stock : 0,
      min_stock: card ? card.min_stock : 0,
      max_stock: card ? card.max_stock : 0,
      reorder_level: card ? card.reorder_level : 0,
      status: card && card.current_stock <= card.reorder_level ? 'LOW' : 'OK'
    };
  });
  
  res.json({ 
    status: 'success', 
    message: 'Stock analysis generated', 
    data: analysis 
  });
};
