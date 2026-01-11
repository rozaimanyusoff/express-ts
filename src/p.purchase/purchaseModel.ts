import e from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

import * as assetModel from '../p.asset/assetModel';
import { pool, pool2 } from '../utils/db';

// Database table name
const dbName = 'purchases2'; // Replace with your actual database name
const purchaseRequestTable = `${dbName}.purchase_request`;
const purchaseRequestItemTable = `${dbName}.purchase_items`;
const purchaseDeliveryTable = `${dbName}.purchase_delivery`;
const supplierTable = `${dbName}.purchase_supplier`;
const purchaseAssetRegistryTable = `${dbName}.purchase_asset_registry`;
const purchaseAssetRegistryAuditTable = `${dbName}.purchase_asset_registry_audit`;
const purchaseRequestItemsTable = `${dbName}.purchase_request_items`;
// Join table linking purchase_data (pr_id) and purchase_asset_registry (registry_id)
const purchaseRegistryTable = `${dbName}.purchase_registry`;


/* ======= PURCHASE REQUEST (simple CRUD) ======= */
export interface PurchaseRequestRecord {
  costcenter_id: number;
  created_at?: string;
  department_id: number;
  id?: number;
  pr_date: string; // YYYY-MM-DD
  pr_no?: null | string;
  ramco_id: string;
  request_type: string;
  updated_at?: string;
}

export const getPurchaseRequests = async (): Promise<PurchaseRequestRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseRequestTable} ORDER BY pr_date DESC, id DESC`
  );
  return rows as PurchaseRequestRecord[];
};

export const getPurchaseRequestById = async (id: number): Promise<null | PurchaseRequestRecord> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestTable} WHERE id = ?`, [id]);
  const recs = rows as PurchaseRequestRecord[];
  return recs.length > 0 ? recs[0] : null;
};

export const createPurchaseRequest = async (data: Omit<PurchaseRequestRecord, 'created_at' | 'id' | 'updated_at'>): Promise<number> => {
  // Prevent duplicate by PR number + date + requester + costcenter
  if (data.pr_no && data.pr_date && data.ramco_id && data.costcenter_id) {
    const [existing] = await pool.query(
      `SELECT id FROM ${purchaseRequestTable} WHERE pr_no = ? AND pr_date = ? AND ramco_id = ? AND costcenter_id = ? LIMIT 1`,
      [data.pr_no, data.pr_date, data.ramco_id, data.costcenter_id]
    );
    const exArr = Array.isArray(existing) ? existing as any[] : [];
    if (exArr.length > 0) {
      throw new Error('Purchase request already exists for the same PR number/date/requester/costcenter');
    }
  }

  const [result] = await pool.query(
    `INSERT INTO ${purchaseRequestTable} (pr_no, pr_date, request_type, ramco_id, costcenter_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.pr_no, data.pr_date, data.request_type, data.ramco_id, data.costcenter_id]
  );
  return (result as ResultSetHeader).insertId;
};

export const updatePurchaseRequest = async (id: number, data: Partial<Omit<PurchaseRequestRecord, 'created_at' | 'id' | 'updated_at'>>): Promise<void> => {
  const allowed: (keyof PurchaseRequestRecord)[] = ['pr_no', 'pr_date', 'request_type', 'ramco_id', 'costcenter_id'];
  const keys = Object.keys(data).filter(k => allowed.includes(k as any));
  if (!keys.length) return;
  const fields = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (data as any)[k]);
  await pool.query(`UPDATE ${purchaseRequestTable} SET ${fields}, updated_at = NOW() WHERE id = ?`, [...values, id]);
};

export const deletePurchaseRequest = async (id: number): Promise<void> => {
  const [result] = await pool.query(`DELETE FROM ${purchaseRequestTable} WHERE id = ?`, [id]);
  const rr = result as ResultSetHeader;
  if (rr.affectedRows === 0) throw new Error('Purchase request not found');
};

/* ======= PURCHASE RECORDS - TO be removed as replaced by PurchaseRequestItemRecord ======= */
export interface PurchaseRecord {
  brand?: string;
  brand_id?: number;
  costcenter: string;
  costcenter_id?: number;
  created_at?: string;
  handover_at?: string;
  // delivery / invoice fields moved to purchase_delivery table
  // do_date, do_no, inv_date, inv_no, grn_date, grn_no, upload_path removed
  // renamed from released_* to handover_* in schema
  handover_to?: string;
  id?: number;
  item_type?: string;
  items: string;
  pic?: string;
  po_date?: string;
  po_no?: string;
  pr_date?: string;
  pr_no?: string;
  qty: number;
  ramco_id: string;
  request_id?: number;
  request_type: string;
  supplier?: string;
  supplier_id?: number;
  total_price: number;
  type_id?: number;
  unit_price: number;
  updated_at?: string;
  updated_by?: string;
}

/* ======= PURCHASE REQUEST ITEMS -- Procurement Scopes ======= */
export interface PurchaseRequestItemRecord {
  category_id?: null | number;
  costcenter?: string;
  costcenter_id?: number;
  created_at?: string;
  description: string;
  handover_at?: string;
  handover_to?: string;
  id?: number;
  item_type?: string;
  po_date?: string;
  po_no?: string;
  pr_no?: null | string;
  purpose?: null | string;
  qty: number;
  request_id?: number;
  supplier?: string; // supplier name from supplier column
  supplier_id?: number;
  total_price: number;
  type_id: number;
  unit_price: number;
  updated_at?: string;
  upload_path?: string; // keep for PR item attachments (if any)
}


export const getPurchaseRequestItems = async (): Promise<PurchaseRequestItemRecord[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestItemTable} ORDER BY pr_date DESC`);
  return rows as PurchaseRequestItemRecord[];
};

