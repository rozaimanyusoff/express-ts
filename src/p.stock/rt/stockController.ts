import { NextFunction, Request, Response } from 'express';

import { generateStockAnalysis } from './generateStockAnalysis';
import * as stockModel from './stockModel';

export const createStockPurchase = async (req: Request, res: Response) => {
  const result = await stockModel.createStockPurchase(req.body);
  res.status(201).json({
    data: result,
    message: 'Stock purchase created successfully',
    status: 'success'
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
    items: itemsByPurchase[purchase.id] || [],
    supplier: suppliers[purchase.supplier_id] || null
  }));

  // Remove supplier_id from each purchase object
  const formattedData = data.map(({ supplier_id, ...rest }) => rest);

  res.json({
    data: formattedData,
    message: 'Stock purchases retrieved successfully',
    status: 'success'
  });
};

export const getStockPurchaseById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const row = await stockModel.getStockPurchaseById(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({
    data: row,
    message: 'Stock purchase retrieved successfully',
    status: 'success'
  });
};

export const updateStockPurchase = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.updateStockPurchase(id, req.body);
  res.json({
    data: result,
    message: 'Stock purchase updated successfully',
    status: 'success'
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
  res.status(201).json({ data: result, message: 'Supplier created', status: 'success' });
};
export const getSuppliers = async (_req: Request, res: Response) => {
  const data = await stockModel.getSuppliers();
  res.json({ data, message: 'Suppliers retrieved', status: 'success' });
};
export const getSupplierById = async (req: Request, res: Response) => {
  const data = await stockModel.getSupplierById(Number(req.params.id));
  res.json({ data, message: 'Supplier retrieved', status: 'success' });
};
export const updateSupplier = async (req: Request, res: Response) => {
  const result = await stockModel.updateSupplier(Number(req.params.id), req.body);
  res.json({ data: result, message: 'Supplier updated', status: 'success' });
};
export const deleteSupplier = async (req: Request, res: Response) => {
  const result = await stockModel.deleteSupplier(Number(req.params.id));
  res.json({ data: result, message: 'Supplier deleted', status: 'success' });
};

// ---- TEAM ----
export const createTeam = async (req: Request, res: Response) => {
  const result = await stockModel.createTeam(req.body);
  res.status(201).json({ data: result, message: 'Team created', status: 'success' });
};
export const getTeams = async (_req: Request, res: Response) => {
  const data = await stockModel.getTeams();
  res.json({ data, message: 'Teams retrieved', status: 'success' });
};
export const getTeamById = async (req: Request, res: Response) => {
  const data = await stockModel.getTeamById(Number(req.params.id));
  res.json({ data, message: 'Team retrieved', status: 'success' });
};
export const updateTeam = async (req: Request, res: Response) => {
  const result = await stockModel.updateTeam(Number(req.params.id), req.body);
  res.json({ data: result, message: 'Team updated', status: 'success' });
};
export const deleteTeam = async (req: Request, res: Response) => {
  const result = await stockModel.deleteTeam(Number(req.params.id));
  res.json({ data: result, message: 'Team deleted', status: 'success' });
};

// ---- STOCK ITEMS ----
export const createStockItem = async (req: Request, res: Response) => {
  const result = await stockModel.createStockItem(req.body);
  res.status(201).json({ data: result, message: 'Stock item created', status: 'success' });
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
        balance: cardMap[item.id]?.balance ?? null,
        total_in: cardMap[item.id]?.total_in ?? null,
        total_out: cardMap[item.id]?.total_out ?? null,
      }))
    : [];

  res.json({ data, message: 'Stock items retrieved', status: 'success' });
};

export const getStockItemById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = await stockModel.getStockItemById(id);
  if (!item) return res.status(404).json({ message: 'Stock item not found', status: 'error' });

  // Get stock card for this item
  const cards = await stockModel.getStockCardByItemId(id);
  // cards may be array or single object depending on model, normalize to array
  const card = Array.isArray(cards) ? cards[0] : cards;

  // Type guard to check if card has total_in, total_out, and balance
  function hasCardFields(obj: any): obj is { balance: number; total_in: number; total_out: number; } {
    return obj && typeof obj.total_in === 'number' && typeof obj.total_out === 'number' && typeof obj.balance === 'number';
  }

  const data = {
    ...item,
    balance: hasCardFields(card) ? card.balance : null,
    total_in: hasCardFields(card) ? card.total_in : null,
    total_out: hasCardFields(card) ? card.total_out : null,
  };

  res.json({ data, message: 'Stock item retrieved', status: 'success' });
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

  res.json({ data, message: 'Stock cards retrieved', status: 'success' });
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

  res.json({ data, message: 'Stock card(s) retrieved', status: 'success' });
};

