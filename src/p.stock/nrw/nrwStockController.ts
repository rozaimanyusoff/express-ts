import { Request, Response } from 'express';

import * as nrwEmployeeModel from './nrwEmployeeModel';
import * as nrwStockModel from './nrwStockModel';

// ---- TEAM ----

export const createTeam = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createTeam(data);
  res.status(201).json({
    data: result,
    message: 'Team created',
    status: 'success'
  });
};

export const getTeams = async (req: Request, res: Response) => {
  const teams = await nrwStockModel.getTeams();
  res.json({
    data: teams,
    message: 'Teams retrieved',
    status: 'success'
  });
};

export const getTeamById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const team = await nrwStockModel.getTeamById(Number(id));

  if (!team) {
    return res.status(404).json({
      data: null,
      message: 'Team not found',
      status: 'error'
    });
  }

  res.json({
    data: team,
    message: 'Team retrieved',
    status: 'success'
  });
};

export const updateTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateTeam(Number(id), data);
  res.json({
    data: result,
    message: 'Team updated',
    status: 'success'
  });
};

export const deleteTeam = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteTeam(Number(id));
  res.json({
    data: result,
    message: 'Team deleted',
    status: 'success'
  });
};




// ---- STOCK CARD ----

export const createStockCard = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockCard(data);
  
  // Enrich with item data
  const item = await nrwStockModel.getItemById((result as any).item_id);
  const { item_id, ...cardWithoutItemId } = result as any;
  const enrichedResult = {
    ...cardWithoutItemId,
    item: item ? { id: (item as any).id, name: (item as any).name } : null
  };
  
  res.status(201).json({
    data: enrichedResult,
    message: 'Stock card created',
    status: 'success'
  });
};

export const getStockCards = async (req: Request, res: Response) => {
  const cards = await nrwStockModel.getStockCards();
  
  // Get all unique item IDs from cards
  const itemIds = [...new Set((cards as any[]).map((card: any) => card.item_id).filter(Boolean))];
  
  // Fetch item details
  const items = itemIds.length > 0
    ? await nrwStockModel.getItemsByIds(itemIds)
    : [];
  const itemsById = (items as any[]).reduce((acc: any, item: any) => {
    acc[item.id] = { id: item.id, name: item.name };
    return acc;
  }, {});

  // Enrich cards with item data and remove item_id
  const enrichedCards = (cards as any[]).map((card: any) => {
    const { item_id, ...cardWithoutItemId } = card;
    return {
      ...cardWithoutItemId,
      item: itemsById[card.item_id] || null
    };
  });

  res.json({
    data: enrichedCards,
    message: 'Stock cards retrieved',
    status: 'success'
  });
};

export const updateStockCard = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockCard(Number(id), data);
  
  // Fetch the card by id to get updated data
  const cards = await nrwStockModel.getStockCards();
  const updatedCard = (cards as any[]).find((card: any) => card.id === Number(id));
  
  if (updatedCard) {
    const item = await nrwStockModel.getItemById((updatedCard).item_id);
    const { item_id, ...cardWithoutItemId } = updatedCard;
    const enrichedResult = {
      ...cardWithoutItemId,
      item: item ? { id: (item as any).id, name: (item as any).name } : null
    };
    
    res.json({
      data: enrichedResult,
      message: 'Stock card updated',
      status: 'success'
    });
  } else {
    res.json({
      data: result,
      message: 'Stock card updated',
      status: 'success'
    });
  }
};

export const deleteStockCard = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockCard(Number(id));
  res.json({
    data: result,
    message: 'Stock card deleted',
    status: 'success'
  });
};

export const getStockCardByItemId = async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const card = await nrwStockModel.getStockCardByItemId(Number(itemId));
  
  if (card) {
    const item = await nrwStockModel.getItemById(Number(itemId));
    const { item_id, ...cardWithoutItemId } = card as any;
    const enrichedCard = {
      ...cardWithoutItemId,
      item: item ? { id: (item as any).id, name: (item as any).name } : null
    };
    res.json({
      data: enrichedCard,
      message: 'Stock card retrieved',
      status: 'success'
    });
  } else {
    res.json({
      data: null,
      message: 'No stock card found',
      status: 'success'
    });
  }
};