export const getPurchaseRequestItemById = async (id: number): Promise<null | PurchaseRequestItemRecord> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestItemTable} WHERE id = ?`, [id]);
  const purchases = rows as PurchaseRequestItemRecord[];
  return purchases.length > 0 ? purchases[0] : null;
};

export const createPurchaseRequestItem = async (data: Omit<PurchaseRequestItemRecord, 'created_at' | 'id' | 'updated_at'>): Promise<number> => {
  // Check for duplicate based on pr_no if provided
  if ((data as any).pr_no) {
    const [existingRows] = await pool.query(
      `SELECT id FROM ${purchaseRequestItemTable} WHERE pr_no = ?`,
      [data.pr_no]
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      throw new Error(`Purchase record with PR number '${data.pr_no}' already exists`);
    }
  }

  const {
    brand_id,
    category_id,
    costcenter_id,
    description,
    po_date,
    po_no,
    pr_date,
    pr_no,
    qty,
    ramco_id,
    request_id,
    supplier_id,
    total_price,
    type_id,
    unit_price
  } = data as any;

  const [result] = await pool.query(
    `INSERT INTO ${purchaseRequestItemTable} (
      request_id, costcenter_id, ramco_id, type_id, category_id, description, supplier_id, brand_id, qty, unit_price, total_price, pr_date, pr_no, po_date, po_no, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [request_id, costcenter_id, ramco_id, type_id, category_id, description, supplier_id, brand_id, qty, unit_price, total_price, pr_date, pr_no, po_date, po_no]
  );

  return (result as ResultSetHeader).insertId;
};

export const updatePurchaseRequestItem = async (
  id: number,
  data: Partial<Omit<PurchaseRequestItemRecord, 'created_at' | 'id' | 'updated_at'>>
): Promise<void> => {
  // Duplicate PR number check intentionally skipped on update (per request)

  // Filter out undefined or null fields
  const validEntries = Object.entries(data).filter(([_, v]) => v !== undefined && v !== null);
  if (!validEntries.length) return;
  const fields = validEntries.map(([k]) => `${k} = ?`).join(', ');
  const values = validEntries.map(([_, v]) => v);
  await pool.query(
    `UPDATE ${purchaseRequestItemTable} SET ${fields}, updated_at = NOW() WHERE id = ?`,
    [...values, id]
  );
};

export const deletePurchaseRequestItem = async (id: number): Promise<void> => {
  const [result] = await pool.query(`DELETE FROM ${purchaseRequestItemTable} WHERE id = ?`, [id]);
  const deleteResult = result as ResultSetHeader;

  if (deleteResult.affectedRows === 0) {
    throw new Error('Purchase record not found');
  }
};

export const getPurchaseRequestItemByStatus = async (status: string): Promise<PurchaseRecord[]> => {
  let whereClause = '';

  switch (status.toLowerCase()) {
    case 'completed':
      // ensure handover_to is present and not an empty string, and handover_at is a real timestamp
      // guard against MySQL zero-dates like '0000-00-00' or '0000-00-00 00:00:00'
      whereClause = "handover_to IS NOT NULL AND TRIM(handover_to) <> '' AND handover_at IS NOT NULL AND handover_at NOT IN ('0000-00-00', '0000-00-00 00:00:00')";
      break;
    case 'delivered':
      // Consider a purchase delivered when GRN is present but it hasn't been released yet
      // (handover_to empty or handover_at missing/zero-date). Also keep existing DO/INV rule as fallback.
      whereClause = "(grn_no IS NOT NULL AND (handover_to IS NULL OR TRIM(handover_to) = '' OR handover_at IS NULL OR handover_at IN ('0000-00-00', '0000-00-00 00:00:00'))) OR (do_no IS NOT NULL AND inv_no IS NOT NULL)";
      break;
    case 'ordered':
      whereClause = 'po_no IS NOT NULL AND do_no IS NULL';
      break;
    case 'released':
      // require grn_no present and handover_to not null/empty
      whereClause = "grn_no IS NOT NULL AND handover_to IS NOT NULL AND TRIM(handover_to) <> ''";
      break;
    case 'requested':
      whereClause = 'pr_no IS NOT NULL AND po_no IS NULL';
      break;
    default:
      whereClause = '1=1'; // Return all if status not recognized
  }

  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseRequestItemTable} WHERE ${whereClause} ORDER BY id DESC`
  );
  return rows as PurchaseRecord[];
};

export const getPurchaseRequestItemByCostCenter = async (costCenter: string): Promise<PurchaseRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseRequestItemTable} WHERE costcenter = ? ORDER BY id DESC`,
    [costCenter]
  );
  return rows as PurchaseRecord[];
};

export const getPurchaseRequestItemBySupplier = async (supplier: string): Promise<PurchaseRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseRequestItemTable} WHERE supplier LIKE ? ORDER BY id DESC`,
    [`%${supplier}%`]
  );
  return rows as PurchaseRecord[];
};

export const getPurchaseRequestItemByDateRange = async (
  startDate: string,
  endDate: string,
  dateField: 'do_date' | 'grn_date' | 'inv_date' | 'po_date' | 'pr_date' = 'pr_date'
): Promise<PurchaseRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseRequestItemTable} WHERE ${dateField} BETWEEN ? AND ? ORDER BY ${dateField} DESC`,
    [startDate, endDate]
  );
  return rows as PurchaseRecord[];
};

