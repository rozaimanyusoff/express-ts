import { Request, Response, NextFunction } from 'express';
import * as stockModel from './stockModel';
import { generateStockAnalysis } from './generateStockAnalysis';

export const createStockPurchase = async (req: Request, res: Response) => {
  const result = await stockModel.createStockPurchase(req.body);
  res.status(201).json({
    status: 'success',
    message: 'Stock purchase created successfully',
    data: result
  });
};

export const getStockPurchases = async (req: Request, res: Response) => {
  const rows = await stockModel.getStockPurchases();
  const purchaseList = Array.isArray(rows) ? rows : [];
  let items: any[] = [];
  let suppliers: Record<number, any> = {};

  if (purchaseList.length > 0) {
    const purchaseIds = purchaseList.map((p: any) => p.id);
    const supplierIds = purchaseList.map((p: any) => p.supplier_id).filter((id) => id);

    const itemRows = await stockModel.getStockPurchaseItemsForPurchases(purchaseIds);
    items = Array.isArray(itemRows) ? itemRows : [];

    const supplierRows = await stockModel.getSuppliersByIds(supplierIds);
    const supplierArray = Array.isArray(supplierRows) ? supplierRows : [];
    suppliers = supplierArray.reduce((acc: Record<number, any>, supplier: any) => {
      acc[supplier.id] = { id: supplier.id, name: supplier.name };
      return acc;
    }, {});
  }

  const itemsByPurchase: Record<number, any[]> = {};
  for (const item of items) {
    if (!itemsByPurchase[item.purchase_id]) itemsByPurchase[item.purchase_id] = [];
    itemsByPurchase[item.purchase_id].push(item);
  }

  const data = purchaseList.map((purchase: any) => ({
    ...purchase,
    supplier: suppliers[purchase.supplier_id] || null,
    items: itemsByPurchase[purchase.id] || []
  }));

  // Remove supplier_id from each purchase object
  const formattedData = data.map(({ supplier_id, ...rest }) => rest);

  res.json({
    status: 'success',
    message: 'Stock purchases retrieved successfully',
    data: formattedData
  });
};

export const getStockPurchaseById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const row = await stockModel.getStockPurchaseById(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({
    status: 'success',
    message: 'Stock purchase retrieved successfully',
    data: row
  });
};

export const updateStockPurchase = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.updateStockPurchase(id, req.body);
  res.json({
    status: 'success',
    message: 'Stock purchase updated successfully',
    data: result
  });
};

export const deleteStockPurchase = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.deleteStockPurchase(id);
  res.json(result);
};

export const createStockPurchaseItem = async (req: Request, res: Response) => {
  const result = await stockModel.createStockPurchaseItem(req.body);
  res.status(201).json(result);
};

export const getStockPurchaseItems = async (req: Request, res: Response) => {
  const purchase_id = Number(req.params.purchase_id);
  if (isNaN(purchase_id)) return res.status(400).json({ error: 'Invalid purchase_id' });
  const rows = await stockModel.getStockPurchaseItems(purchase_id);
  res.json(rows);
};

export const getStockPurchaseItemById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const row = await stockModel.getStockPurchaseItemById(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
};

export const updateStockPurchaseItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.updateStockPurchaseItem(id, req.body);
  res.json(result);
};

export const deleteStockPurchaseItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.deleteStockPurchaseItem(id);
  res.json(result);
};

// ---- SUPPLIERS ----
export const createSupplier = async (req: Request, res: Response) => {
  const result = await stockModel.createSupplier(req.body);
  res.status(201).json({ status: 'success', message: 'Supplier created', data: result });
};
export const getSuppliers = async (_req: Request, res: Response) => {
  const data = await stockModel.getSuppliers();
  res.json({ status: 'success', message: 'Suppliers retrieved', data });
};
export const getSupplierById = async (req: Request, res: Response) => {
  const data = await stockModel.getSupplierById(Number(req.params.id));
  res.json({ status: 'success', message: 'Supplier retrieved', data });
};
export const updateSupplier = async (req: Request, res: Response) => {
  const result = await stockModel.updateSupplier(Number(req.params.id), req.body);
  res.json({ status: 'success', message: 'Supplier updated', data: result });
};
export const deleteSupplier = async (req: Request, res: Response) => {
  const result = await stockModel.deleteSupplier(Number(req.params.id));
  res.json({ status: 'success', message: 'Supplier deleted', data: result });
};