export const getStockCardsWithItems = async (req: Request, res: Response) => {
  const cards = await nrwStockModel.getStockCards();
  
  // Get all unique item IDs from cards
  const itemIds = [...new Set((cards as any[]).map((card: any) => card.item_id).filter(Boolean))];
  
  // Fetch item details
  const items = itemIds.length > 0
    ? await nrwStockModel.getItemsByIds(itemIds)
    : [];
  const itemsById = (items as any[]).reduce((acc: any, item: any) => {
    acc[item.id] = { id: item.id, name: item.name };
    return acc;
  }, {});

  // Enrich cards with item data and remove item_id
  const enrichedCards = (cards as any[]).map((card: any) => {
    const { item_id, ...cardWithoutItemId } = card;
    return {
      ...cardWithoutItemId,
      item: itemsById[card.item_id] || null
    };
  });

  res.json({
    data: enrichedCards,
    message: 'Stock cards with items retrieved',
    status: 'success'
  });
};

// ---- STOCK TRACKING ----

export const createStockTracking = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockTracking(data);
  res.status(201).json({
    data: result,
    message: 'Stock tracking created',
    status: 'success'
  });
};

export const getStockTrackings = async (req: Request, res: Response) => {
  const trackings = await nrwStockModel.getStockTrackings();
  res.json({
    data: trackings,
    message: 'Stock trackings retrieved',
    status: 'success'
  });
};

export const getStockTrackingById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tracking = await nrwStockModel.getStockTrackingById(Number(id));

  if (!tracking) {
    return res.status(404).json({
      data: null,
      message: 'Stock tracking not found',
      status: 'error'
    });
  }

  res.json({
    data: tracking,
    message: 'Stock tracking retrieved',
    status: 'success'
  });
};

export const updateStockTracking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockTracking(Number(id), data);
  res.json({
    data: result,
    message: 'Stock tracking updated',
    status: 'success'
  });
};

export const deleteStockTracking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockTracking(Number(id));
  res.json({
    data: result,
    message: 'Stock tracking deleted',
    status: 'success'
  });
};

// ---- STOCK REQUEST ----

export const createStockRequest = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockRequest(data);
  res.status(201).json({
    data: result,
    message: 'Stock request created',
    status: 'success'
  });
};

export const getStockRequests = async (req: Request, res: Response) => {
  const requests = await nrwStockModel.getStockRequests();
  res.json({
    data: requests,
    message: 'Stock requests retrieved',
    status: 'success'
  });
};

export const getStockRequestById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const request = await nrwStockModel.getStockRequestById(Number(id));

  if (!request) {
    return res.status(404).json({
      data: null,
      message: 'Stock request not found',
      status: 'error'
    });
  }

  res.json({
    data: request,
    message: 'Stock request retrieved',
    status: 'success'
  });
};

export const updateStockRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockRequest(Number(id), data);
  res.json({
    data: result,
    message: 'Stock request updated',
    status: 'success'
  });
};

export const deleteStockRequest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockRequest(Number(id));
  res.json({
    data: result,
    message: 'Stock request deleted',
    status: 'success'
  });
};

// ---- STOCK REQUEST ITEMS ----

export const addStockRequestItem = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.addStockRequestItem(data);
  res.status(201).json({
    data: result,
    message: 'Stock request item added',
    status: 'success'
  });
};

export const getStockRequestItems = async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const items = await nrwStockModel.getStockRequestItems(Number(requestId));
  res.json({
    data: items,
    message: 'Stock request items retrieved',
    status: 'success'
  });
};

export const updateStockRequestItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockRequestItem(Number(id), data);
  res.json({
    data: result,
    message: 'Stock request item updated',
    status: 'success'
  });
};

export const deleteStockRequestItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockRequestItem(Number(id));
  res.json({
    data: result,
    message: 'Stock request item deleted',
    status: 'success'
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
      max_stock: card ? card.max_stock : 0,
      min_stock: card ? card.min_stock : 0,
      reorder_level: card ? card.reorder_level : 0,
      status: card && card.current_stock <= card.reorder_level ? 'LOW' : 'OK'
    };
  });

  res.json({
    data: analysis,
    message: 'Stock analysis generated',
    status: 'success'
  });
};