export const getPurchaseRequestItemByRequestId = async (request_id: number): Promise<PurchaseRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseRequestItemTable} WHERE request_id = ? ORDER BY id DESC`,
    [request_id]
  );
  return rows as PurchaseRecord[];
};

export const getPurchaseRequestItemSummary = async (startDate?: string, endDate?: string) => {
  let dateFilter = '';
  const params: any[] = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE pr_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  const [rows] = await pool.query(
    `SELECT 
      COUNT(*) as total_records,
      SUM(total_price) as total_value,
      SUM(CASE WHEN grn_no IS NOT NULL THEN 1 ELSE 0 END) as completed_purchases,
      SUM(CASE WHEN po_no IS NOT NULL AND grn_no IS NULL THEN 1 ELSE 0 END) as pending_purchases,
      COUNT(DISTINCT supplier) as unique_suppliers,
      COUNT(DISTINCT costcenter) as unique_costcenters
    FROM ${purchaseRequestItemTable} ${dateFilter}`,
    params
  );

  return (rows as any[])[0];
};


// Returns the last PR number (by value) on a given pr_date from purchase_data
export const getLastPrNoByDate = async (pr_date: string): Promise<null | string> => {
  try {
    // Try numeric ordering; fallback to lexical if needed
    const [rows] = await pool.query(
      `SELECT pr_no FROM ${purchaseRequestItemTable} WHERE pr_date = ? AND pr_no IS NOT NULL AND TRIM(pr_no) <> ''
      ORDER BY (CASE WHEN pr_no REGEXP '^[0-9]+$' THEN 0 ELSE 1 END), CAST(pr_no AS UNSIGNED) DESC, pr_no DESC LIMIT 1`,
      [pr_date]
    );
    const r = (rows as RowDataPacket[])[0];
    return r ? (r as any).pr_no ?? null : null;
  } catch {
    return null;
  }
};

// Returns last pr_no along with the latest pr_date found in purchase_data
export const getLastPrNoByLatestDate = async (): Promise<{ pr_date: null | string; pr_no: null | string; }> => {
  try {
    const [dateRows] = await pool.query(
      `SELECT pr_date FROM ${purchaseRequestItemTable} WHERE pr_date IS NOT NULL ORDER BY pr_date DESC LIMIT 1`
    );
    const latestRow = (dateRows as RowDataPacket[])[0] as any;
    const latestDate: null | string = latestRow ? (latestRow.pr_date as string) : null;
    if (!latestDate) return { pr_date: null, pr_no: null };
    const pr_no = await getLastPrNoByDate(latestDate);
    return { pr_date: latestDate, pr_no };
  } catch {
    return { pr_date: null, pr_no: null };
  }
};



/* ======= SUPPLIER ======= */
export interface Supplier {
  contact_name: string;
  contact_no: string;
  id: number;
  name: string;
}

export const getSuppliers = async (): Promise<Supplier[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${supplierTable} ORDER BY id DESC`);
  return rows as Supplier[];
};

export const getSupplierById = async (id: number): Promise<null | Supplier> => {
  const [rows] = await pool.query(`SELECT * FROM ${supplierTable} WHERE id = ?`, [id]);
  return (rows as Supplier[])[0] || null;
};

export const getSupplierByName = async (name: string): Promise<null | Supplier> => {
  const [rows] = await pool.query(`SELECT * FROM ${supplierTable} WHERE name = ?`, [name]);
  return (rows as Supplier[])[0] || null;
};

export const createSupplier = async (data: Omit<Supplier, 'id'>): Promise<number> => {
  // Check for existing supplier with the same name (case-insensitive)
  const existingSupplier = await getSupplierByName(data.name);
  if (existingSupplier) {
    throw new Error(`Supplier with name '${data.name}' already exists (ID: ${existingSupplier.id})`);
  }
  
  const [result] = await pool.query(`INSERT INTO ${supplierTable} SET ?`, [data]);
  return (result as any).insertId;
};

export const updateSupplier = async (id: number, data: Partial<Omit<Supplier, 'id'>>): Promise<boolean> => {
  const [result] = await pool.query(`UPDATE ${supplierTable} SET ? WHERE id = ?`, [data, id]);
  return (result as any).affectedRows > 0;
};

export const deleteSupplier = async (id: number): Promise<boolean> => {
  const [result] = await pool.query(`DELETE FROM ${supplierTable} WHERE id = ?`, [id]);
  return (result as any).affectedRows > 0;
};


/* ======= PURCHASE ASSET REGISTRY -- Asset Manager Scopes ======= */
const assetDataTable = 'assets.assetdata';
export interface PurchaseAssetRegistryRecord {
  brand_id?: null | number;
  category_id?: null | number;
  classification?: null | string;
  costcenter_id?: null | number;
  created_by?: null | string;
  description?: null | string;
  id?: number;
  item_condition?: null | string;
  location_id?: null | number;
  model?: null | string;
  model_id?: null | number;
  purchase_id?: null | number;
  register_number?: null | string;
  request_id?: null | number;
  type_id?: null | number;
  warranty_period?: null | number;
}

// Check if register_number already exists in assets.assetdata
export const checkRegisterNumberExists = async (registerNumber: string): Promise<{ exists: boolean; assetId?: number }> => {
  if (!registerNumber || registerNumber.trim() === '') {
    return { exists: false };
  }
  
  const [rows] = await pool.query(
    `SELECT id FROM ${assetDataTable} WHERE register_number = ? LIMIT 1`,
    [registerNumber.trim()]
  );
  
  const existingRow = Array.isArray(rows) ? (rows as any[])[0] : null;
  if (existingRow?.id) {
    return { exists: true, assetId: existingRow.id };
  }
  
  return { exists: false };
};

