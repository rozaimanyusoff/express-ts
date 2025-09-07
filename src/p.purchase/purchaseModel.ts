import e from 'express';
import { pool } from '../utils/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import * as assetModel from '../p.asset/assetModel';

// Database table name
const dbName = 'purchases'; // Replace with your actual database name
const purchaseTable = `${dbName}.purchase_data`;
const supplierTable = `${dbName}.purchase_supplier`;
const purchaseAssetRegistryTable = `${dbName}.purchase_asset_registry`;
const purchaseRequestItemsTable = `${dbName}.purchase_request_items`;
// Join table linking purchase_data (pr_id) and purchase_asset_registry (registry_id)
const purchaseRegistryTable = `${dbName}.purchase_registry`;

export interface PurchaseRecord {
  id?: number;
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
  do_date?: string;
  do_no?: string;
  inv_date?: string;
  inv_no?: string;
  grn_date?: string;
  grn_no?: string;
  upload_path?: string;
  // renamed from released_* to handover_* in schema
  handover_to?: string;
  handover_at?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

// PURCHASE REQUEST ITEMS
export interface PurchaseRequestItemRecord {
  id?: number;
  pr_no?: string | null;
  request_type: string;
  pr_date: string; // YYYY-MM-DD
  costcenter_id: number;
  department_id: number;
  position_id?: number | null;
  ramco_id: string;
  type_id: number;
  category_id?: number | null;
  description: string;
  qty: number;
  purpose?: string | null;
  created_at?: string;
}

// Returns the last PR number (by value) on a given pr_date from purchase_data
export const getLastPrNoByDate = async (pr_date: string): Promise<string | null> => {
  try {
    // Try numeric ordering; fallback to lexical if needed
    const [rows] = await pool.query(
      `SELECT pr_no FROM ${purchaseTable} WHERE pr_date = ? AND pr_no IS NOT NULL AND TRIM(pr_no) <> ''
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
      `SELECT pr_date FROM ${purchaseTable} WHERE pr_date IS NOT NULL ORDER BY pr_date DESC LIMIT 1`
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

// Bulk insert purchase request items. Returns insert ids.
export const createPurchaseRequestItems = async (
  header: {
    pr_no?: string | null;
    request_type: string;
    pr_date: string;
    costcenter_id: number;
    department_id: number;
    position_id?: number | null;
    ramco_id: string;
  },
  items: Array<{ type_id: number; category_id?: number | null; description: string; qty: number; purpose?: string | null; }>
): Promise<number[]> => {
  const ids: number[] = [];
  for (const it of items) {
    const rec: Omit<PurchaseRequestItemRecord, 'id' | 'created_at'> = {
      pr_no: header.pr_no ?? null,
      request_type: header.request_type,
      pr_date: header.pr_date,
      costcenter_id: Number(header.costcenter_id),
      department_id: Number(header.department_id),
      position_id: header.position_id !== undefined && header.position_id !== null ? Number(header.position_id) : null,
      ramco_id: header.ramco_id,
      type_id: Number(it.type_id),
      category_id: it.category_id !== undefined && it.category_id !== null ? Number(it.category_id) : null,
      description: String(it.description || '').trim(),
      qty: Number(it.qty || 0),
      purpose: it.purpose !== undefined ? String(it.purpose) : null,
    };
    const [result] = await pool.query(
      `INSERT INTO ${purchaseRequestItemsTable}
        (pr_no, request_type, pr_date, costcenter_id, department_id, position_id, ramco_id, type_id, category_id, description, qty, purpose, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        rec.pr_no,
        rec.request_type,
        rec.pr_date,
        rec.costcenter_id,
        rec.department_id,
        rec.position_id,
        rec.ramco_id,
        rec.type_id,
        rec.category_id,
        rec.description,
        rec.qty,
        rec.purpose,
      ]
    );
    ids.push((result as ResultSetHeader).insertId);
  }
  return ids;
};

// GET ALL PURCHASES
export const getPurchases = async (): Promise<PurchaseRecord[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseTable} ORDER BY pr_date DESC`);
  return rows as PurchaseRecord[];
};

// GET PURCHASE BY ID
export const getPurchaseById = async (id: number): Promise<PurchaseRecord | null> => {
  const [rows] = await pool.query(`SELECT * FROM ${purchaseTable} WHERE id = ?`, [id]);
  const purchases = rows as PurchaseRecord[];
  return purchases.length > 0 ? purchases[0] : null;
};

// CREATE PURCHASE
export const createPurchase = async (data: Omit<PurchaseRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
  // Check for duplicate based on pr_no if provided
  if (data.pr_no) {
    const [existingRows] = await pool.query(
      `SELECT id FROM ${purchaseTable} WHERE pr_no = ?`,
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
    items,
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
    do_date,
    do_no,
    inv_date,
    inv_no,
    grn_date,
    grn_no,
    upload_path
  } = data;

  const [result] = await pool.query(
    `INSERT INTO ${purchaseTable} (
      request_type, costcenter, costcenter_id, pic, ramco_id, item_type, type_id, items,
      supplier, supplier_id, brand_id, brand, qty,
      unit_price, total_price, pr_date, pr_no, po_date, po_no, do_date, do_no,
      inv_date, inv_no, grn_date, grn_no, upload_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      request_type, costcenter, costcenter_id, pic, ramco_id, item_type, type_id, items,
      supplier, supplier_id, brand_id, brand, qty,
      unit_price, total_price, pr_date, pr_no, po_date, po_no, do_date, do_no,
      inv_date, inv_no, grn_date, grn_no, upload_path
    ]
  );

  return (result as ResultSetHeader).insertId;
};

