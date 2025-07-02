// src/p.billing/billingModel.ts
// Boilerplate Billing Model
import pool from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Billing {
  id: number;
  invoice_no: string;
  customer_id: number;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// Database and table declarations
const db = 'billings';
const billingTable = `${db}.billings`;
const vehicleMaintenanceTable = `${db}.tbl_inv`;

export const getVehicleMaintenanceBilling = async (): Promise<Billing[]> => {
  const [rows] = await pool.query(`SELECT * FROM ${vehicleMaintenanceTable}`);
  return rows as Billing[];
};

export const getBillingById = async (id: number): Promise<Billing | null> => {
  const [rows] = await pool.query(`SELECT * FROM ${billingTable} WHERE id = ?`, [id]);
  const billing = (rows as Billing[])[0];
  return billing || null;
};

export const createBilling = async (data: Partial<Billing>): Promise<number> => {
  const [result] = await pool.query(
    `INSERT INTO ${billingTable} (invoice_no, customer_id, amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [data.invoice_no, data.customer_id, data.amount, data.status]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateBilling = async (id: number, data: Partial<Billing>): Promise<void> => {
  await pool.query(
    `UPDATE ${billingTable} SET invoice_no = ?, customer_id = ?, amount = ?, status = ?, updated_at = NOW() WHERE id = ?`,
    [data.invoice_no, data.customer_id, data.amount, data.status, id]
  );
};

export const deleteBilling = async (id: number): Promise<void> => {
  await pool.query(`DELETE FROM ${billingTable} WHERE id = ?`, [id]);
};