// ---- STOCK PURCHASE ITEMS ----

export const createStockPurchaseItem = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockPurchaseItem(data);
  res.status(201).json({
    data: result,
    message: 'Stock purchase item created',
    status: 'success'
  });
};

export const getStockPurchaseItems = async (req: Request, res: Response) => {
  const { purchaseId } = req.params;
  const items = await nrwStockModel.getStockPurchaseItems(Number(purchaseId));
  res.json({
    data: items,
    message: 'Stock purchase items retrieved',
    status: 'success'
  });
};

export const updateStockPurchaseItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockPurchaseItem(Number(id), data);
  res.json({
    data: result,
    message: 'Stock purchase item updated',
    status: 'success'
  });
};

export const deleteStockPurchaseItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockPurchaseItem(Number(id));
  res.json({
    data: result,
    message: 'Stock purchase item deleted',
    status: 'success'
  });
};

/* ========= MANUFACTURERS/SUPPLIERS ======== */

export const createManufacturer = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createManufacturer(data);
  res.status(201).json({
    data: result,
    message: 'Manufacturer created',
    status: 'success'
  });
};

export const getManufacturers = async (req: Request, res: Response) => {
  const manufacturers = await nrwStockModel.getManufacturers();
  res.json({
    data: manufacturers,
    message: 'Manufacturers retrieved',
    status: 'success'
  });
};

export const getManufacturerById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const manufacturer = await nrwStockModel.getManufacturerById(Number(id));

  if (!manufacturer) {
    return res.status(404).json({
      data: null,
      message: 'Manufacturer not found',
      status: 'error'
    });
  }

  res.json({
    data: manufacturer,
    message: 'Manufacturer retrieved',
    status: 'success'
  });
};

// get manufacturers by ids
export const getManufacturersByIds = async (req: Request, res: Response) => {
  const { ids } = req.body; // expecting { ids: number[] }
  const manufacturers = await nrwStockModel.getManufacturersByIds(ids);
  res.json({
    data: manufacturers,
    message: 'Manufacturers retrieved',
    status: 'success'
  });
};

export const updateManufacturer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateManufacturer(Number(id), data);
  res.json({
    data: result,
    message: 'Manufacturer updated',
    status: 'success'
  });
};

export const deleteManufacturer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteManufacturer(Number(id));
  res.json({
    data: result,
    message: 'Manufacturer deleted',
    status: 'success'
  });
};



/* ======= ITEMS ======== */

export const getItemById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const item = await nrwStockModel.getItemById(Number(id));

  if (!item) {
    return res.status(404).json({
      data: null,
      message: 'Item not found',
      status: 'error'
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
  const { mfg_id, size_ids, supplier_ids, ...itemWithoutMfgId } = item as any;
  const manufacturerData = manufacturer ? (() => {
    const { status, ...mfgWithoutStatus } = manufacturer as any;
    return mfgWithoutStatus;
  })() : null;

  res.json({
    data: {
      ...itemWithoutMfgId,
      manufacturer: manufacturerData,
      sizes,
      suppliers
    },
    message: 'Item retrieved',
    status: 'success'
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

  // Fetch stock cards to get stock balances
  const stockCards = await Promise.all(
    (items as any[]).map((item: any) => nrwStockModel.getStockCardByItemId(item.id))
  );
  const stockBalanceById = (stockCards as any[]).reduce((acc: any, card: any, index: number) => {
    if (card) {
      acc[(items as any[])[index].id] = card.stock_bal || 0;
    } else {
      acc[(items as any[])[index].id] = 0;
    }
    return acc;
  }, {});
  
  const enrichedItems = (items as any[]).map((item: any) => {
    const { mfg_id, size_ids, supplier_ids, ...itemWithoutMfgId } = item;
    
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
      sizes: itemSizes,
      stock_bal: stockBalanceById[item.id] || 0,
      suppliers: itemSuppliers
    };
  });
  
  res.json({
    data: enrichedItems,
    message: 'Items retrieved',
    status: 'success'
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

  // Fetch stock cards to get stock balances
  const itemIds = (items as any[]).map((item: any) => item.id);
  const stockCards = await Promise.all(
    itemIds.map((itemId: number) => nrwStockModel.getStockCardByItemId(itemId))
  );
  const stockBalanceById = (stockCards as any[]).reduce((acc: any, card: any, index: number) => {
    if (card) {
      acc[itemIds[index]] = card.stock_bal || 0;
    } else {
      acc[itemIds[index]] = 0;
    }
    return acc;
  }, {});
  
  const enrichedItems = (items as any[]).map((item: any) => {
    const { mfg_id, size_ids, supplier_ids, ...itemWithoutMfgId } = item;
    
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
      sizes: itemSizes,
      stock_bal: stockBalanceById[item.id] || 0,
      suppliers: itemSuppliers
    };
  });
  
  res.json({
    data: enrichedItems,
    message: 'Items retrieved',
    status: 'success'
  });
};

export const createItem = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createItem(data);
  res.status(201).json({
    data: result,
    message: 'Item created',
    status: 'success'
  });
};

export const updateItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateItem(Number(id), data);
  res.json({
    data: result,
    message: 'Item updated',
    status: 'success'
  });
};

export const deleteItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteItem(Number(id));
  res.json({
    data: result,
    message: 'Item deleted',
    status: 'success'
  });
};


/* ======= FIXED ASSETS ======= */

export const createStock = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStock(data);
  res.status(201).json({
    data: result,
    message: 'Stock item created',
    status: 'success'
  });
};

