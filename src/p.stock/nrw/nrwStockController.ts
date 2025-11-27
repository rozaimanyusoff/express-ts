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
  const manufacturerIds = [...new Set((purchases as any[]).map((p: any) => p.manufacturer_id).filter(Boolean))];
  const manufacturers = await nrwStockModel.getManufacturersByIds(manufacturerIds);
  const manufacturersById = (manufacturers as any[]).reduce((acc: any, s: any) => {
    acc[s.id] = s;
    return acc;
  }, {});

  const enrichedPurchases = (purchases as any[]).map((p: any) => ({
    ...p,
    items: itemsByPurchase[p.id] || [],
    manufacturer: manufacturersById[p.manufacturer_id] || null
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

  // Get manufacturer
  const manufacturer = (purchase as any).manufacturer_id
    ? await nrwStockModel.getManufacturerById((purchase as any).manufacturer_id)
    : null;

  res.json({
    status: 'success',
    message: 'Stock purchase retrieved',
    data: {
      ...purchase,
      items,
      manufacturer
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
  const items = await nrwStockModel.getStocks();
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

/* ========= MANUFACTURERS/SUPPLIERS ======== */

export const createManufacturer = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createManufacturer(data);
  res.status(201).json({
    status: 'success',
    message: 'Manufacturer created',
    data: result
  });
};

export const getManufacturers = async (req: Request, res: Response) => {
  const manufacturers = await nrwStockModel.getManufacturers();
  res.json({
    status: 'success',
    message: 'Manufacturers retrieved',
    data: manufacturers
  });
};

export const getManufacturerById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const manufacturer = await nrwStockModel.getManufacturerById(Number(id));

  if (!manufacturer) {
    return res.status(404).json({
      status: 'error',
      message: 'Manufacturer not found',
      data: null
    });
  }

  res.json({
    status: 'success',
    message: 'Manufacturer retrieved',
    data: manufacturer
  });
};

// get manufacturers by ids
export const getManufacturersByIds = async (req: Request, res: Response) => {
  const { ids } = req.body; // expecting { ids: number[] }
  const manufacturers = await nrwStockModel.getManufacturersByIds(ids);
  res.json({
    status: 'success',
    message: 'Manufacturers retrieved',
    data: manufacturers
  });
};

export const updateManufacturer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateManufacturer(Number(id), data);
  res.json({
    status: 'success',
    message: 'Manufacturer updated',
    data: result
  });
};

export const deleteManufacturer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteManufacturer(Number(id));
  res.json({
    status: 'success',
    message: 'Manufacturer deleted',
    data: result
  });
};



/* ======= ITEMS ======== */

export const getItemById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const item = await nrwStockModel.getItemById(Number(id));

  if (!item) {
    return res.status(404).json({
      status: 'error',
      message: 'Item not found',
      data: null
    });
  }

  // Enrich with manufacturer data
  const manufacturer = (item as any).mfg_id
    ? await nrwStockModel.getManufacturerById((item as any).mfg_id)
    : null;

  // Parse and enrich supplier_ids
  const supplierIdsStr = (item as any).supplier_ids || '';
  const supplierIds = supplierIdsStr
    .split(',')
    .map((id: string) => Number(id.trim()))
    .filter((id: number) => !isNaN(id) && id > 0);
  const suppliersRaw = supplierIds.length > 0
    ? await nrwStockModel.getSuppliersByIds(supplierIds)
    : [];
  const suppliers = (suppliersRaw as any[]).map((s: any) => ({ 
    id: s.id, 
    name: s.name || s.supplier_name || s.companyName || s.company_name || '' 
  }));

  // Parse and enrich size_ids
  const sizeIdsStr = (item as any).size_ids || '';
  const sizeIds = sizeIdsStr
    .split(',')
    .map((id: string) => Number(id.trim()))
    .filter((id: number) => !isNaN(id) && id > 0);
  const sizesRaw = sizeIds.length > 0
    ? await nrwStockModel.getSizesByIds(sizeIds)
    : [];
  const sizes = (sizesRaw as any[]).map((s: any) => ({ 
    id: s.id, 
    name: s.name || s.size || s.size_name || s.description || '' 
  }));

  // Remove mfg_id and manufacturer.status
  const { mfg_id, supplier_ids, size_ids, ...itemWithoutMfgId } = item as any;
  const manufacturerData = manufacturer ? (() => {
    const { status, ...mfgWithoutStatus } = manufacturer as any;
    return mfgWithoutStatus;
  })() : null;

  res.json({
    status: 'success',
    message: 'Item retrieved',
    data: {
      ...itemWithoutMfgId,
      manufacturer: manufacturerData,
      suppliers,
      sizes
    }
  });
};

export const getItemsByIds = async (req: Request, res: Response) => {
  const { ids } = req.body; // expecting { ids: number[] }
  const items = await nrwStockModel.getItemsByIds(ids);
  
  // Enrich with manufacturer data
  const mfgIds = [...new Set((items as any[]).map((item: any) => item.mfg_id).filter(Boolean))];
  const manufacturers = await nrwStockModel.getManufacturersByIds(mfgIds);
  const manufacturersById = (manufacturers as any[]).reduce((acc: any, mfg: any) => {
    const { status, ...mfgWithoutStatus } = mfg;
    acc[mfg.id] = mfgWithoutStatus;
    return acc;
  }, {});

  // Collect all supplier and size IDs
  const allSupplierIds = new Set<number>();
  const allSizeIds = new Set<number>();
  
  (items as any[]).forEach((item: any) => {
    const supplierIdsStr = item.supplier_ids || '';
    supplierIdsStr.split(',').forEach((id: string) => {
      const numId = Number(id.trim());
      if (!isNaN(numId) && numId > 0) allSupplierIds.add(numId);
    });
    
    const sizeIdsStr = item.size_ids || '';
    sizeIdsStr.split(',').forEach((id: string) => {
      const numId = Number(id.trim());
      if (!isNaN(numId) && numId > 0) allSizeIds.add(numId);
    });
  });

  // Fetch suppliers and sizes
  const suppliers = allSupplierIds.size > 0
    ? await nrwStockModel.getSuppliersByIds([...allSupplierIds])
    : [];
  const suppliersById = (suppliers as any[]).reduce((acc: any, supplier: any) => {
    acc[supplier.id] = { 
      id: supplier.id, 
      name: supplier.name || supplier.supplier_name || supplier.companyName || supplier.company_name || '' 
    };
    return acc;
  }, {});

  const sizes = allSizeIds.size > 0
    ? await nrwStockModel.getSizesByIds([...allSizeIds])
    : [];
  const sizesById = (sizes as any[]).reduce((acc: any, size: any) => {
    acc[size.id] = { 
      id: size.id, 
      name: size.name || size.size || size.size_name || size.description || '' 
    };
    return acc;
  }, {});
  
  const enrichedItems = (items as any[]).map((item: any) => {
    const { mfg_id, supplier_ids, size_ids, ...itemWithoutMfgId } = item;
    
    // Parse supplier IDs and map to supplier objects
    const itemSupplierIds = (supplier_ids || '')
      .split(',')
      .map((id: string) => Number(id.trim()))
      .filter((id: number) => !isNaN(id) && id > 0);
    const itemSuppliers = itemSupplierIds
      .map((id: number) => suppliersById[id])
      .filter(Boolean);

    // Parse size IDs and map to size objects
    const itemSizeIds = (size_ids || '')
      .split(',')
      .map((id: string) => Number(id.trim()))
      .filter((id: number) => !isNaN(id) && id > 0);
    const itemSizes = itemSizeIds
      .map((id: number) => sizesById[id])
      .filter(Boolean);

    return {
      ...itemWithoutMfgId,
      manufacturer: manufacturersById[item.mfg_id] || null,
      suppliers: itemSuppliers,
      sizes: itemSizes
    };
  });
  
  res.json({
    status: 'success',
    message: 'Items retrieved',
    data: enrichedItems
  });
};

export const getItems = async (req: Request, res: Response) => {
  const items = await nrwStockModel.getItems();
  
  // Enrich with manufacturer data
  const mfgIds = [...new Set((items as any[]).map((item: any) => item.mfg_id).filter(Boolean))];
  const manufacturers = await nrwStockModel.getManufacturersByIds(mfgIds);
  const manufacturersById = (manufacturers as any[]).reduce((acc: any, mfg: any) => {
    const { status, ...mfgWithoutStatus } = mfg;
    acc[mfg.id] = mfgWithoutStatus;
    return acc;
  }, {});

  // Collect all supplier and size IDs
  const allSupplierIds = new Set<number>();
  const allSizeIds = new Set<number>();
  
  (items as any[]).forEach((item: any) => {
    const supplierIdsStr = item.supplier_ids || '';
    supplierIdsStr.split(',').forEach((id: string) => {
      const numId = Number(id.trim());
      if (!isNaN(numId) && numId > 0) allSupplierIds.add(numId);
    });
    
    const sizeIdsStr = item.size_ids || '';
    sizeIdsStr.split(',').forEach((id: string) => {
      const numId = Number(id.trim());
      if (!isNaN(numId) && numId > 0) allSizeIds.add(numId);
    });
  });

  // Fetch suppliers and sizes
  const suppliers = allSupplierIds.size > 0
    ? await nrwStockModel.getSuppliersByIds([...allSupplierIds])
    : [];
  const suppliersById = (suppliers as any[]).reduce((acc: any, supplier: any) => {
    acc[supplier.id] = { 
      id: supplier.id, 
      name: supplier.name || supplier.supplier_name || supplier.companyName || supplier.company_name || '' 
    };
    return acc;
  }, {});

  const sizes = allSizeIds.size > 0
    ? await nrwStockModel.getSizesByIds([...allSizeIds])
    : [];
  const sizesById = (sizes as any[]).reduce((acc: any, size: any) => {
    acc[size.id] = { 
      id: size.id, 
      name: size.name || size.size || size.size_name || size.description || '' 
    };
    return acc;
  }, {});
  
  const enrichedItems = (items as any[]).map((item: any) => {
    const { mfg_id, supplier_ids, size_ids, ...itemWithoutMfgId } = item;
    
    // Parse supplier IDs and map to supplier objects
    const itemSupplierIds = (supplier_ids || '')
      .split(',')
      .map((id: string) => Number(id.trim()))
      .filter((id: number) => !isNaN(id) && id > 0);
    const itemSuppliers = itemSupplierIds
      .map((id: number) => suppliersById[id])
      .filter(Boolean);

    // Parse size IDs and map to size objects
    const itemSizeIds = (size_ids || '')
      .split(',')
      .map((id: string) => Number(id.trim()))
      .filter((id: number) => !isNaN(id) && id > 0);
    const itemSizes = itemSizeIds
      .map((id: number) => sizesById[id])
      .filter(Boolean);

    return {
      ...itemWithoutMfgId,
      manufacturer: manufacturersById[item.mfg_id] || null,
      suppliers: itemSuppliers,
      sizes: itemSizes
    };
  });
  
  res.json({
    status: 'success',
    message: 'Items retrieved',
    data: enrichedItems
  });
};

export const createItem = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createItem(data);
  res.status(201).json({
    status: 'success',
    message: 'Item created',
    data: result
  });
};