export const createPurchaseAssetRegistry = async (rec: PurchaseAssetRegistryRecord): Promise<number> => {
  // Use a transaction to ensure both inserts (registry + join table) are atomic.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Duplicate check: prefer register_number when available, otherwise fall back to purchase_id+request_id if both provided
    let existingId: null | number = null;
    const regnum = rec.register_number !== undefined && rec.register_number !== null ? String(rec.register_number).trim() : '';
    if (regnum) {
      const [rows] = await conn.query(
        `SELECT id FROM ${purchaseAssetRegistryTable} WHERE register_number = ? AND ((purchase_id = ?) OR (purchase_id IS NULL AND ? IS NULL)) AND ((request_id = ?) OR (request_id IS NULL AND ? IS NULL)) LIMIT 1`,
        [regnum, rec.purchase_id ?? null, rec.purchase_id ?? null, rec.request_id ?? null, rec.request_id ?? null]
      );
      const r = Array.isArray(rows) ? (rows as any[])[0] : null;
      if (r?.id) existingId = r.id;
    } else if (rec.purchase_id !== undefined && rec.purchase_id !== null && rec.request_id !== undefined && rec.request_id !== null) {
      const [rows] = await conn.query(
        `SELECT id FROM ${purchaseAssetRegistryTable} WHERE purchase_id = ? AND request_id = ? LIMIT 1`,
        [rec.purchase_id, rec.request_id]
      );
      const r = Array.isArray(rows) ? (rows as any[])[0] : null;
      if (r?.id) existingId = r.id;
    }

    if (existingId) {
      // Nothing to insert; rollback any transaction state and return existing id
      await conn.rollback();
      conn.release();
      return existingId;
    }

    // Use provided model_id if available, otherwise lookup model_id from model name
    let modelId: null | number = rec.model_id && rec.model_id !== null ? Number(rec.model_id) : null;
    
    if (!modelId && rec.model) {
      // Only lookup if model_id not provided
      const modelName = rec.model !== undefined && rec.model !== null ? String(rec.model).trim() : '';
      if (modelName) {
        const [modelRows] = await conn.query(
          `SELECT id FROM assets.models WHERE name = ? LIMIT 1`,
          [modelName]
        );
        const modelRow = Array.isArray(modelRows) ? (modelRows as any[])[0] : null;
        modelId = modelRow?.id || null;
      }
    }

    const [result] = await conn.query(
      `INSERT INTO ${purchaseAssetRegistryTable}
      (register_number, classification, type_id, category_id, brand_id, model, model_id, warranty_period, costcenter_id, location_id, item_condition, description, request_id, purchase_id, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        rec.register_number ?? null,
        rec.classification ?? null,
        rec.type_id ?? null,
        rec.category_id ?? null,
        rec.brand_id ?? null,
        rec.model ?? null,
        modelId ?? null,
        rec.warranty_period ?? null,
        rec.costcenter_id ?? null,
        rec.location_id ?? null,
        rec.item_condition ?? null,
        rec.description ?? null,
        rec.request_id ?? null,
        rec.purchase_id ?? null,
        rec.created_by ?? null,
      ]
    );
    const registryId = (result as ResultSetHeader).insertId; //purchase_asset_registry.id

    // Create link in join table: (request_id, purchase_id, registry_id)
    await conn.query(
      `INSERT INTO ${purchaseRegistryTable} (request_id, purchase_id, registry_id) VALUES (?, ?, ?)`,
      [rec.request_id ?? null, rec.purchase_id ?? null, registryId]
    );

    await conn.commit();
    conn.release();
    return registryId;
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {
      // ignore rollback errors
    }
    conn.release();
    throw e;
  }
};

export const createPurchaseAssetRegistryBatch = async (
  purchase_id: number,
  // This function accepts two calling styles for backwards-compatibility with existing callers:
  // - (purchase_id, assets, created_by?)
  // - (purchase_id, request_id, assets, created_by?)
  request_id_or_assets: number | Omit<PurchaseAssetRegistryRecord, 'id' | 'purchase_id'>[],
  assets_or_created_by?: null | Omit<PurchaseAssetRegistryRecord, 'id' | 'purchase_id'>[] | string,
  maybe_created_by?: null | string
): Promise<number[]> => {
  let request_id: null | number = null;
  let assets: Omit<PurchaseAssetRegistryRecord, 'id' | 'purchase_id'>[] = [];
  let created_by: null | string = null;

  if (Array.isArray(request_id_or_assets)) {
    // Called as (purchase_id, assets, created_by?)
    assets = request_id_or_assets;
    created_by = (assets_or_created_by as string) ?? null;
  } else {
    // Called as (purchase_id, request_id, assets, created_by?)
    request_id = Number(request_id_or_assets) || null;
    assets = Array.isArray(assets_or_created_by) ? (assets_or_created_by as any[]) : [];
    created_by = maybe_created_by ?? null;
  }

  const insertIds: number[] = [];
  for (const a of assets) {
    const rec: PurchaseAssetRegistryRecord = {
      brand_id: a.brand_id !== undefined && a.brand_id !== null ? Number(a.brand_id) : null,
      category_id: a.category_id !== undefined && a.category_id !== null ? Number(a.category_id) : null,
      classification: a.classification ?? null,
      costcenter_id: a.costcenter_id !== undefined && a.costcenter_id !== null ? Number(a.costcenter_id) : null,
      created_by: created_by ?? null,
      description: a.description ?? null,
      item_condition: a.item_condition ?? null,
      location_id: a.location_id !== undefined && a.location_id !== null ? Number(a.location_id) : null,
      model: a.model ?? null,
      model_id: a.model_id !== undefined && a.model_id !== null ? Number(a.model_id) : null,
      purchase_id: purchase_id ?? null,
      register_number: a.register_number ?? null,
      request_id: request_id ?? null,
      type_id: a.type_id !== undefined && a.type_id !== null ? Number(a.type_id) : null,
      warranty_period: a.warranty_period !== undefined && a.warranty_period !== null ? Number(a.warranty_period) : null,
    };
    try {
      const id = await createPurchaseAssetRegistry(rec);
      insertIds.push(id);
    } catch (e) {
      // Continue inserting others; caller can check returned ids length
      // Optional: log error
      // console.error('createPurchaseAssetRegistryBatch: insert failed for', rec, e);
    }
  }
  return insertIds;
};

export const getPurchaseAssetRegistry = async (): Promise<PurchaseAssetRegistryRecord[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseAssetRegistryTable}`);
  return rows as PurchaseAssetRegistryRecord[];
};

