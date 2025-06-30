import pool from "../utils/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";

// Database and table declarations for easy swapping/testing
const db = 'assetdata';
const assetPurchaseTable = `${db}.asset_purchase`;
const assetTable = `${db}.asset_data`;
const departmentTable = `${db}.departments`;
const costcenterTable = `${db}.costcenters`;
const employeeTable = `${db}.employees`;

// Interface for AssetPurchase
export interface AssetPurchase {
  id?: number;
  asset_id: number;
  received_date?: Date | null;
  do_no?: string | null;
  do_date?: Date | null;
  inv_no?: string | null;
  inv_date?: Date | null;
  po_no?: string | null;
  po_date?: Date | null;
  pr_no?: string | null;
  pr_date?: Date | null;
  department_id?: number | null;
  costcenter_id?: number | null;
  ramco_id?: number | null;
  requested_date?: Date | null;
}

// Interface for AssetPurchase with related data
export interface AssetPurchaseWithDetails extends AssetPurchase {
  asset?: {
    id: number;
    serial_number: string;
    asset_tag: string;
    // Add more asset fields as needed
  };
  department?: {
    id: number;
    name: string;
    code: string;
  };
  costcenter?: {
    id: number;
    name: string;
    code: string;
  };
  employee?: {
    ramco_id: number;
    full_name: string;
    email: string;
  };
}

// Create asset purchase
export const createAssetPurchase = async (data: AssetPurchase) => {
  const {
    asset_id,
    received_date,
    do_no,
    do_date,
    inv_no,
    inv_date,
    po_no,
    po_date,
    pr_no,
    pr_date,
    department_id,
    costcenter_id,
    ramco_id,
    requested_date
  } = data;

  const [result] = await pool.query(
    `INSERT INTO ${assetPurchaseTable} 
     (asset_id, received_date, do_no, do_date, inv_no, inv_date, po_no, po_date, pr_no, pr_date, department_id, costcenter_id, ramco_id, requested_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [asset_id, received_date, do_no, do_date, inv_no, inv_date, po_no, po_date, pr_no, pr_date, department_id, costcenter_id, ramco_id, requested_date]
  );
  return result as ResultSetHeader;
};

// Get all asset purchases
export const getAssetPurchases = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetPurchaseTable} ORDER BY id DESC`);
  return rows as RowDataPacket[];
};

// Get asset purchase by ID
export const getAssetPurchaseById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetPurchaseTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

// Get asset purchases by asset ID
export const getAssetPurchasesByAssetId = async (assetId: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetPurchaseTable} WHERE asset_id = ? ORDER BY id DESC`, [assetId]);
  return rows as RowDataPacket[];
};

// Update asset purchase
export const updateAssetPurchase = async (id: number, data: AssetPurchase) => {
  const {
    asset_id,
    received_date,
    do_no,
    do_date,
    inv_no,
    inv_date,
    po_no,
    po_date,
    pr_no,
    pr_date,
    department_id,
    costcenter_id,
    ramco_id,
    requested_date
  } = data;

  const [result] = await pool.query(
    `UPDATE ${assetPurchaseTable} 
     SET asset_id = ?, received_date = ?, do_no = ?, do_date = ?, inv_no = ?, inv_date = ?, 
         po_no = ?, po_date = ?, pr_no = ?, pr_date = ?, department_id = ?, costcenter_id = ?, 
         ramco_id = ?, requested_date = ?
     WHERE id = ?`,
    [asset_id, received_date, do_no, do_date, inv_no, inv_date, po_no, po_date, pr_no, pr_date, department_id, costcenter_id, ramco_id, requested_date, id]
  );
  return result as ResultSetHeader;
};

// Delete asset purchase
export const deleteAssetPurchase = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetPurchaseTable} WHERE id = ?`, [id]);
  return result as ResultSetHeader;
};

// Get asset purchases by department
export const getAssetPurchasesByDepartment = async (departmentId: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetPurchaseTable} WHERE department_id = ? ORDER BY id DESC`, [departmentId]);
  return rows as RowDataPacket[];
};

// Get asset purchases by cost center
export const getAssetPurchasesByCostCenter = async (costcenterId: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetPurchaseTable} WHERE costcenter_id = ? ORDER BY id DESC`, [costcenterId]);
  return rows as RowDataPacket[];
};

// Get asset purchases by employee
export const getAssetPurchasesByEmployee = async (ramcoId: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetPurchaseTable} WHERE ramco_id = ? ORDER BY id DESC`, [ramcoId]);
  return rows as RowDataPacket[];
};