export const getStocks = async (req: Request, res: Response) => {
  const items = await nrwStockModel.getStocks();
  res.json({
    data: items,
    message: 'Stock items retrieved',
    status: 'success'
  });
};

export const getStockById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const item = await nrwStockModel.getStockById(Number(id));

  if (!item) {
    return res.status(404).json({
      data: null,
      message: 'Stock item not found',
      status: 'error'
    });
  }

  res.json({
    data: item,
    message: 'Stock item retrieved',
    status: 'success'
  });
};

export const getStockInStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const stockCard = await nrwStockModel.getStockCardByItemId(Number(id));
  res.json({
    data: stockCard,
    message: 'Stock in-stock retrieved',
    status: 'success'
  });
};

export const updateStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStock(Number(id), data);
  res.json({
    data: result,
    message: 'Stock updated',
    status: 'success'
  });
};

export const deleteStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStock(Number(id));
  res.json({
    data: result,
    message: 'Stock deleted',
    status: 'success'
  });
};

/* ========= SUPPLIERS ========= */
export const createSupplier = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createSupplier(data);
  res.status(201).json({
    data: result,
    message: 'Supplier created',
    status: 'success'
  });
};

export const getSuppliers = async (req: Request, res: Response) => {
  const suppliers = await nrwStockModel.getSuppliers();
  res.json({
    data: suppliers,
    message: 'Suppliers retrieved',
    status: 'success'
  });
};

export const getSupplierById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const supplier = await nrwStockModel.getSupplierById(Number(id));

  if (!supplier) {
    return res.status(404).json({
      data: null,
      message: 'Supplier not found',
      status: 'error'
    });
  }

  res.json({
    data: supplier,
    message: 'Supplier retrieved',
    status: 'success'
  });
};

// get suppliers by ids
export const getSuppliersByIds = async (req: Request, res: Response) => {
  const { ids } = req.body; // expecting { ids: number[] }
  const suppliers = await nrwStockModel.getSuppliersByIds(ids);
  res.json({
    data: suppliers,
    message: 'Suppliers retrieved',
    status: 'success'
  });
};

export const updateSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateSupplier(Number(id), data);
  res.json({
    data: result,
    message: 'Supplier updated',
    status: 'success'
  });
};

export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteSupplier(Number(id));
  res.json({
    data: result,
    message: 'Supplier deleted',
    status: 'success'
  });
};


/* ======= SIZES ======= */
export const getSizes = async (req: Request, res: Response) => {
  const sizes = await nrwStockModel.getSizes();
  res.json({
    data: sizes,
    message: 'Item sizes retrieved',
    status: 'success'
  });
};

export const getSizeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const size = await nrwStockModel.getSizeById(Number(id));

  if (!size) {
    return res.status(404).json({
      data: null,
      message: 'Item size not found',
      status: 'error'
    });
  }

  res.json({
    data: size,
    message: 'Item size retrieved',
    status: 'success'
  });
};