export const getPurchaseAssetRegistryByPrId = async (purchase_id: number): Promise<PurchaseAssetRegistryRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseAssetRegistryTable} WHERE purchase_id = ? ORDER BY id DESC`,
    [purchase_id]
  );
  return rows as PurchaseAssetRegistryRecord[];
};

// Batch fetch registry rows for multiple purchase_ids to avoid N+1 queries
export const getRegistriesByPurchaseIds = async (purchaseIds: number[]): Promise<{ purchase_id: number; registry_id: number }[]> => {
  if (!Array.isArray(purchaseIds) || purchaseIds.length === 0) return [];
  // Prepare placeholders
  const placeholders = purchaseIds.map(() => '?').join(',');
  const sql = `SELECT purchase_id, id as registry_id FROM ${purchaseAssetRegistryTable} WHERE purchase_id IN (${placeholders})`;
  const [rows] = await pool.query(sql, purchaseIds);
  return (rows as any[]).map(r => ({ purchase_id: Number(r.purchase_id), registry_id: Number(r.registry_id) }));
};

// Create master asset records in assets.assetdata based on registry payload
// Returns array of created asset IDs
export const createMasterAssetsFromRegistryBatch = async (
  purchase_id: number,
  assets: Omit<PurchaseAssetRegistryRecord, 'id' | 'purchase_id'>[]
): Promise<number[]> => {
  const insertAssetIds: number[] = [];

  // Fetch handover_at from the purchase request item to extract purchase_date and purchase_year
  let purchaseDate: null | string = null;
  let purchaseYear: null | number = null;
  try {
    const [itemRows] = await pool.query(
      `SELECT handover_at FROM ${purchaseRequestItemTable} WHERE id = ? LIMIT 1`,
      [purchase_id]
    );
    if (Array.isArray(itemRows) && itemRows.length > 0) {
      const handoverAt = (itemRows as any[])[0]?.handover_at;
      if (handoverAt) {
        // Extract date portion (YYYY-MM-DD)
        const dateStr = String(handoverAt).split(' ')[0]; // Get date part before time
        if (dateStr && dateStr !== '0000-00-00') {
          purchaseDate = dateStr;
          // Extract year
          purchaseYear = parseInt(dateStr.split('-')[0], 10);
        }
      }
    }
  } catch (e) {
    // Non-blocking error; continue without purchase_date/purchase_year
  }

  for (const a of assets) {
    try {
      // First, prevent duplicate register_number in assets.assetdata
      const reg = (a.register_number !== undefined && a.register_number !== null)
        ? String(a.register_number).trim()
        : '';
      if (reg) {
        try {
          const [dupRows] = await pool.query(
            `SELECT id FROM ${assetDataTable} WHERE register_number = ? LIMIT 1`,
            [reg]
          );
          if (Array.isArray(dupRows) && dupRows.length > 0) {
            // Duplicate exists: update existing asset with current pr_id (do not insert duplicate)
            const existingId = (dupRows as any[])[0]?.id;
            if (existingId) {
              try {
                await pool.query(
                  `UPDATE ${assetDataTable} SET purchase_id = ? WHERE id = ?`,
                  [purchase_id, existingId]
                );
                insertAssetIds.push(existingId);
              } catch {
                // non-blocking update failure
              }
            }
            continue;
          }
        } catch { /* non-blocking duplicate check */ }
      }

      // Compute next entry_code based on type_id prefix, e.g., 1xxxx, 2xxxx
      let entryCode: null | string = null;
      const typeIdNum = a.type_id !== undefined && a.type_id !== null ? Number(a.type_id) : null;
      if (typeIdNum) {
        try {
          const last = await assetModel.getLastEntryCodeByType(typeIdNum);
          const prefix = String(typeIdNum);
          if (last && String(last).startsWith(prefix)) {
            const suffix = String(last).slice(prefix.length).replace(/\D+/g, '');
            const padLen = Math.max(suffix.length || 0, 4);
            const next = (Number(suffix || '0') + 1).toString().padStart(padLen, '0');
            entryCode = `${prefix}${next}`;
          } else {
            entryCode = `${prefix}0001`;
          }
        } catch { }
      }
      // Build dynamic INSERT with only provided fields; exclude model/model_id and condition
      const cols: string[] = [];
      const placeholders: string[] = [];
      const vals: any[] = [];

      const pushCol = (col: string, val: any) => { cols.push(col); placeholders.push('?'); vals.push(val); };

      if (a.register_number !== undefined) pushCol('register_number', a.register_number ?? null);
      if (a.brand_id !== undefined && a.brand_id !== null) pushCol('brand_id', Number(a.brand_id));
      if (a.category_id !== undefined && a.category_id !== null) pushCol('category_id', Number(a.category_id));
      if (a.classification !== undefined) pushCol('classification', a.classification ?? null);
      if (a.costcenter_id !== undefined && a.costcenter_id !== null) pushCol('costcenter_id', Number(a.costcenter_id));
      if (a.location_id !== undefined && a.location_id !== null) pushCol('location_id', Number(a.location_id));
      if (a.type_id !== undefined && a.type_id !== null) pushCol('type_id', Number(a.type_id));
      // also store manager_id with same value as type_id when provided
      if (a.type_id !== undefined && a.type_id !== null) pushCol('manager_id', Number(a.type_id));
      if (entryCode) pushCol('entry_code', entryCode);

      // Lookup model_id from model name if model provided, or use provided model_id
      let modelId: null | number = null;
      
      // First check if model_id was provided directly
      if (a.model_id !== undefined && a.model_id !== null) {
        modelId = Number(a.model_id);
      } else {
        // Otherwise lookup from model name
        const modelName = a.model !== undefined && a.model !== null ? String(a.model).trim() : '';
        if (modelName) {
          try {
            const [modelRows] = await pool.query(
              `SELECT id FROM assets.models WHERE name = ? LIMIT 1`,
              [modelName]
            );
            const modelRow = Array.isArray(modelRows) ? (modelRows as any[])[0] : null;
            modelId = modelRow?.id || null;
          } catch { }
        }
      }
      if (modelId !== null) pushCol('model_id', modelId);

      // Defaults: include record_status if schema supports it
      pushCol('record_status', 'active');
      // include linkage to purchase id on assetdata (pr_id) if present in schema
      pushCol('purchase_id', purchase_id);
      // condition status
      pushCol('condition_status', 'in-use');
      // Include purchase_date and purchase_year if available
      if (purchaseDate) pushCol('purchase_date', purchaseDate);
      if (purchaseYear) pushCol('purchase_year', purchaseYear);

      const sql = `INSERT INTO ${assetDataTable} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
      const [result] = await pool.query(sql, vals);
      const insertId = (result as ResultSetHeader).insertId;
      if (insertId) insertAssetIds.push(insertId);
    } catch (e) {
      // continue others
    }
  }
  return insertAssetIds;
};