// UPDATE PURCHASE
export const updatePurchase = async (
  id: number,
  data: Partial<Omit<PurchaseRecord, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> => {
  // Duplicate PR number check intentionally skipped on update (per request)

  const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const values = Object.values(data);

  if (fields) {
    await pool.query(
      `UPDATE ${purchaseTable} SET ${fields}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );
  }
};

// DELETE PURCHASE
export const deletePurchase = async (id: number): Promise<void> => {
  const [result] = await pool.query(`DELETE FROM ${purchaseTable} WHERE id = ?`, [id]);
  const deleteResult = result as ResultSetHeader;

  if (deleteResult.affectedRows === 0) {
    throw new Error('Purchase record not found');
  }
};

// GET PURCHASES BY DATE RANGE
export const getPurchasesByDateRange = async (
  startDate: string,
  endDate: string,
  dateField: 'pr_date' | 'po_date' | 'do_date' | 'inv_date' | 'grn_date' = 'pr_date'
): Promise<PurchaseRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseTable} WHERE ${dateField} BETWEEN ? AND ? ORDER BY ${dateField} DESC`,
    [startDate, endDate]
  );
  return rows as PurchaseRecord[];
};

// GET PURCHASES BY STATUS (based on completion of process stages)
export const getPurchasesByStatus = async (status: string): Promise<PurchaseRecord[]> => {
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
    `SELECT * FROM ${purchaseTable} WHERE ${whereClause} ORDER BY id DESC`
  );
  return rows as PurchaseRecord[];
};

// GET PURCHASES BY COST CENTER
export const getPurchasesByCostCenter = async (costCenter: string): Promise<PurchaseRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseTable} WHERE costcenter = ? ORDER BY id DESC`,
    [costCenter]
  );
  return rows as PurchaseRecord[];
};

// GET PURCHASES BY SUPPLIER
export const getPurchasesBySupplier = async (supplier: string): Promise<PurchaseRecord[]> => {
  const [rows] = await pool.query(
    `SELECT * FROM ${purchaseTable} WHERE supplier LIKE ? ORDER BY id DESC`,
    [`%${supplier}%`]
  );
  return rows as PurchaseRecord[];
};

// BULK INSERT PURCHASES (for Excel import)
export const bulkInsertPurchases = async (purchases: Omit<PurchaseRecord, 'id' | 'created_at' | 'updated_at'>[]): Promise<number[]> => {
  const insertIds: number[] = [];

  for (const purchase of purchases) {
    try {
      const insertId = await createPurchase(purchase);
      insertIds.push(insertId);
    } catch (error) {
      console.error(`Failed to insert purchase with PR: ${purchase.pr_no}`, error);
      // Continue with other records instead of failing the entire batch
    }
  }

  return insertIds;
};

// GET PURCHASE SUMMARY BY DATE RANGE
export const getPurchaseSummary = async (startDate?: string, endDate?: string) => {
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
    FROM ${purchaseTable} ${dateFilter}`,
    params
  );

  return (rows as any[])[0];
};

/* ======= SUPPLIER QUERIES ======= */
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

/* ======= PURCHASE ASSET REGISTRY ======= */

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
        } catch {}
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
      if (entryCode) pushCol('entry_code', entryCode);

      // Defaults
      pushCol('status', 'registered');
      pushCol('record_status', 'active');
      // include linkage to purchase id on assetdata
      pushCol('pr_id', pr_id);
      // keep procurement_id for compatibility if present in schema
      pushCol('procurement_id', pr_id);

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
export const markPurchaseHandover = async (id: number, updatedBy: string | null): Promise<void> => {
  await pool.query(
    `UPDATE ${purchaseTable} SET handover_to = ?, handover_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [updatedBy, id]
  );
};