// ---- TEAM ----
export const createTeam = async (req: Request, res: Response) => {
  const result = await stockModel.createTeam(req.body);
  res.status(201).json({ status: 'success', message: 'Team created', data: result });
};
export const getTeams = async (_req: Request, res: Response) => {
  const data = await stockModel.getTeams();
  res.json({ status: 'success', message: 'Teams retrieved', data });
};
export const getTeamById = async (req: Request, res: Response) => {
  const data = await stockModel.getTeamById(Number(req.params.id));
  res.json({ status: 'success', message: 'Team retrieved', data });
};
export const updateTeam = async (req: Request, res: Response) => {
  const result = await stockModel.updateTeam(Number(req.params.id), req.body);
  res.json({ status: 'success', message: 'Team updated', data: result });
};
export const deleteTeam = async (req: Request, res: Response) => {
  const result = await stockModel.deleteTeam(Number(req.params.id));
  res.json({ status: 'success', message: 'Team deleted', data: result });
};

// ---- STOCK ITEMS ----
export const createStockItem = async (req: Request, res: Response) => {
  const result = await stockModel.createStockItem(req.body);
  res.status(201).json({ status: 'success', message: 'Stock item created', data: result });
};
export const getStockItems = async (_req: Request, res: Response) => {
  const items = await stockModel.getStockItems();
  const cards = await stockModel.getStockCards();
  // Map stock card by item_id for quick lookup
  const cardMap = Array.isArray(cards)
    ? cards.reduce((acc: any, card: any) => {
        acc[card.item_id] = card;
        return acc;
      }, {})
    : {};

  const data = Array.isArray(items)
    ? items.map((item: any) => ({
        ...item,
        total_in: cardMap[item.id]?.total_in ?? null,
        total_out: cardMap[item.id]?.total_out ?? null,
        balance: cardMap[item.id]?.balance ?? null,
      }))
    : [];

  res.json({ status: 'success', message: 'Stock items retrieved', data });
};

export const getStockItemById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await stockModel.getStockItemById(id);
  if (!item) return res.status(404).json({ status: 'error', message: 'Stock item not found' });

  // Get stock card for this item
  const cards = await stockModel.getStockCardByItemId(id);
  // cards may be array or single object depending on model, normalize to array
  const card = Array.isArray(cards) ? cards[0] : cards;

  // Type guard to check if card has total_in, total_out, and balance
  function hasCardFields(obj: any): obj is { total_in: number; total_out: number; balance: number } {
    return obj && typeof obj.total_in === 'number' && typeof obj.total_out === 'number' && typeof obj.balance === 'number';
  }

  const data = {
    ...item,
    total_in: hasCardFields(card) ? card.total_in : null,
    total_out: hasCardFields(card) ? card.total_out : null,
    balance: hasCardFields(card) ? card.balance : null,
  };

  res.json({ status: 'success', message: 'Stock item retrieved', data });
};

// ---- STOCK CARD ----
export const getStockCards = async (_req: Request, res: Response) => {
  const cards = await stockModel.getStockCards();
  const items = await stockModel.getStockItems();
  // Build a map for quick lookup
  const itemMap = Array.isArray(items)
    ? items.reduce((acc: any, item: any) => {
        acc[item.id] = item;
        return acc;
      }, {})
    : {};

  // Attach item_code and item_name to each card
  const data = Array.isArray(cards)
    ? cards.map((card: any) => ({
        ...card,
        item_code: itemMap[card.item_id]?.item_code || null,
        item_name: itemMap[card.item_id]?.item_name || null,
      }))
    : [];

  res.json({ status: 'success', message: 'Stock cards retrieved', data });
};

