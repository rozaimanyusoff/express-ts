import e from 'express';
import { pool } from '../utils/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

// Database table name
const dbName = 'purchases'; // Replace with your actual database name
const purchaseTable = `${dbName}.purchase_data`;
const supplierTable = `${dbName}.purchase_supplier`;

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
  released_to?: string;
  released_at?: string;
  created_at?: string;
  updated_at?: string;
}

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
      // (released_to empty or released_at missing/zero-date). Also keep existing DO/INV rule as fallback.
      whereClause = "(grn_no IS NOT NULL AND (released_to IS NULL OR TRIM(released_to) = '' OR released_at IS NULL OR released_at IN ('0000-00-00', '0000-00-00 00:00:00'))) OR (do_no IS NOT NULL AND inv_no IS NOT NULL)";
      break;
    case 'released':
      // require grn_no present and released_to not null/empty
      whereClause = "grn_no IS NOT NULL AND released_to IS NOT NULL AND TRIM(released_to) <> ''";
      break;
  case 'completed':
      // ensure released_to is present and not an empty string, and released_at is a real timestamp
      // guard against MySQL zero-dates like '0000-00-00' or '0000-00-00 00:00:00'
  whereClause = "released_to IS NOT NULL AND TRIM(released_to) <> '' AND released_at IS NOT NULL AND released_at NOT IN ('0000-00-00', '0000-00-00 00:00:00')";
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
