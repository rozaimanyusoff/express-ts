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
const dbAssets = 'assets';
const dbApps = 'applications';
const billingTable = `${db}.billings`;
const vehicleMaintenanceTable = `${db}.tbl_inv`;
const vehicleMaintenancePartsTable = `${db}.tbl_inv_part`;
const workshopTable = `${db}.costws`;
const fuelBillingTable = `${db}.fuel_stmt`;
const fuelVehicleAmountTable = `${db}.fuel_stmt_detail`;
const fuelIssuerTable = `${db}.costfuel`;
const fleetCardTable = `${db}.fleet2`;
const serviceOptionsTable = `${dbApps}.svctype`;

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
    [ data.inv_no, data.inv_date, data.svc_order, data.asset_id, data.cc_id, data.loc_id, data.ws_id, data.svc_date, data.svc_odo, data.inv_total, data.inv_stat, data.inv_remarks, data.running_no ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateVehicleMaintenance = async (id: number, data: Partial<VehicleMaintenance>): Promise<void> => {
  await pool2.query(
    `UPDATE ${vehicleMaintenanceTable} SET inv_no = ?, inv_date = ?, svc_order = ?, asset_id = ?, cc_id = ?, loc_id = ?, ws_id = ?, svc_date = ?, svc_odo = ?, inv_total = ?, inv_stat = ?, inv_remarks = ?, running_no = ? WHERE inv_id = ?`,
    [ data.inv_no, data.inv_date, data.svc_order, data.asset_id, data.cc_id, data.loc_id, data.ws_id, data.svc_date,
      data.svc_odo, data.inv_total, data.inv_stat, data.inv_remarks, data.running_no,id ]
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

/* =================================== WORKSHOP TABLE ========================================== */

export const getWorkshops = async (): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${workshopTable} ORDER BY ws_id DESC`);
  return rows as any[];
};

export const getWorkshopById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${workshopTable} WHERE ws_id = ?`, [id]);
  const workshop = (rows as any[])[0];
  return workshop || null;
};

export const createWorkshop = async (data: any): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${workshopTable} (
      ws_type, ws_name, ws_add, ws_ctc, ws_pic, ws_branch, ws_rem, ws_panel, ws_stat, agreement_date_from, agreement_date_to, sub_no
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.ws_type, data.ws_name, data.ws_add, data.ws_ctc, data.ws_pic, data.ws_branch, data.ws_rem, data.ws_panel, data.ws_stat, data.agreement_date_from, data.agreement_date_to, data.sub_no ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateWorkshop = async (id: number, data: any): Promise<void> => {
  await pool2.query(
    `UPDATE ${workshopTable} SET ws_type = ?, ws_name = ?, ws_add = ?, ws_ctc = ?, ws_pic = ?, ws_branch = ?, ws_rem = ?, ws_panel = ?, ws_stat = ?, agreement_date_from = ?, agreement_date_to = ?, sub_no = ? WHERE ws_id = ?`,
    [ data.ws_type, data.ws_name, data.ws_add, data.ws_ctc, data.ws_pic, data.ws_branch, data.ws_rem, data.ws_panel, data.ws_stat, data.agreement_date_from, data.agreement_date_to, data.sub_no, id ]
  );
};

export const deleteWorkshop = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${workshopTable} WHERE ws_id = ?`, [id]);
};

/*  ================================= FUEL STATEMENT TABLE ======================================== */

export const getFuelBilling = async (): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fuelBillingTable} ORDER BY stmt_date DESC`);
  return rows as any[];
};

export const getFuelBillingById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fuelBillingTable} WHERE stmt_id = ?`, [id]);
  const fuelBilling = (rows as any[])[0];
  return fuelBilling || null;
};

export const createFuelBilling = async (data: any): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${fuelBillingTable} (
      fuel_id, stmt_no, stmt_date, stmt_issuer, stmt_ron95, stmt_ron97, stmt_diesel, bill_payment, stmt_count, stmt_litre, stmt_total_odo, stmt_stotal, stmt_tax, stmt_rounding, stmt_disc, stmt_total, stmt_entry
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.fuel_id, data.stmt_no, data.stmt_date, data.stmt_issuer, data.stmt_ron95, data.stmt_ron97, data.stmt_diesel, data.bill_payment, data.stmt_count, data.stmt_litre, data.stmt_total_odo, data.stmt_stotal, data.stmt_tax, data.stmt_rounding, data.stmt_disc, data.stmt_total, data.stmt_entry ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateFuelBilling = async (id: number, data: any): Promise<void> => {
  await pool2.query(
    `UPDATE ${fuelBillingTable} SET fuel_id = ?, stmt_no = ?, stmt_date = ?, stmt_issuer = ?, stmt_ron95 = ?, stmt_ron97 = ?, stmt_diesel = ?, bill_payment = ?, stmt_count = ?, stmt_litre = ?, stmt_total_odo = ?, stmt_stotal = ?, stmt_tax = ?, stmt_rounding = ?, stmt_disc = ?, stmt_total = ?, stmt_entry = ? WHERE stmt_id = ?`,
    [ data.fuel_id, data.stmt_no, data.stmt_date, data.stmt_issuer, data.stmt_ron95, data.stmt_ron97, data.stmt_diesel, data.bill_payment, data.stmt_count, data.stmt_litre, data.stmt_total_odo, data.stmt_stotal, data.stmt_tax, data.stmt_rounding, data.stmt_disc, data.stmt_total, data.stmt_entry,id ]
  );
};

export const deleteFuelBilling = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${fuelBillingTable} WHERE stmt_id = ?`, [id]);
};