export const getStockCardByItemId = async (req: Request, res: Response) => {
  const itemId = Number(req.params.id);
  if (isNaN(itemId)) return res.status(400).json({ error: 'Invalid item_id' });
  const cards = await stockModel.getStockCardByItemId(itemId);
  const items = await stockModel.getStockItems();
  const item = Array.isArray(items) ? items.find((i: any) => i.id === itemId) : null;

  // Type guard to check if item has item_code and item_name
  function hasItemCodeAndName(obj: any): obj is { item_code: string; item_name: string } {
    return obj && typeof obj.item_code === 'string' && typeof obj.item_name === 'string';
  }

  // cards may be array or single object depending on model, normalize to array
  const cardArray = Array.isArray(cards) ? cards : (cards ? [cards] : []);
  const data = cardArray.map((card: any) => ({
    ...card,
    item_code: hasItemCodeAndName(item) ? item.item_code : null,
    item_name: hasItemCodeAndName(item) ? item.item_name : null,
  }));

  res.json({ status: 'success', message: 'Stock card(s) retrieved', data });
};

export const createStockCard = async (req: Request, res: Response) => {
  const result = await stockModel.createStockCard(req.body);
  res.status(201).json({ status: 'success', message: 'Stock card created', data: result });
};

export const updateStockCard = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.updateStockCard(id, req.body);
  res.json({ status: 'success', message: 'Stock card updated', data: result });
};

export const deleteStockCard = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.deleteStockCard(id);
  res.json({ status: 'success', message: 'Stock card deleted', data: result });
};

// ---- ADDITIONAL STOCK ITEM FUNCTIONS ----
export const updateStockItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.updateStockItem(id, req.body);
  res.json({ status: 'success', message: 'Stock item updated', data: result });
};

export const deleteStockItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.deleteStockItem(id);
  res.json({ status: 'success', message: 'Stock item deleted', data: result });
};

// ---- STOCK TRACKING ----
function isRowDataPacketArray(arr: any): arr is Array<{ id: number }> {
  return Array.isArray(arr) && arr.length > 0 && typeof arr[0].id !== 'undefined';
}
function isRowDataPacket(obj: any): obj is { id: number } {
  return obj && typeof obj.id !== 'undefined';
}
function isSupplier(obj: any): obj is { id: number; name: string } {
  return obj && typeof obj.id !== 'undefined' && typeof obj.name === 'string';
}
function isUser(obj: any): obj is { id: number; fname?: string; username?: string } {
  return obj && typeof obj.id !== 'undefined' && (typeof obj.fname === 'string' || typeof obj.username === 'string');
}

export const createStockTracking = async (req: Request, res: Response) => {
  const result = await stockModel.createStockTracking(req.body);
  res.status(201).json({ status: 'success', message: 'Stock tracking created', data: result });
};