// Mark a purchase as handed over (sets handover_to = updated_by, handover_at = NOW(), also updates updated_by/updated_at)
export const updatePurchaseRequestItemHandover = async (id: number, updatedBy: null | string): Promise<void> => {
  await pool.query(
    `UPDATE ${purchaseRequestItemTable} SET handover_to = ?, handover_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [updatedBy, id]
  );
};



/* ======= PURCHASE DELIVERY (separate deliveries for items) ======= */
export interface PurchaseDeliveryRecord {
  created_at?: string;
  do_date?: null | string;
  do_no?: null | string;
  grn_date?: null | string;
  grn_no?: null | string;
  id?: number;
  inv_date?: null | string;
  inv_no?: null | string;
  purchase_id: number; // references purchase_request_items.id
  request_id: number; // references purchase_request.id
  updated_at?: string;
  upload_path?: null | string;
}

export const getDeliveries = async (): Promise<PurchaseDeliveryRecord[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseDeliveryTable} ORDER BY created_at DESC, id DESC`);
  return rows as PurchaseDeliveryRecord[];
};

export const getDeliveryById = async (id: number): Promise<null | PurchaseDeliveryRecord> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseDeliveryTable} WHERE id = ?`, [id]);
  const recs = rows as PurchaseDeliveryRecord[];
  return recs.length > 0 ? recs[0] : null;
};

export const getDeliveriesByRequestId = async (request_id: number): Promise<PurchaseDeliveryRecord[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseDeliveryTable} WHERE request_id = ?`, [request_id]);
  return rows as PurchaseDeliveryRecord[];
};

export const getDeliveriesByPurchaseId = async (purchase_id: number): Promise<PurchaseDeliveryRecord[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseDeliveryTable} WHERE purchase_id = ?`, [purchase_id]);
  return rows as PurchaseDeliveryRecord[];
};

export const createDelivery = async (data: Omit<PurchaseDeliveryRecord, 'created_at' | 'id' | 'updated_at'>): Promise<number> => {
  // Check for duplicates using delivery document numbers and dates SCOPED TO THIS PURCHASE_ID
  const conditions: string[] = [];
  const params: any[] = [];

  // Always include purchase_id in the duplicate check to scope it properly
  const baseCondition = 'purchase_id = ?';
  params.push(data.purchase_id);

  // Check for DO (Delivery Order) duplicate within this purchase
  if (data.do_no && data.do_date) {
    conditions.push('(do_no = ? AND do_date = ?)');
    params.push(data.do_no, data.do_date);
  }

  // Check for Invoice duplicate within this purchase
  if (data.inv_no && data.inv_date) {
    conditions.push('(inv_no = ? AND inv_date = ?)');
    params.push(data.inv_no, data.inv_date);
  }

  // Check for GRN (Goods Receipt Note) duplicate within this purchase
  if (data.grn_no && data.grn_date) {
    conditions.push('(grn_no = ? AND grn_date = ?)');
    params.push(data.grn_no, data.grn_date);
  }

  // If any document conditions exist, check for duplicates within this purchase
  if (conditions.length > 0) {
    const whereClause = `${baseCondition} AND (${conditions.join(' OR ')})`;
    const [existingRows] = await pool.query(
      `SELECT id FROM ${purchaseDeliveryTable} WHERE ${whereClause} LIMIT 1`,
      params
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      // Return the existing id (skip insert, like INSERT IGNORE) - but only for same purchase
      return (existingRows[0] as any).id;
    }
  } else {
    // If no document numbers provided, check if any delivery already exists for this purchase_id
    // This prevents multiple empty deliveries for the same purchase
    const [existingRows] = await pool.query(
      `SELECT id FROM ${purchaseDeliveryTable} WHERE purchase_id = ? LIMIT 1`,
      [data.purchase_id]
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      // Return the existing id for this purchase
      return (existingRows[0] as any).id;
    }
  }

  const [result] = await pool.query(
    `INSERT INTO ${purchaseDeliveryTable} (purchase_id, request_id, do_no, do_date, inv_no, inv_date, grn_no, grn_date, upload_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.purchase_id, data.request_id, data.do_no ?? null, data.do_date ?? null, data.inv_no ?? null, data.inv_date ?? null, data.grn_no ?? null, data.grn_date ?? null, data.upload_path ?? null]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateDelivery = async (id: number, data: Partial<Omit<PurchaseDeliveryRecord, 'created_at' | 'id' | 'updated_at'>>): Promise<void> => {
  const keys = Object.keys(data);
  if (!keys.length) return;
  const fields = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => (data as any)[k]);
  await pool.query(`UPDATE ${purchaseDeliveryTable} SET ${fields}, updated_at = NOW() WHERE id = ?`, [...vals, id]);
};

