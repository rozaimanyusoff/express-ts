import { pool, pool2 } from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface VehicleMaintenance {
  inv_id: number;
  inv_no: string;
  inv_date: string;
  svc_order: string;
  asset_id: number;
  cc_id: number;
  loc_id: number;
  ws_id: number;
  svc_date: string;
  svc_odo: string;
  inv_total: string;
  inv_stat: string;
  inv_remarks: string | null;
  running_no: number;
}

// Database and table declarations
const db = 'billings';
const billingTable = `${db}.billings`;
const vehicleMaintenanceTable = `${db}.tbl_inv`;
const vehicleMaintenancePartsTable = `${db}.tbl_inv_part`;
const workshopTable = `${db}.costws`;

/* =========== VEHICLE MAINTENANCE PARENT TABLE =========== */

export const getVehicleMaintenance = async (): Promise<VehicleMaintenance[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${vehicleMaintenanceTable}`);
  return rows as VehicleMaintenance[];
};

export const getVehicleMaintenanceById = async (id: number): Promise<VehicleMaintenance | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${vehicleMaintenanceTable} WHERE inv_id = ?`, [id]);
  const VehicleMaintenance = (rows as VehicleMaintenance[])[0];
  return VehicleMaintenance || null;
};

export const createVehicleMaintenance = async (data: Partial<VehicleMaintenance>): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${vehicleMaintenanceTable} (
      inv_no, inv_date, svc_order, asset_id, cc_id, loc_id, ws_id, svc_date, svc_odo, inv_total, inv_stat, inv_remarks, running_no
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.inv_no,
      data.inv_date,
      data.svc_order,
      data.asset_id,
      data.cc_id,
      data.loc_id,
      data.ws_id,
      data.svc_date,
      data.svc_odo,
      data.inv_total,
      data.inv_stat,
      data.inv_remarks,
      data.running_no
    ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateVehicleMaintenance = async (id: number, data: Partial<VehicleMaintenance>): Promise<void> => {
  await pool2.query(
    `UPDATE ${vehicleMaintenanceTable} SET 
      inv_no = ?,
      inv_date = ?,
      svc_order = ?,
      asset_id = ?,
      cc_id = ?,
      loc_id = ?,
      ws_id = ?,
      svc_date = ?,
      svc_odo = ?,
      inv_total = ?,
      inv_stat = ?,
      inv_remarks = ?,
      running_no = ?
    WHERE inv_id = ?`,
    [
      data.inv_no,
      data.inv_date,
      data.svc_order,
      data.asset_id,
      data.cc_id,
      data.loc_id,
      data.ws_id,
      data.svc_date,
      data.svc_odo,
      data.inv_total,
      data.inv_stat,
      data.inv_remarks,
      data.running_no,
      id
    ]
  );
};

export const deleteVehicleMaintenance = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${vehicleMaintenanceTable} WHERE id = ?`, [id]);
};

/* =========== VEHICLE MAINTENANCE PARTS TABLE ============= */

export const getVehicleMaintenanceParts = async (maintenanceId: number): Promise<VehicleMaintenance[]> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${vehicleMaintenancePartsTable} WHERE inv_id = ?`,
    [maintenanceId]
  );
  return rows as VehicleMaintenance[];
};

export const getVehicleMaintenancePartById = async (id: number): Promise<VehicleMaintenance | null> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${vehicleMaintenancePartsTable} WHERE inv_id = ?`,
    [id]
  );
  const part = (rows as VehicleMaintenance[])[0];
  return part || null;
};

export const getVehicleMaintenanceByDate = async (from: string, to: string): Promise<VehicleMaintenance[]> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${vehicleMaintenanceTable} WHERE inv_date BETWEEN ? AND ? ORDER BY inv_date DESC`,
    [from, to]
  );
  return rows as VehicleMaintenance[];
};

/* ============= WORKSHOP TABLE ============ */

export const getWorkshops = async (): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${workshopTable}`);
  return rows as any[];
};

export const getWorkshopById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${workshopTable} WHERE ws_id = ?`, [id]);
  const workshop = (rows as any[])[0];
  return workshop || null;
};