export const getStockTrackings = async (_req: Request, res: Response) => {
  const rows = await stockModel.getStockTrackings();
  const trackings = Array.isArray(rows) ? rows : [];

  // Collect all referenced IDs
  const itemIds = trackings.map((t: any) => t.item_id).filter(Boolean);
  const purchaseIds = trackings.map((t: any) => t.purchase_id).filter(Boolean);
  const issueToIds = trackings.map((t: any) => t.issue_to).filter(Boolean);
  const registeredByIds = trackings.map((t: any) => t.registered_by).filter(Boolean);
  const updatedByIds = trackings.map((t: any) => t.updated_by).filter(Boolean);

  // Fetch all related data in batch
  const [allItems, allPurchases, allUsers, allTeams] = await Promise.all([
    itemIds.length ? stockModel.getStockItems() : [],
    purchaseIds.length ? stockModel.getStockPurchases() : [],
    (issueToIds.length || registeredByIds.length || updatedByIds.length)
      ? require('../../p.user/userModel').getAllUsers() : [],
    stockModel.getTeams()
  ]);
  const items = isRowDataPacketArray(allItems) ? allItems : [];
  const purchases = isRowDataPacketArray(allPurchases) ? allPurchases : [];
  const users = isRowDataPacketArray(allUsers) ? allUsers : [];
  const teams = isRowDataPacketArray(allTeams) ? allTeams : [];

  // Build lookup maps
  const itemMap = new Map(items.map((i: any) => [i.id, i]));
  const purchaseMap = new Map(purchases.map((p: any) => [p.id, p]));
  const userMap = new Map(users.map((u: any) => [u.id, u]));
  const teamMap = new Map(teams.map((t: any) => [t.id, t]));

  // For suppliers, batch fetch from all purchase supplier_ids
  const supplierIds = Array.from(new Set(purchases.map((p: any) => p.supplier_id).filter(Boolean)));
  let suppliers: any[] = [];
  if (supplierIds.length) {
    const s = await stockModel.getSuppliersByIds(supplierIds);
    suppliers = isRowDataPacketArray(s) ? s : [];
  }
  const supplierMap = new Map(suppliers.map((s: any) => [s.id, s]));

  // Map to nested structure
  const data = trackings.map((t: any) => {
    const item = t.item_id ? itemMap.get(t.item_id) : null;
    const purchase = t.purchase_id ? purchaseMap.get(t.purchase_id) : null;
    const supplier = purchase && purchase.supplier_id ? supplierMap.get(purchase.supplier_id) : null;
    // issue_to: try user first, then team
    let issueTo = null;
    if (t.issue_to) {
      const asNum = Number(t.issue_to);
      if (!isNaN(asNum) && teamMap.has(asNum)) {
        const team = teamMap.get(asNum);
        issueTo = team ? { id: team.id, name: team.name } : null;
      } else if (!isNaN(asNum) && userMap.has(asNum)) {
        const user = userMap.get(asNum);
        issueTo = user ? { id: user.id, name: user.fname || user.username } : null;
      }
    }
    const registeredBy = t.registered_by ? userMap.get(Number(t.registered_by)) : null;
    const updatedBy = t.updated_by ? userMap.get(Number(t.updated_by)) : null;
    return {
      id: t.id,
      items: item ? { id: item.id, item_code: item.item_code, item_name: item.item_name } : null,
      procurement: purchase
        ? {
            id: purchase.id,
            po_no: purchase.po_no,
            po_date: purchase.po_date,
            supplier: isSupplier(supplier) ? { id: supplier.id, name: supplier.name } : null,
            delivery_date: purchase.delivery_date || purchase.do_date || null
          }
        : null,
      serial_no: t.serial_no,
      store: t.store,
      status: t.status,
      issuance: {
        issue_date: t.issue_date,
        issue_no: t.issue_no,
        issue_to: issueTo
          ? isUser(issueTo)
            ? { id: issueTo.id, name: (issueTo.fname ? issueTo.fname : (issueTo.username ? issueTo.username : '')) }
            : { id: issueTo.id, name: issueTo.name }
          : null,
        installed_location: t.installed_location || ''
      },
      registered_by: registeredBy ? (registeredBy.fname || registeredBy.username) : '',
      updated_by: updatedBy ? (updatedBy.fname || updatedBy.username) : null,
      created_at: t.created_at,
      updated_at: t.updated_at
    };
  });

  res.json({ status: 'success', message: 'Stock trackings retrieved', data });
};