export const updateItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateItem(Number(id), data);
  res.json({
    status: 'success',
    message: 'Item updated',
    data: result
  });
};

export const deleteItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteItem(Number(id));
  res.json({
    status: 'success',
    message: 'Item deleted',
    data: result
  });
};


/* ======= FIXED ASSETS ======= */

export const createStock = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStock(data);
  res.status(201).json({
    status: 'success',
    message: 'Stock item created',
    data: result
  });
};

export const getStocks = async (req: Request, res: Response) => {
  const items = await nrwStockModel.getStocks();
  res.json({
    status: 'success',
    message: 'Stock items retrieved',
    data: items
  });
};

export const getStockById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const item = await nrwStockModel.getStockById(Number(id));

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

export const getStockTransactions = async (req: Request, res: Response) => {
  const { id } = req.params;
  const transactions = await nrwStockModel.getStockTransactionsByItemId(Number(id));
  res.json({
    status: 'success',
    message: 'Stock transactions retrieved',
    data: transactions
  });
};

export const getStockInStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const stockCard = await nrwStockModel.getStockCardByItemId(Number(id));
  res.json({
    status: 'success',
    message: 'Stock in-stock retrieved',
    data: stockCard
  });
};

export const updateStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStock(Number(id), data);
  res.json({
    status: 'success',
    message: 'Stock updated',
    data: result
  });
};