export const deleteDelivery = async (id: number): Promise<void> => {
  const [result] = await pool.query(`DELETE FROM ${purchaseDeliveryTable} WHERE id = ?`, [id]);
  const rr = result as ResultSetHeader;
  if (rr.affectedRows === 0) throw new Error('Delivery record not found');
};

// Update purchase asset registry record
export const updatePurchaseAssetRegistry = async (id: number, data: Partial<Omit<PurchaseAssetRegistryRecord, 'created_at' | 'id' | 'purchase_id'>>): Promise<void> => {
  const keys = Object.keys(data);
  if (!keys.length) return;
  const fields = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => (data as any)[k]);
  await pool.query(`UPDATE ${purchaseAssetRegistryTable} SET ${fields} WHERE id = ?`, [...vals, id]);
};

// Lookup model ID by model name from assets.models table
export const getModelIdByName = async (modelName: string): Promise<number | null> => {
  const [rows] = await pool.query(
    `SELECT id FROM assets.models WHERE name = ? LIMIT 1`,
    [modelName]
  );
  const modelRows = Array.isArray(rows) ? (rows as any[]) : [];
  return modelRows.length > 0 ? (modelRows[0] as any).id : null;
};

// Update assetdata record with new model_id
export const updateAssetDataModelId = async (purchaseId: number, modelId: number | null): Promise<void> => {
  if (modelId === null) {
    // Explicitly set to null
    await pool.query(
      `UPDATE assets.assetdata SET model_id = NULL WHERE purchase_id = ?`,
      [purchaseId]
    );
  } else {
    // Update with new model_id
    await pool.query(
      `UPDATE assets.assetdata SET model_id = ? WHERE purchase_id = ? LIMIT 1`,
      [modelId, purchaseId]
    );
  }
};

// Update assetdata record with multiple fields from purchase_asset_registry
// This ensures asset data stays in sync when purchaser updates registry
export const updateAssetDataFromRegistry = async (
  purchaseId: number,
  data: {
    register_number?: string | null;
    brand_id?: number | null;
    category_id?: number | null;
    classification?: string | null;
    costcenter_id?: number | null;
    location_id?: number | null;
    model_id?: number | null;
  }
): Promise<void> => {
  const keys = Object.keys(data);
  if (!keys.length) return;
  
  const fields = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => (data as any)[k]);
  
  await pool.query(
    `UPDATE assets.assetdata SET ${fields} WHERE purchase_id = ? LIMIT 1`,
    [...vals, purchaseId]
  );
};

// Audit logging for purchase_asset_registry updates
// Records what changed, old/new values, who changed it, when and from where
export const logRegistryAudit = async (
  registryId: number,
  purchaseId: number | null,
  fieldName: string,
  oldValue: any,
  newValue: any,
  changedBy: string | null,
  ipAddress: string | null,
  notes?: string | null
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO ${purchaseAssetRegistryAuditTable} 
       (registry_id, purchase_id, field_name, old_value, new_value, changed_by, ip_address, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        registryId,
        purchaseId,
        fieldName,
        oldValue === null ? null : JSON.stringify(oldValue),
        newValue === null ? null : JSON.stringify(newValue),
        changedBy,
        ipAddress,
        notes || null
      ]
    );
  } catch (err) {
    // Log audit failures but don't fail the main operation
    console.warn(`Failed to log audit for registry ${registryId}:`, err);
  }
};

// Batch log multiple field changes at once
export const logRegistryAuditBatch = async (
  registryId: number,
  purchaseId: number | null,
  changes: Array<{
    fieldName: string;
    oldValue: any;
    newValue: any;
  }>,
  changedBy: string | null,
  ipAddress: string | null,
  notes?: string | null
): Promise<void> => {
  try {
    if (changes.length === 0) return;
    
    const placeholders = changes.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const values: any[] = [];
    
    for (const change of changes) {
      values.push(
        registryId,
        purchaseId,
        change.fieldName,
        change.oldValue === null ? null : JSON.stringify(change.oldValue),
        change.newValue === null ? null : JSON.stringify(change.newValue),
        changedBy,
        ipAddress,
        notes || null
      );
    }
    
    await pool.query(
      `INSERT INTO ${purchaseAssetRegistryAuditTable} 
       (registry_id, purchase_id, field_name, old_value, new_value, changed_by, ip_address, notes) 
       VALUES ${placeholders}`,
      values
    );
  } catch (err) {
    // Log audit failures but don't fail the main operation
    console.warn(`Failed to log audit batch for registry ${registryId}:`, err);
  }
};

/* ======= IMPORT FROM purchase_item_import ======= */
export interface ImportItem {
  brand?: string;
  brand_id?: number;
  category_id?: number;
  costcenter?: string;
  costcenter_id?: number;
  description?: string;
  id?: number;
  item_type?: string;
  name?: string;
  pic?: string;
  po_date?: string;
  po_no?: string;
  pr_date?: string;
  pr_no?: string;
  purpose?: string;
  qty?: number;
  ramco_id?: string;
  request_type?: string;
  supplier?: string;
  supplier_id?: number;
  total_price?: number;
  type_id?: number;
  unit_price?: number;
}

export interface ImportResult {
  duplicate_items: string[];
  failed_items: Array<{ pr_no: string; error: string }>;
  imported_count: number;
  total_records: number;
}

export interface ImportLog {
  timestamp: string;
  purchase_items_inserted: number;
  purchase_requests_inserted: number;
  purchase_items_duplicates: number;
  purchase_requests_duplicates: number;
  purchase_items_failed: number;
  purchase_requests_failed: number;
  total_rows_processed: number;
  details: {
    items: ImportResult;
    requests: ImportResult & { request_id_map: Map<string, number> };
  };
}

/**
 * Get all records from purchase_item_import table
 */
export const getImportItems = async (): Promise<ImportItem[]> => {
  const importTable = `${dbName}.purchase_item_import`;
  const [rows] = await pool.query(`SELECT * FROM ${importTable}`);
  return rows as ImportItem[];
};