export const getStockTrackingById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const t = await stockModel.getStockTrackingById(id);
  if (!t) return res.status(404).json({ status: 'error', message: 'Stock tracking not found' });

  // Fetch related entities for this record
  const [item, purchase, allUsers, allTeams] = await Promise.all([
    t.item_id ? stockModel.getStockItemById(t.item_id) : null,
    t.purchase_id ? stockModel.getStockPurchaseById(t.purchase_id) : null,
    (t.issue_to || t.registered_by || t.updated_by)
      ? require('../../p.user/userModel').getAllUsers() : [],
    stockModel.getTeams()
  ]);
  const users = isRowDataPacketArray(allUsers) ? allUsers : [];
  const teams = isRowDataPacketArray(allTeams) ? allTeams : [];

  let supplier = null;
  if (purchase && purchase.supplier_id) {
    const s = await stockModel.getSuppliersByIds([purchase.supplier_id]);
    supplier = isRowDataPacketArray(s) && s.length ? s[0] : null;
  }
  const userMap = new Map(users.map((u: any) => [u.id, u]));
  const teamMap = new Map(teams.map((t: any) => [t.id, t]));
  // issue_to: try user first, then team
  let issueTo = null;
  if (t.issue_to) {
    const asNum = Number(t.issue_to);
    if (!isNaN(asNum) && teamMap.has(asNum)) {
      const team = teamMap.get(asNum);
      issueTo = team ? { id: team.id, name: team.name } : null;
    } else if (!isNaN(asNum) && userMap.has(asNum)) {
      const user = userMap.get(asNum);
      issueTo = user ? { id: user.id, name: user.fname || user.username } : null;
    }
  }
  const registeredBy = t.registered_by ? userMap.get(Number(t.registered_by)) : null;
  const updatedBy = t.updated_by ? userMap.get(Number(t.updated_by)) : null;

  const data = {
    id: t.id,
    items: item ? { id: item.id, item_code: item.item_code, item_name: item.item_name } : null,
    procurement: purchase
      ? {
          id: purchase.id,
          po_no: purchase.po_no,
          po_date: purchase.po_date,
          supplier: isSupplier(supplier) ? { id: supplier.id, name: supplier.name } : null,
          delivery_date: purchase.delivery_date || purchase.do_date || null
        }
      : null,
    serial_no: t.serial_no,
    store: t.store,
    status: t.status,
    issuance: {
      issue_date: t.issue_date,
      issue_no: t.issue_no,
      issue_to: issueTo
        ? isUser(issueTo)
          ? { id: issueTo.id, name: (issueTo.fname ? issueTo.fname : (issueTo.username ? issueTo.username : '')) }
          : { id: issueTo.id, name: issueTo.name }
        : null,
      installed_location: t.installed_location || ''
    },
    registered_by: registeredBy ? (registeredBy.fname || registeredBy.username) : '',
    updated_by: updatedBy ? (updatedBy.fname || updatedBy.username) : null,
    created_at: t.created_at,
    updated_at: t.updated_at
  };

  res.json({ status: 'success', message: 'Stock tracking retrieved', data });
};

export const updateStockTracking = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  await stockModel.updateStockTracking(id, req.body);
  // Return the updated record in nested format
  const t = await stockModel.getStockTrackingById(id);
  if (!t) return res.status(404).json({ status: 'error', message: 'Stock tracking not found' });

  // Fetch related entities for this record
  const [item, purchase, allUsers, allTeams] = await Promise.all([
    t.item_id ? stockModel.getStockItemById(t.item_id) : null,
    t.purchase_id ? stockModel.getStockPurchaseById(t.purchase_id) : null,
    (t.issue_to || t.registered_by || t.updated_by)
      ? require('../../p.user/userModel').getAllUsers() : [],
    stockModel.getTeams()
  ]);
  const users = Array.isArray(allUsers) ? allUsers : [];
  const teams = Array.isArray(allTeams) ? allTeams : [];

  let supplier = null;
  if (purchase && purchase.supplier_id) {
    const s = await stockModel.getSuppliersByIds([purchase.supplier_id]);
    supplier = Array.isArray(s) && s.length ? s[0] : null;
  }
  const userMap = new Map(users.filter(u => u && u.id).map((u: any) => [u.id, u]));
  const teamMap = new Map(teams.map((t: any) => [t.id, t]));
  // issue_to: try user first, then team
  let issueTo = null;
  if (t.issue_to) {
    const asNum = Number(t.issue_to);
    if (!isNaN(asNum) && teamMap.has(asNum)) {
      const team = teamMap.get(asNum);
      issueTo = team ? { id: team.id, name: team.name } : null;
    } else if (!isNaN(asNum) && userMap.has(asNum)) {
      const user = userMap.get(asNum);
      issueTo = user ? { id: user.id, name: user.fname || user.username } : null;
    }
  }
  const registeredBy = t.registered_by ? userMap.get(Number(t.registered_by)) : null;
  const updatedBy = t.updated_by ? userMap.get(Number(t.updated_by)) : null;

  function isSupplier(obj: any): obj is { id: number; name: string } {
    return obj && typeof obj.id !== 'undefined' && typeof obj.name === 'string';
  }

  const data = {
    id: t.id,
    items: item ? { id: item.id, item_code: item.item_code, item_name: item.item_name } : null,
    procurement: purchase
      ? {
          id: purchase.id,
          po_no: purchase.po_no,
          po_date: purchase.po_date,
          supplier: isSupplier(supplier) ? { id: supplier.id, name: supplier.name } : null,
          delivery_date: purchase.delivery_date || purchase.do_date || null
        }
      : null,
    serial_no: t.serial_no,
    store: t.store,
    status: t.status,
    issuance: {
      issue_date: t.issue_date,
      issue_no: t.issue_no,
      issue_to: issueTo
        ? isUser(issueTo)
          ? { id: issueTo.id, name: (issueTo.fname ? issueTo.fname : (issueTo.username ? issueTo.username : '')) }
          : { id: issueTo.id, name: issueTo.name }
        : null,
      installed_location: t.installed_location || ''
    },
    registered_by: registeredBy ? (registeredBy.fname || registeredBy.username) : '',
    updated_by: updatedBy ? (updatedBy.fname || updatedBy.username) : null,
    created_at: t.created_at,
    updated_at: t.updated_at
  };

  res.json({ status: 'success', message: 'Stock tracking updated', data });
};