export const createSize = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createSize(data);
  res.status(201).json({
    data: result,
    message: 'Item size created',
    status: 'success'
  });
};

export const updateSize = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateSize(Number(id), data);
  res.json({
    data: result,
    message: 'Item size updated',
    status: 'success'
  });
};

export const deleteSize = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteSize(Number(id));
  res.json({
    data: result,
    message: 'Item size deleted',
    status: 'success'
  });
};

// ---- STOCK PURCHASES (Enhanced) ----
export const createStockPurchase = async (req: Request, res: Response) => {
  const { items, purchase } = req.body;
  
  if (!purchase || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      data: null,
      message: 'Purchase data and items array are required',
      status: 'error'
    });
  }

  const result = await nrwStockModel.createStockPurchase(purchase, items);
  res.status(201).json({
    data: result,
    message: 'Stock purchase with items created',
    status: 'success'
  });
};

export const getStockPurchases = async (req: Request, res: Response) => {
  const purchases = await nrwStockModel.getStockPurchases();
  
  // Fetch related data (departments, users, costcenters)
  const departmentIds = new Set<number>();
  const userIds = new Set<number>();
  const costcenterIds = new Set<number>();

  (purchases as any[]).forEach((purchase: any) => {
    if (purchase.department_id) departmentIds.add(purchase.department_id);
    if (purchase.requested_by) userIds.add(purchase.requested_by);
    if (purchase.authorized_by) userIds.add(purchase.authorized_by);
    if (purchase.costcenter_id) costcenterIds.add(purchase.costcenter_id);
  });

  const [deptData, users, costcenters] = await Promise.all([
    departmentIds.size > 0 ? nrwEmployeeModel.getDepartmentsByIds(Array.from(departmentIds)) : [],
    userIds.size > 0 ? nrwEmployeeModel.getEmployeesByIds(Array.from(userIds)) : [],
    costcenterIds.size > 0 ? nrwEmployeeModel.getCostcentersByIds(Array.from(costcenterIds)) : []
  ]);

  const departmentsById = (deptData as any[]).reduce((acc: any, dept: any) => {
    acc[dept.id] = { id: dept.id, name: dept.name };
    return acc;
  }, {});

  const usersById = (users as any[]).reduce((acc: any, user: any) => {
    acc[user.id] = { id: user.id, name: user.full_name || user.name };
    return acc;
  }, {});

  const costcentersById = (costcenters as any[]).reduce((acc: any, cc: any) => {
    acc[cc.id] = { id: cc.id, name: cc.name };
    return acc;
  }, {});

  const enrichedPurchases = (purchases as any[]).map((purchase: any) => {
    const { authorized_by, costcenter_id, department_id, requested_by, ...rest } = purchase;
    return {
      ...rest,
      authorizedByUser: purchase.authorized_by ? usersById[purchase.authorized_by] || null : null,
      costcenter: costcentersById[purchase.costcenter_id] || null,
      department: departmentsById[purchase.department_id] || null,
      requestedByUser: usersById[purchase.requested_by] || null
    };
  });

  res.json({
    data: enrichedPurchases,
    message: 'Stock purchases retrieved',
    status: 'success'
  });
};