export const createStockCard = async (req: Request, res: Response) => {
  const result = await stockModel.createStockCard(req.body);
  res.status(201).json({ data: result, message: 'Stock card created', status: 'success' });
};

export const updateStockCard = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.updateStockCard(id, req.body);
  res.json({ data: result, message: 'Stock card updated', status: 'success' });
};

export const deleteStockCard = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.deleteStockCard(id);
  res.json({ data: result, message: 'Stock card deleted', status: 'success' });
};

// ---- ADDITIONAL STOCK ITEM FUNCTIONS ----
export const updateStockItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.updateStockItem(id, req.body);
  res.json({ data: result, message: 'Stock item updated', status: 'success' });
};

export const deleteStockItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const result = await stockModel.deleteStockItem(id);
  res.json({ data: result, message: 'Stock item deleted', status: 'success' });
};

function isRowDataPacket(obj: any): obj is { id: number } {
  return obj && typeof obj.id !== 'undefined';
}
// ---- STOCK TRACKING ----
function isRowDataPacketArray(arr: any): arr is { id: number }[] {
  return Array.isArray(arr) && arr.length > 0 && typeof arr[0].id !== 'undefined';
}
function isSupplier(obj: any): obj is { id: number; name: string } {
  return obj && typeof obj.id !== 'undefined' && typeof obj.name === 'string';
}
function isUser(obj: any): obj is { fname?: string; id: number; username?: string } {
  return obj && typeof obj.id !== 'undefined' && (typeof obj.fname === 'string' || typeof obj.username === 'string');
}

export const createStockTracking = async (req: Request, res: Response) => {
  const result = await stockModel.createStockTracking(req.body);
  res.status(201).json({ data: result, message: 'Stock tracking created', status: 'success' });
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
    const supplier = purchase?.supplier_id ? supplierMap.get(purchase.supplier_id) : null;
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
      created_at: t.created_at,
      id: t.id,
      issuance: {
        installed_location: t.installed_location || '',
        issue_date: t.issue_date,
        issue_no: t.issue_no,
        issue_to: issueTo
          ? isUser(issueTo)
            ? { id: issueTo.id, name: (issueTo.fname ? issueTo.fname : (issueTo.username ? issueTo.username : '')) }
            : { id: issueTo.id, name: issueTo.name }
          : null
      },
      items: item ? { id: item.id, item_code: item.item_code, item_name: item.item_name } : null,
      procurement: purchase
        ? {
            delivery_date: purchase.delivery_date || purchase.do_date || null,
            id: purchase.id,
            po_date: purchase.po_date,
            po_no: purchase.po_no,
            supplier: isSupplier(supplier) ? { id: supplier.id, name: supplier.name } : null
          }
        : null,
      registered_by: registeredBy ? (registeredBy.fname || registeredBy.username) : '',
      serial_no: t.serial_no,
      status: t.status,
      store: t.store,
      updated_at: t.updated_at,
      updated_by: updatedBy ? (updatedBy.fname || updatedBy.username) : null
    };
  });

  res.json({ data, message: 'Stock trackings retrieved', status: 'success' });
};

export const getStockTrackingById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const t = await stockModel.getStockTrackingById(id);
  if (!t) return res.status(404).json({ message: 'Stock tracking not found', status: 'error' });

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
  if (purchase?.supplier_id) {
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
    created_at: t.created_at,
    id: t.id,
    issuance: {
      installed_location: t.installed_location || '',
      issue_date: t.issue_date,
      issue_no: t.issue_no,
      issue_to: issueTo
        ? isUser(issueTo)
          ? { id: issueTo.id, name: (issueTo.fname ? issueTo.fname : (issueTo.username ? issueTo.username : '')) }
          : { id: issueTo.id, name: issueTo.name }
        : null
    },
    items: item ? { id: item.id, item_code: item.item_code, item_name: item.item_name } : null,
    procurement: purchase
      ? {
          delivery_date: purchase.delivery_date || purchase.do_date || null,
          id: purchase.id,
          po_date: purchase.po_date,
          po_no: purchase.po_no,
          supplier: isSupplier(supplier) ? { id: supplier.id, name: supplier.name } : null
        }
      : null,
    registered_by: registeredBy ? (registeredBy.fname || registeredBy.username) : '',
    serial_no: t.serial_no,
    status: t.status,
    store: t.store,
    updated_at: t.updated_at,
    updated_by: updatedBy ? (updatedBy.fname || updatedBy.username) : null
  };

  res.json({ data, message: 'Stock tracking retrieved', status: 'success' });
};