export const deleteStockTracking = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  await stockModel.deleteStockTracking(id);
  res.json({ status: 'success', message: 'Stock tracking deleted' });
};

// ---- STOCK ANALYSIS ----
export const getStockAnalysis = async (_req: Request, res: Response) => {
  // Get all stock tracking data in nested format (reuse getStockTrackings logic)
  const rows = await stockModel.getStockTrackings();
  const trackings = Array.isArray(rows) ? rows : [];

  // Collect all referenced IDs
  const itemIds = trackings.map((t: any) => t.item_id).filter(Boolean);
  const purchaseIds = trackings.map((t: any) => t.purchase_id).filter(Boolean);
  const issueToIds = trackings.map((t: any) => t.issue_to).filter(Boolean);
  const registeredByIds = trackings.map((t: any) => t.registered_by).filter(Boolean);
  const updatedByIds = trackings.map((t: any) => t.updated_by).filter(Boolean);

  // Fetch all related data in batch
  const [allItems, allPurchases, allUsers, allTeams] = await Promise.all([
    itemIds.length ? stockModel.getStockItems() : [],
    purchaseIds.length ? stockModel.getStockPurchases() : [],
    (issueToIds.length || registeredByIds.length || updatedByIds.length)
      ? require('../../p.user/userModel').getAllUsers() : [],
    stockModel.getTeams()
  ]);
  const items = Array.isArray(allItems) ? allItems : [];
  const purchases = Array.isArray(allPurchases) ? allPurchases : [];
  const users = Array.isArray(allUsers) ? allUsers : [];
  const teams = Array.isArray(allTeams) ? allTeams : [];

  // Build lookup maps
  const itemMap = new Map(items.map((i: any) => [i.id, i]));
  const purchaseMap = new Map(purchases.map((p: any) => [p.id, p]));
  const userMap = new Map(users.map((u: any) => [u.id, u]));
  const teamMap = new Map(teams.map((t: any) => [t.id, t]));

  // For suppliers, batch fetch from all purchase supplier_ids
  const supplierIds = Array.from(new Set(purchases.map((p: any) => p.supplier_id).filter(Boolean)));
  let suppliers: any[] = [];
  if (supplierIds.length) {
    const s = await stockModel.getSuppliersByIds(supplierIds);
    suppliers = Array.isArray(s) ? s : [];
  }
  const supplierMap = new Map(suppliers.map((s: any) => [s.id, s]));

  // Map to minimal structure for analysis utility
  const analysisData = trackings.map((t: any) => {
    const item = t.item_id ? itemMap.get(t.item_id) : null;
    // issue_to: try user first, then team
    let issueTo: { id: number; name: string } | undefined = undefined;
    if (t.issue_to) {
      const asNum = Number(t.issue_to);
      if (!isNaN(asNum) && teamMap.has(asNum)) {
        const team = teamMap.get(asNum);
        issueTo = team ? { id: team.id, name: team.name } : undefined;
      } else if (!isNaN(asNum) && userMap.has(asNum)) {
        const user = userMap.get(asNum);
        issueTo = user ? { id: user.id, name: user.fname || user.username } : undefined;
      }
    }
    return {
      items: item ? { item_code: item.item_code, item_name: item.item_name } : { item_code: '', item_name: '' },
      status: t.status,
      issuance: {
        issue_to: issueTo
      }
    };
  });

  // Generate analysis from minimal data
  const analysis = generateStockAnalysis(analysisData);
  res.json({ status: 'success', message: 'Stock analysis generated', analysis });
};