/* ===== FUEL BILLING BY DATE ===== */

export const getFuelBillingByDate = async (from: string, to: string): Promise<any[]> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${fuelBillingTable} WHERE stmt_date BETWEEN ? AND ? ORDER BY stmt_date DESC`,
    [from, to]
  );
  return rows as any[];
};

/* ===== FUEL BILLING AMOUNT BY VEHICLE ===== */

export const getFuelVehicleAmount = async (fuelId: number): Promise<any[]> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${fuelVehicleAmountTable} WHERE stmt_id = ?`,
    [fuelId]
  );
  return rows as any[];
};

export const getFuelVehicleAmountById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${fuelVehicleAmountTable} WHERE stmt_id = ?`,
    [id]
  );
  const amount = (rows as any[])[0];
  return amount || null;
};

export const createFuelVehicleAmount = async (data: any): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${fuelVehicleAmountTable} (
      stmt_id, fuel_id, vehicle_id, cc_id, loc_id, stmt_date, reg_no, costctr, location, claim_issuer, fuel_type, total_litre, start_odo, end_odo, total_km, effct, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.stmt_id, data.fuel_id, data.vehicle_id, data.cc_id, data.loc_id, data.stmt_date, data.reg_no, data.costctr, data.location, data.claim_issuer, data.fuel_type, data.total_litre, data.start_odo, data.end_odo, data.total_km, data.effct, data.amount ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateFuelVehicleAmount = async (id: number, data: any): Promise<void> => {
  await pool2.query(
    `UPDATE ${fuelVehicleAmountTable} SET stmt_id = ?, fuel_id = ?, vehicle_id = ?, cc_id = ?, loc_id = ?, stmt_date = ?, reg_no = ?, costctr = ?, location = ?, claim_issuer = ?, fuel_type = ?, total_litre = ?, start_odo = ?, end_odo = ?, total_km = ?,
      effct = ?, amount = ? WHERE s_id = ?`,
    [ data.stmt_id, data.fuel_id, data.vehicle_id, data.cc_id, data.loc_id, data.stmt_date, data.reg_no, data.costctr, data.location, data.claim_issuer, data.fuel_type, data.total_litre, data.start_odo, data.end_odo, data.total_km, data.effct, data.amount, id ]
  );
};

export const deleteFuelVehicleAmount = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${fuelVehicleAmountTable} WHERE stmt_id = ?`, [id]);
};


/* =================== FUEL ISSUER TABLE ======================== */

export const getFuelIssuer = async (): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fuelIssuerTable}`);
  return rows as any[];
};


export const getFuelIssuerById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fuelIssuerTable} WHERE fuel_id = ?`, [id]);
  const fuelIssuer = (rows as any[])[0];
  return fuelIssuer || null;
};

export const createFuelIssuer = async (data: any): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${fuelIssuerTable} (
      f_issuer, f_imgpath, image2
    ) VALUES (?, ?, ?)`,
    [ data.f_issuer, data.f_imgpath, data.image2 ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateFuelIssuer = async (id: number, data: any): Promise<void> => {
  await pool2.query(
    `UPDATE ${fuelIssuerTable} SET f_issuer = ?, f_imgpath = ?, image2 = ? WHERE fuel_id = ?`,
    [ data.f_issuer, data.f_imgpath, data.image2, id ]
  );
};

/* =================== FLEET CARD TABLE ========================== */

export const getFleetCards = async (): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fleetCardTable} WHERE status = 'active' ORDER BY id DESC`);
  return rows as any[];
};
export const getFleetCardById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fleetCardTable} WHERE id = ?`, [id]);
  const fleetCard = (rows as any[])[0];
  return fleetCard || null;
};

export const createFleetCard = async (data: any): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${fleetCardTable} (
      asset_id, costcenter_id, fuel_id, card_no, pin, reg_date, status, expiry_date, category, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.asset_id, data.costcenter_id, data.fuel_id, data.card_no, data.pin, data.reg_date, data.status, data.expiry_date, data.category, data.remarks ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateFleetCard = async (id: number, data: any): Promise<void> => {
  await pool2.query(
    `UPDATE ${fleetCardTable} SET asset_id = ?, costcenter_id = ?, fuel_id = ?, card_no = ?, pin = ?, reg_date = ?, status = ?, expiry_date = ?, category = ?, remarks = ? WHERE id = ?`,
    [ data.asset_id, data.costcenter_id, data.fuel_id, data.card_no, data.pin, data.reg_date, data.status, data.expiry_date, data.category, data.remarks, id ]
  );
};

/* =================== SERVICE OPTION TABLE ========================== */

export const getServiceOptions = async (): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${serviceOptionsTable} ORDER BY svcTypeId DESC`);
  return rows as any[];
};
export const getServiceOptionById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${serviceOptionsTable} WHERE svcTypeId = ?`, [id]);
  const serviceOption = (rows as any[])[0];
  return serviceOption || null;
};
export const createServiceOption = async (data: any): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${serviceOptionsTable} (
      svcType, svcOpt, group_desc
    ) VALUES (?, ?, ?)`,
    [ data.svcType, data.svcOpt, data.group_desc ]
  );
  return (result as ResultSetHeader).insertId;
};
export const updateServiceOption = async (id: number, data: any): Promise<void> => {
  await pool2.query(
    `UPDATE ${serviceOptionsTable} SET svcType = ?, svcOpt = ?, group_desc = ? WHERE svcTypeId = ?`,
    [ data.svcType, data.svcOpt, data.group_desc, id ]
  );
};