export const updateStockTracking = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  await stockModel.updateStockTracking(id, req.body);
  // Return the updated record in nested format
  const t = await stockModel.getStockTrackingById(id);
  if (!t) return res.status(404).json({ message: 'Stock tracking not found', status: 'error' });

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
  if (purchase?.supplier_id) {
    const s = await stockModel.getSuppliersByIds([purchase.supplier_id]);
    supplier = Array.isArray(s) && s.length ? s[0] : null;
  }
  const userMap = new Map(users.filter(u => u?.id).map((u: any) => [u.id, u]));
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
    created_at: t.created_at,
    id: t.id,
    issuance: {
      installed_location: t.installed_location || '',
      issue_date: t.issue_date,
      issue_no: t.issue_no,
      issue_to: issueTo
        ? isUser(issueTo)
          ? { id: issueTo.id, name: (issueTo.fname ? issueTo.fname : (issueTo.username ? issueTo.username : '')) }
          : { id: issueTo.id, name: issueTo.name }
        : null
    },
    items: item ? { id: item.id, item_code: item.item_code, item_name: item.item_name } : null,
    procurement: purchase
      ? {
          delivery_date: purchase.delivery_date || purchase.do_date || null,
          id: purchase.id,
          po_date: purchase.po_date,
          po_no: purchase.po_no,
          supplier: isSupplier(supplier) ? { id: supplier.id, name: supplier.name } : null
        }
      : null,
    registered_by: registeredBy ? (registeredBy.fname || registeredBy.username) : '',
    serial_no: t.serial_no,
    status: t.status,
    store: t.store,
    updated_at: t.updated_at,
    updated_by: updatedBy ? (updatedBy.fname || updatedBy.username) : null
  };

  res.json({ data, message: 'Stock tracking updated', status: 'success' });
};

export const deleteStockTracking = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  await stockModel.deleteStockTracking(id);
  res.json({ message: 'Stock tracking deleted', status: 'success' });
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
    let issueTo: undefined | { id: number; name: string } = undefined;
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
      issuance: {
        issue_to: issueTo
      },
      items: item ? { item_code: item.item_code, item_name: item.item_name } : { item_code: '', item_name: '' },
      status: t.status
    };
  });

  // Generate analysis from minimal data
  const analysis = generateStockAnalysis(analysisData);
  res.json({ analysis, message: 'Stock analysis generated', status: 'success' });
};

// ---- STOCK REQUESTS ----
export const createStockRequest = async (req: Request, res: Response) => {
  try {
    const result = await stockModel.createStockRequest(req.body);
    res.status(201).json({
      data: result,
      message: 'Stock request created successfully',
      status: 'success'
    });
  } catch (err: any) {
    res.status(500).json({ data: null, message: err.message || 'Failed to create stock request', status: 'error' });
  }
};

export const getStockRequests = async (_req: Request, res: Response) => {
  try {
    const rows = await stockModel.getStockRequests();
    const requests = Array.isArray(rows) ? rows : [];
    const ids = requests.map((r: any) => r.id);
    let items: any[] = [];
    if (ids.length) {
      const allItems = await Promise.all(ids.map((id: number) => stockModel.getStockRequestById(id)));
      items = allItems.map(r => r?.items ? r.items : []).flat();
    }
    const itemsByRequest: Record<number, any[]> = {};
    for (const item of items) {
      if (!itemsByRequest[item.stock_out_id]) itemsByRequest[item.stock_out_id] = [];
      itemsByRequest[item.stock_out_id].push(item);
    }
    // Collect all unique requested_by IDs
    const requestedByIds = Array.from(new Set(requests.map((r: any) => r.requested_by).filter(Boolean)));
    let teams: any[] = [];
    if (requestedByIds.length) {
      const teamRows = await stockModel.getTeams();
      teams = Array.isArray(teamRows) ? teamRows : [];
    }
    const teamMap = new Map(teams.map((t: any) => [t.id, t]));
    const data = requests.map((r: any) => {
      // Exclude department, team_name, pic
      const { department, pic, team_name, ...rest } = r;
      return {
        ...rest,
        items: itemsByRequest[r.id] || [],
        requested_by: r.requested_by && teamMap.has(r.requested_by)
          ? { id: r.requested_by, name: teamMap.get(r.requested_by).name }
          : null
      };
    });
    res.json({
      data,
      message: 'Stock requests retrieved successfully',
      status: 'success'
    });
  } catch (err: any) {
    res.status(500).json({ data: null, message: err.message || 'Failed to retrieve stock requests', status: 'error' });
  }
};