/**
 * Check if pr_no exists in purchase_items table (for duplicates)
 */
export const checkPrNoInPurchaseItems = async (prNo: string): Promise<boolean> => {
  const [rows] = await pool.query(
    `SELECT id FROM ${purchaseRequestItemTable} WHERE pr_no = ? LIMIT 1`,
    [prNo]
  );
  return Array.isArray(rows) && rows.length > 0;
};

/**
 * Check if pr_no exists in purchase_request table (for duplicates)
 */
export const checkPrNoInPurchaseRequest = async (prNo: string): Promise<boolean> => {
  const [rows] = await pool.query(
    `SELECT id FROM ${purchaseRequestTable} WHERE pr_no = ? LIMIT 1`,
    [prNo]
  );
  return Array.isArray(rows) && rows.length > 0;
};

/**
 * Import purchase items from purchase_item_import into purchase_items
 * Skips duplicate pr_no entries (already exist in purchase_items)
 * Also links to purchase_request via request_id if provided
 */
export const importPurchaseItems = async (
  items: ImportItem[],
  requestIdMap?: Map<string, number>
): Promise<ImportResult> => {
  const result: ImportResult = {
    duplicate_items: [],
    failed_items: [],
    imported_count: 0,
    total_records: items.length
  };

  for (const item of items) {
    try {
      const prNo = item.pr_no || '';
      
      // Skip if pr_no is empty
      if (!prNo.trim()) {
        result.failed_items.push({ pr_no: prNo, error: 'pr_no is required' });
        continue;
      }

      // Check if pr_no already exists in purchase_items
      const existsInItems = await checkPrNoInPurchaseItems(prNo);
      if (existsInItems) {
        result.duplicate_items.push(prNo);
        continue;
      }

      // Get request_id from the map if available
      const requestId = requestIdMap?.get(prNo) || null;

      // Insert into purchase_items
      const [insertResult] = await pool.query(
        `INSERT INTO ${purchaseRequestItemTable} (
          request_id, name, type_id, category_id, qty, description, purpose, brand_id, supplier_id, 
          unit_price, total_price, po_no, po_date, pr_date, pr_no, costcenter_id, ramco_id, 
          brand, supplier, request_type, costcenter, pic, item_type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          requestId,
          item.name || null,
          item.type_id || null,
          item.category_id || null,
          item.qty || null,
          item.description || null,
          item.purpose || null,
          item.brand_id || null,
          item.supplier_id || null,
          item.unit_price || null,
          item.total_price || null,
          item.po_no || null,
          item.po_date || null,
          item.pr_date || null,
          item.pr_no || null,
          item.costcenter_id || null,
          item.ramco_id || null,
          item.brand || null,
          item.supplier || null,
          item.request_type || null,
          item.costcenter || null,
          item.pic || null,
          item.item_type || null
        ]
      );

      result.imported_count++;
    } catch (err: any) {
      result.failed_items.push({
        pr_no: item.pr_no || 'unknown',
        error: err.message || 'Unknown error'
      });
    }
  }

  return result;
};

/**
 * Import purchase requests from purchase_item_import (distinct records)
 * Creates new purchase_request records with request_type, pr_no, pr_date, ramco_id, costcenter_id
 * Skips duplicate pr_no entries (already exist in purchase_request)
 * Returns mapping of pr_no -> request_id for linking to purchase_items
 */
export const importPurchaseRequests = async (
  items: ImportItem[]
): Promise<ImportResult & { request_id_map: Map<string, number> }> => {
  const result: ImportResult & { request_id_map: Map<string, number> } = {
    duplicate_items: [],
    failed_items: [],
    imported_count: 0,
    total_records: items.length,
    request_id_map: new Map()
  };

  // Group items by pr_no to get unique records
  const uniquePrMap = new Map<string, ImportItem>();
  for (const item of items) {
    if (item.pr_no && !uniquePrMap.has(item.pr_no)) {
      uniquePrMap.set(item.pr_no, item);
    }
  }

  result.total_records = uniquePrMap.size;

  for (const item of uniquePrMap.values()) {
    try {
      const prNo = item.pr_no || '';

      // Skip if pr_no is empty
      if (!prNo.trim()) {
        result.failed_items.push({ pr_no: prNo, error: 'pr_no is required' });
        continue;
      }

      // Check if pr_no already exists in purchase_request
      const [existingRows] = await pool.query(
        `SELECT id FROM ${purchaseRequestTable} WHERE pr_no = ? LIMIT 1`,
        [prNo]
      );
      
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        // Record duplicate but still map the existing request_id
        const existingId = (existingRows[0] as any).id;
        result.duplicate_items.push(prNo);
        result.request_id_map.set(prNo, existingId);
        
        // Update existing purchase_items records with this pr_no to link them to the request_id
        try {
          await pool.query(
            `UPDATE ${purchaseRequestItemTable} SET request_id = ? WHERE pr_no = ? AND request_id IS NULL`,
            [existingId, prNo]
          );
        } catch (updateErr) {
          console.warn(`Failed to update purchase_items for duplicate pr_no ${prNo}:`, updateErr);
          // Don't fail the import if update fails
        }
        
        continue;
      }

      // Insert into purchase_request
      const [insertResult] = await pool.query(
        `INSERT INTO ${purchaseRequestTable} (
          request_type, pr_no, pr_date, ramco_id, costcenter_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          item.request_type || null,
          item.pr_no || null,
          item.pr_date || null,
          item.ramco_id || null,
          item.costcenter_id || null
        ]
      );

      const insertId = (insertResult as ResultSetHeader).insertId;
      result.request_id_map.set(prNo, insertId);
      result.imported_count++;
    } catch (err: any) {
      result.failed_items.push({
        pr_no: item.pr_no || 'unknown',
        error: err.message || 'Unknown error'
      });
    }
  }

  return result;
};