export const deleteStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStock(Number(id));
  res.json({
    status: 'success',
    message: 'Stock deleted',
    data: result
  });
};

/* ========= SUPPLIERS ========= */
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

// get suppliers by ids
export const getSuppliersByIds = async (req: Request, res: Response) => {
  const { ids } = req.body; // expecting { ids: number[] }
  const suppliers = await nrwStockModel.getSuppliersByIds(ids);
  res.json({
    status: 'success',
    message: 'Suppliers retrieved',
    data: suppliers
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


/* ======= SIZES ======= */
export const getSizes = async (req: Request, res: Response) => {
  const sizes = await nrwStockModel.getSizes();
  res.json({
    status: 'success',
    message: 'Item sizes retrieved',
    data: sizes
  });
};

export const getSizeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const size = await nrwStockModel.getSizeById(Number(id));

  if (!size) {
    return res.status(404).json({
      status: 'error',
      message: 'Item size not found',
      data: null
    });
  }

  res.json({
    status: 'success',
    message: 'Item size retrieved',
    data: size
  });
};

export const createSize = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createSize(data);
  res.status(201).json({
    status: 'success',
    message: 'Item size created',
    data: result
  });
};

export const updateSize = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateSize(Number(id), data);
  res.json({
    status: 'success',
    message: 'Item size updated',
    data: result
  });
};

export const deleteSize = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteSize(Number(id));
  res.json({
    status: 'success',
    message: 'Item size deleted',
    data: result
  });
};