export const getStockRequestById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
  }
  const row = await stockModel.getStockRequestById(id);
  if (!row) {
    return res.status(404).json({ data: null, message: 'Not found', status: 'error' });
  }
  // Ensure items is always an array
  const data = {
    ...row,
    items: Array.isArray(row.items) ? row.items : []
  };
  res.json({
    data,
    message: 'Stock request retrieved successfully',
    status: 'success'
  });
};

export const updateStockRequest = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
  try {
    const result = await stockModel.updateStockRequest(id, req.body);
    res.json({
      data: result,
      message: 'Stock request updated successfully',
      status: 'success'
    });
  } catch (err: any) {
    res.status(500).json({ data: null, message: err.message || 'Failed to update stock request', status: 'error' });
  }
};

export const deleteStockRequest = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
  try {
    const result = await stockModel.deleteStockRequest(id);
    res.json({
      data: result,
      message: 'Stock request deleted successfully',
      status: 'success'
    });
  } catch (err: any) {
    res.status(500).json({ data: null, message: err.message || 'Failed to delete stock request', status: 'error' });
  }
};

export const addStockRequestItem = async (req: Request, res: Response) => {
  const { stock_out_id, ...item } = req.body;
  try {
    const result = await stockModel.addStockRequestItem(stock_out_id, item);
    res.status(201).json({
      data: result,
      message: 'Stock request item added successfully',
      status: 'success'
    });
  } catch (err: any) {
    res.status(500).json({ data: null, message: err.message || 'Failed to add stock request item', status: 'error' });
  }
};

export const updateStockRequestItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
  try {
    const result = await stockModel.updateStockRequestItem(id, req.body);
    res.json({
      data: result,
      message: 'Stock request item updated successfully',
      status: 'success'
    });
  } catch (err: any) {
    res.status(500).json({ data: null, message: err.message || 'Failed to update stock request item', status: 'error' });
  }
};

export const deleteStockRequestItem = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ data: null, message: 'Invalid id', status: 'error' });
  try {
    const result = await stockModel.deleteStockRequestItem(id);
    res.json({
      data: result,
      message: 'Stock request item deleted successfully',
      status: 'success'
    });
  } catch (err: any) {
    res.status(500).json({ data: null, message: err.message || 'Failed to delete stock request item', status: 'error' });
  }
};

export const getStockTransactionsByItemId = async (req: Request, res: Response) => {
  const itemId = Number(req.params.id);
  if (isNaN(itemId)) return res.status(400).json({ message: 'Invalid item id', status: 'error' });
  const rows = await stockModel.getStockTransactionsByItemId(itemId);
  res.json({
    data: rows,
    message: 'Stock transactions retrieved successfully',
    status: 'success'
  });
};

// Get in-stock data for a given item_id
export const getStockInStockByItemId = async (req: Request, res: Response) => {
  const itemId = Number(req.params.id);
  if (isNaN(itemId)) return res.status(400).json({ message: 'Invalid item id', status: 'error' });
  // Get all stock tracking records for this item_id
  const rows = await stockModel.getStockTransactionsByItemId(itemId);
  // In-stock = status is 'in_stock' (or similar logic, adjust as needed)
  // If you want all records that are currently in stock, filter by status
  const inStockRows = Array.isArray(rows)
    ? rows.filter((row: any) => row.status === 'in_stock' || row.status === 'IN_STOCK' || row.status === 'available')
    : [];
  // Return all in-stock records, including serial_no
  res.json({
    data: inStockRows.map((row: any) => ({
      id: row.id,
      item_id: row.item_id,
      serial_no: row.serial_no,
      status: row.status,
      ...row
    })),
    message: 'In-stock items retrieved successfully',
    status: 'success'
  });
};
