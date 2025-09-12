import e from 'express';
import { pool } from '../utils/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import * as assetModel from '../p.asset/assetModel';

// Database table name
const dbName = 'test_purchases'; // Replace with your actual database name
const purchaseRequestTable = `${dbName}.purchase_request`;
const purchaseRequestItemTable = `${dbName}.purchase_items`;
const purchaseDeliveryTable = `${dbName}.purchase_delivery`;
const supplierTable = `${dbName}.purchase_supplier`;
const purchaseAssetRegistryTable = `${dbName}.purchase_asset_registry`;
const purchaseRequestItemsTable = `${dbName}.purchase_request_items`;
// Join table linking purchase_data (pr_id) and purchase_asset_registry (registry_id)
const purchaseRegistryTable = `${dbName}.purchase_registry`;


/* ======= PURCHASE REQUEST (simple CRUD) ======= */
export interface PurchaseRequestRecord {
  id?: number;
  pr_no?: string | null;
  pr_date: string; // YYYY-MM-DD
  request_type: string;
  ramco_id: string;
  costcenter_id: number;
  department_id: number;
  created_at?: string;
  updated_at?: string;
}

export const getPurchaseRequests = async (): Promise<PurchaseRequestRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseRequestTable} ORDER BY pr_date DESC, id DESC`
  );
  return rows as PurchaseRequestRecord[];
};

export const getPurchaseRequestById = async (id: number): Promise<PurchaseRequestRecord | null> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestTable} WHERE id = ?`, [id]);
  const recs = rows as PurchaseRequestRecord[];
  return recs.length > 0 ? recs[0] : null;
};

export const createPurchaseRequest = async (data: Omit<PurchaseRequestRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
  const [result] = await pool.query(
    `INSERT INTO ${purchaseRequestTable} (pr_no, pr_date, request_type, ramco_id, costcenter_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.pr_no ?? null, data.pr_date, data.request_type, data.ramco_id, data.costcenter_id]
  );
  return (result as ResultSetHeader).insertId;
};

export const updatePurchaseRequest = async (id: number, data: Partial<Omit<PurchaseRequestRecord, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
  const allowed: Array<keyof PurchaseRequestRecord> = ['pr_no', 'pr_date', 'request_type', 'ramco_id', 'costcenter_id'];
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
  id?: number;
  request_id?: number;
  request_type: string;
  costcenter: string;
  costcenter_id?: number;
  pic?: string;
  ramco_id: string;
  item_type?: string;
  type_id?: number;
  items: string;
  supplier?: string;
  supplier_id?: number;
  brand_id?: number;
  brand?: string;
  qty: number;
  unit_price: number;
  total_price: number;
  pr_date?: string;
  pr_no?: string;
  po_date?: string;
  po_no?: string;
  // delivery / invoice fields moved to purchase_delivery table
  // do_date, do_no, inv_date, inv_no, grn_date, grn_no, upload_path removed
  // renamed from released_* to handover_* in schema
  handover_to?: string;
  handover_at?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

/* ======= PURCHASE REQUEST ITEMS -- Procurement Scopes ======= */
export interface PurchaseRequestItemRecord {
  id?: number;
  request_id?: number;
  pr_no?: string | null;
  type_id: number;
  item_type?: string;
  costcenter?: string;
  costcenter_id?: number;
  category_id?: number | null;
  qty: number;
  description: string;
  purpose?: string | null;
  supplier_id?: number;
  unit_price: number;
  total_price: number;
  po_no?: string;
  po_date?: string;
  upload_path?: string; // keep for PR item attachments (if any)
  handover_to?: string;
  handover_at?: string;
  created_at?: string;
  updated_at?: string;
}


export const getPurchaseRequestItems = async (): Promise<PurchaseRequestItemRecord[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestItemTable} ORDER BY pr_date DESC`);
  return rows as PurchaseRequestItemRecord[];
};

export const getPurchaseRequestItemById = async (id: number): Promise<PurchaseRequestItemRecord | null> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseRequestItemTable} WHERE id = ?`, [id]);
  const purchases = rows as PurchaseRequestItemRecord[];
  return purchases.length > 0 ? purchases[0] : null;
};

export const createPurchaseRequestItem = async (data: Omit<PurchaseRequestItemRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
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
    request_type,
    costcenter,
    costcenter_id,
    pic,
    ramco_id,
    item_type,
    type_id,
    description,
    supplier,
    supplier_id,
    brand_id,
    brand,
    qty,
    unit_price,
    total_price,
    pr_date,
    pr_no,
    po_date,
    po_no,
    upload_path
  } = data as any;

  const [result] = await pool.query(
    `INSERT INTO ${purchaseRequestItemTable} (
      request_type, costcenter, costcenter_id, pic, ramco_id, item_type, type_id, description,
      supplier, supplier_id, brand_id, brand, qty,
      unit_price, total_price, pr_date, pr_no, po_date, po_no, upload_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      request_type, costcenter, costcenter_id, pic, ramco_id, item_type, type_id, description,
      supplier, supplier_id, brand_id, brand, qty,
      unit_price, total_price, pr_date, pr_no, po_date, po_no, upload_path
    ]
  );

  return (result as ResultSetHeader).insertId;
};