export const getStockPurchaseById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const purchase = await nrwStockModel.getStockPurchaseById(Number(id));

  if (!purchase) {
    return res.status(404).json({
      data: null,
      message: 'Purchase not found',
      status: 'error'
    });
  }

  // Enrich with related data
  const itemIds = new Set<number>();
  const userIds = new Set<number>();
  const departmentIds = new Set<number>();
  const supplierIds = new Set<number>();
  const costcenterIds = new Set<number>();

  departmentIds.add(purchase.department_id);
  userIds.add(purchase.requested_by);
  if (purchase.authorized_by) userIds.add(purchase.authorized_by);
  if (purchase.costcenter_id) costcenterIds.add(purchase.costcenter_id);

  if (purchase.items && Array.isArray(purchase.items)) {
    purchase.items.forEach((item: any) => {
      if (item.item_id) itemIds.add(item.item_id);
      if (item.preferred_supplier_id) supplierIds.add(item.preferred_supplier_id);
    });
  }

  const [deptData, users, stockItems, suppliers, costcenters] = await Promise.all([
    departmentIds.size > 0 ? nrwEmployeeModel.getDepartmentsByIds(Array.from(departmentIds)) : [],
    userIds.size > 0 ? nrwEmployeeModel.getEmployeesByIds(Array.from(userIds)) : [],
    itemIds.size > 0 ? nrwStockModel.getItemsByIds(Array.from(itemIds)) : [],
    supplierIds.size > 0 ? nrwStockModel.getSuppliersByIds(Array.from(supplierIds)) : [],
    costcenterIds.size > 0 ? nrwEmployeeModel.getCostcentersByIds(Array.from(costcenterIds)) : []
  ]);

  const departmentsById = (deptData as any[]).reduce((acc: any, dept: any) => {
    acc[dept.id] = { id: dept.id, name: dept.name };
    return acc;
  }, {});

  const usersById = (users as any[]).reduce((acc: any, user: any) => {
    acc[user.id] = { id: user.id, name: user.full_name || user.name };
    return acc;
  }, {});

  const itemsById = (stockItems as any[]).reduce((acc: any, item: any) => {
    acc[item.id] = { id: item.id, name: item.name };
    return acc;
  }, {});

  const suppliersById = (suppliers as any[]).reduce((acc: any, sup: any) => {
    acc[sup.id] = { id: sup.id, name: sup.name || sup.supplier_name || sup.companyName || '' };
    return acc;
  }, {});

  const costcentersById = (costcenters as any[]).reduce((acc: any, cc: any) => {
    acc[cc.id] = { id: cc.id, name: cc.name };
    return acc;
  }, {});

  const { authorized_by, costcenter_id, department_id, requested_by, ...purchaseRest } = purchase;
  const enrichedPurchase = {
    ...purchaseRest,
    authorizedByUser: purchase.authorized_by ? usersById[purchase.authorized_by] || null : null,
    costcenter: costcentersById[purchase.costcenter_id] || null,
    department: departmentsById[purchase.department_id] || null,
    items: (purchase.items || []).map((item: any) => {
      const { item_id, preferred_supplier_id, ...itemRest } = item;
      return {
        ...itemRest,
        item: itemsById[item.item_id] || null,
        preferredSupplier: suppliersById[item.preferred_supplier_id] || null
      };
    }),
    requestedByUser: usersById[purchase.requested_by] || null
  };

  res.json({
    data: enrichedPurchase,
    message: 'Stock purchase retrieved',
    status: 'success'
  });
};

export const updateStockPurchase = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockPurchase(Number(id), data);
  res.json({
    data: result,
    message: 'Stock purchase updated',
    status: 'success'
  });
};

export const deleteStockPurchase = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockPurchase(Number(id));
  res.json({
    data: result,
    message: 'Stock purchase deleted',
    status: 'success'
  });
};

// ---- STOCK TRANSACTIONS ----
export const createStockTransaction = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwStockModel.createStockTransaction(data);
  res.status(201).json({
    data: result,
    message: 'Stock transaction created',
    status: 'success'
  });
};

export const getStockTransactions = async (req: Request, res: Response) => {
  const transactions = await nrwStockModel.getStockTransactions();
  res.json({
    data: transactions,
    message: 'Stock transactions retrieved',
    status: 'success'
  });
};

export const getStockTransactionById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const transaction = await nrwStockModel.getStockTransactionById(Number(id));
  res.json({
    data: transaction,
    message: 'Stock transaction retrieved',
    status: 'success'
  });
};

export const getStockTransactionsByItemId = async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const transactions = await nrwStockModel.getStockTransactionsByItemId(Number(itemId));
  res.json({
    data: transactions,
    message: 'Stock transactions retrieved',
    status: 'success'
  });
};

export const updateStockTransaction = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwStockModel.updateStockTransaction(Number(id), data);
  res.json({
    data: result,
    message: 'Stock transaction updated',
    status: 'success'
  });
};

export const deleteStockTransaction = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwStockModel.deleteStockTransaction(Number(id));
  res.json({
    data: result,
    message: 'Stock transaction deleted',
    status: 'success'
  });
};