export const updatePurchaseRequestItem = async (
  id: number,
  data: Partial<Omit<PurchaseRequestItemRecord, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> => {
  // Duplicate PR number check intentionally skipped on update (per request)

  const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const values = Object.values(data);

  if (fields) {
    await pool.query(
      `UPDATE ${purchaseRequestItemTable} SET ${fields}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );
  }
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
    case 'requested':
      whereClause = 'pr_no IS NOT NULL AND po_no IS NULL';
      break;
    case 'ordered':
      whereClause = 'po_no IS NOT NULL AND do_no IS NULL';
      break;
    case 'delivered':
      // Consider a purchase delivered when GRN is present but it hasn't been released yet
      // (handover_to empty or handover_at missing/zero-date). Also keep existing DO/INV rule as fallback.
      whereClause = "(grn_no IS NOT NULL AND (handover_to IS NULL OR TRIM(handover_to) = '' OR handover_at IS NULL OR handover_at IN ('0000-00-00', '0000-00-00 00:00:00'))) OR (do_no IS NOT NULL AND inv_no IS NOT NULL)";
      break;
    case 'released':
      // require grn_no present and handover_to not null/empty
      whereClause = "grn_no IS NOT NULL AND handover_to IS NOT NULL AND TRIM(handover_to) <> ''";
      break;
    case 'completed':
      // ensure handover_to is present and not an empty string, and handover_at is a real timestamp
      // guard against MySQL zero-dates like '0000-00-00' or '0000-00-00 00:00:00'
      whereClause = "handover_to IS NOT NULL AND TRIM(handover_to) <> '' AND handover_at IS NOT NULL AND handover_at NOT IN ('0000-00-00', '0000-00-00 00:00:00')";
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
  dateField: 'pr_date' | 'po_date' | 'do_date' | 'inv_date' | 'grn_date' = 'pr_date'
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
export const getLastPrNoByDate = async (pr_date: string): Promise<string | null> => {
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
export const getLastPrNoByLatestDate = async (): Promise<{ pr_no: string | null; pr_date: string | null }> => {
  try {
    const [dateRows] = await pool.query(
      `SELECT pr_date FROM ${purchaseRequestItemTable} WHERE pr_date IS NOT NULL ORDER BY pr_date DESC LIMIT 1`
    );
    const latestRow = (dateRows as RowDataPacket[])[0] as any;
    const latestDate: string | null = latestRow ? (latestRow.pr_date as string) : null;
    if (!latestDate) return { pr_no: null, pr_date: null };
    const pr_no = await getLastPrNoByDate(latestDate);
    return { pr_no, pr_date: latestDate };
  } catch {
    return { pr_no: null, pr_date: null };
  }
};



/* ======= SUPPLIER ======= */
export interface Supplier {
  id: number;
  name: string;
  contact_name: string;
  contact_no: string;
}

export const getSuppliers = async (): Promise<Supplier[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${supplierTable} ORDER BY id DESC`);
  return rows as Supplier[];
};

export const getSupplierById = async (id: number): Promise<Supplier | null> => {
  const [rows] = await pool.query(`SELECT * FROM ${supplierTable} WHERE id = ?`, [id]);
  return (rows as Supplier[])[0] || null;
};

export const getSupplierByName = async (name: string): Promise<Supplier | null> => {
  const [rows] = await pool.query(`SELECT * FROM ${supplierTable} WHERE name = ?`, [name]);
  return (rows as Supplier[])[0] || null;
};

export const createSupplier = async (data: Omit<Supplier, 'id'>): Promise<number> => {
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
export interface PurchaseAssetRegistryRecord {
  id?: number;
  register_number?: string | null;
  classification?: string | null;
  type_id?: number | null;
  category_id?: number | null;
  brand_id?: number | null;
  model?: string | null;
  costcenter_id?: number | null;
  location_id?: number | null;
  item_condition?: string | null;
  description?: string | null;
  pr_id: number;
  created_by?: string | null;
}

export const createPurchaseAssetRegistry = async (rec: PurchaseAssetRegistryRecord): Promise<number> => {
  const [result] = await pool.query(
    `INSERT INTO ${purchaseAssetRegistryTable}
      (register_number, classification, type_id, category_id, brand_id, model, costcenter_id, location_id, item_condition, description, pr_id, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      rec.register_number ?? null,
      rec.classification ?? null,
      rec.type_id ?? null,
      rec.category_id ?? null,
      rec.brand_id ?? null,
      rec.model ?? null,
      rec.costcenter_id ?? null,
      rec.location_id ?? null,
      rec.item_condition ?? null,
      rec.description ?? null,
      rec.pr_id,
      rec.created_by ?? null,
    ]
  );
  const registryId = (result as ResultSetHeader).insertId;

  // Create link in join table: (pr_id, registry_id)
  try {
    await pool.query(
      `INSERT INTO ${purchaseRegistryTable} (pr_id, registry_id) VALUES (?, ?)`,
      [rec.pr_id, registryId]
    );
  } catch (e) {
    // Non-blocking: join table might not exist in some environments
  }

  return registryId;
};

export const createPurchaseAssetRegistryBatch = async (
  pr_id: number,
  assets: Array<Omit<PurchaseAssetRegistryRecord, 'pr_id' | 'id'>>,
  created_by?: string | null
): Promise<number[]> => {
  const insertIds: number[] = [];
  for (const a of assets) {
    const rec: PurchaseAssetRegistryRecord = {
      pr_id,
      register_number: a.register_number ?? null,
      classification: a.classification ?? null,
      type_id: a.type_id !== undefined && a.type_id !== null ? Number(a.type_id) : null,
      category_id: a.category_id !== undefined && a.category_id !== null ? Number(a.category_id) : null,
      brand_id: a.brand_id !== undefined && a.brand_id !== null ? Number(a.brand_id) : null,
      model: a.model ?? null,
      costcenter_id: a.costcenter_id !== undefined && a.costcenter_id !== null ? Number(a.costcenter_id) : null,
      location_id: a.location_id !== undefined && a.location_id !== null ? Number(a.location_id) : null,
      item_condition: a.item_condition ?? null,
      description: a.description ?? null,
      created_by: created_by ?? null,
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

export const getPurchaseAssetRegistryByPrId = async (pr_id: number): Promise<PurchaseAssetRegistryRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseAssetRegistryTable} WHERE pr_id = ? ORDER BY id DESC`,
    [pr_id]
  );
  return rows as PurchaseAssetRegistryRecord[];
};

// Create master asset records in assets.assetdata based on registry payload
// Returns array of created asset IDs
export const createMasterAssetsFromRegistryBatch = async (
  pr_id: number,
  assets: Array<Omit<PurchaseAssetRegistryRecord, 'pr_id' | 'id'>>
): Promise<number[]> => {
  const insertAssetIds: number[] = [];

  for (const a of assets) {
    try {
      // First, prevent duplicate register_number in assets.assetdata
      const reg = (a.register_number !== undefined && a.register_number !== null)
        ? String(a.register_number).trim()
        : '';
      if (reg) {
        try {
          const [dupRows] = await pool.query(
            `SELECT id FROM assets.assetdata WHERE register_number = ? LIMIT 1`,
            [reg]
          );
          if (Array.isArray(dupRows) && dupRows.length > 0) {
            // Duplicate exists: update existing asset with current pr_id (do not insert duplicate)
            const existingId = (dupRows as any[])[0]?.id;
            if (existingId) {
              try {
                await pool.query(
                  `UPDATE assets.assetdata SET pr_id = ? WHERE id = ?`,
                  [pr_id, existingId]
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
      let entryCode: string | null = null;
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

      // Defaults: include record_status if schema supports it
      pushCol('record_status', 'active');
      // include linkage to purchase id on assetdata (pr_id) if present in schema
      pushCol('pr_id', pr_id);

      const sql = `INSERT INTO assets.assetdata (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
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
export const updatePurchaseRequestItemHandover = async (id: number, updatedBy: string | null): Promise<void> => {
  await pool.query(
    `UPDATE ${purchaseRequestItemTable} SET handover_to = ?, handover_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [updatedBy, id]
  );
};



/* ======= PURCHASE DELIVERY (separate deliveries for items) ======= */
export interface PurchaseDeliveryRecord {
  id?: number;
  purchase_id: number; // references purchase_request_items.id
  request_id: number; // references purchase_request.id
  do_no?: string | null;
  do_date?: string | null;
  inv_no?: string | null;
  inv_date?: string | null;
  grn_no?: string | null;
  grn_date?: string | null;
  upload_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const getDeliveries = async (): Promise<PurchaseDeliveryRecord[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseDeliveryTable} ORDER BY created_at DESC, id DESC`);
  return rows as PurchaseDeliveryRecord[];
};

export const getDeliveryById = async (id: number): Promise<PurchaseDeliveryRecord | null> => {
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

export const createDelivery = async (data: Omit<PurchaseDeliveryRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
  const [result] = await pool.query(
    `INSERT INTO ${purchaseDeliveryTable} (purchase_id, request_id, do_no, do_date, inv_no, inv_date, grn_no, grn_date, upload_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.purchase_id, data.request_id, data.do_no ?? null, data.do_date ?? null, data.inv_no ?? null, data.inv_date ?? null, data.grn_no ?? null, data.grn_date ?? null, data.upload_path ?? null]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateDelivery = async (id: number, data: Partial<Omit<PurchaseDeliveryRecord, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
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



