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
const dbBillings = 'billings';
const dbAssets = 'assets';
const dbApps = 'applications';
const vehicleMaintenanceTable = `${dbBillings}.tbl_inv`;
const vehicleMaintenancePartsTable = `${dbBillings}.tbl_inv_part`;
const workshopTable = `${dbBillings}.costws`;
const fuelBillingTable = `${dbBillings}.fuel_stmt`;
const fuelVehicleAmountTable = `${dbBillings}.fuel_stmt_detail`;
const fuelIssuerTable = `${dbBillings}.costfuel`;
const fleetCardTable = `${dbBillings}.fleet2`;
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
  const [rows] = await pool2.query(`SELECT * FROM ${fuelBillingTable} ORDER BY stmt_id DESC`);
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
      stmt_no, stmt_date, stmt_litre, stmt_stotal, stmt_disc, stmt_total, stmt_ron95, stmt_ron97, stmt_diesel, stmt_issuer, petrol, diesel, stmt_count, stmt_total_odo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.stmt_no, data.stmt_date, data.stmt_litre, data.stmt_stotal, data.stmt_disc, data.stmt_total, data.stmt_ron95, data.stmt_ron97, data.stmt_diesel, data.stmt_issuer, data.petrol_amount, data.diesel_amount, data.stmt_count, data.stmt_total_km ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateFuelBilling = async (id: number, data: any): Promise<void> => {
  await pool2.query(
    `UPDATE ${fuelBillingTable} SET stmt_no = ?, stmt_date = ?, stmt_litre = ?, stmt_stotal = ?, stmt_disc = ?, stmt_total = ?, stmt_ron95 = ?, stmt_ron97 = ?, stmt_diesel = ?, stmt_issuer = ?, petrol = ?, diesel = ?, stmt_count = ?, stmt_total_odo = ? WHERE stmt_id = ?`,
    [ data.stmt_no, data.stmt_date, data.stmt_litre, data.stmt_stotal, data.stmt_disc, data.stmt_total, data.stmt_ron95, data.stmt_ron97, data.stmt_diesel, data.stmt_issuer, data.petrol_amount, data.diesel_amount, data.stmt_count, data.stmt_total_km, id ]
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
    `INSERT INTO ${fuelVehicleAmountTable} (stmt_id, stmt_date, fc_id, asset_id, cc_id, category, start_odo, end_odo, total_km, total_litre, effct, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.stmt_id, data.stmt_date, data.card_id, data.asset_id, data.costcenter_id, data.category, data.start_odo, data.end_odo, data.total_km, data.total_litre, data.efficiency, data.amount ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateFuelVehicleAmount = async (id: number, data: any): Promise<void> => {
  await pool2.query(
    `UPDATE ${fuelVehicleAmountTable} SET stmt_id = ?, stmt_date = ?, fc_id = ?, asset_id = ?, cc_id = ?, category = ?, start_odo = ?, end_odo = ?, total_km = ?, total_litre = ?, effct = ?, amount = ? WHERE s_id = ?`,
    [ data.stmt_id, data.stmt_date, data.card_id, data.asset_id, data.costcenter_id, data.category, data.start_odo, data.end_odo, data.total_km, data.total_litre, data.efficiency, data.amount, id ]
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
  const [rows] = await pool2.query(`SELECT * FROM ${fleetCardTable} WHERE status = 'active' ORDER BY bill_order_no `);
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
      asset_id, costcenter_id, fuel_id, fuel_type, card_no, pin, reg_date, status, expiry_date, category, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.asset_id, data.costcenter_id, data.fuel_id, data.fuel_type, data.card_no, data.pin, data.reg_date, data.status, data.expiry_date, data.category, data.remarks ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateFleetCard = async (id: number, data: any): Promise<void> => {
  await pool2.query(
    `UPDATE ${fleetCardTable} SET asset_id = ?, costcenter_id = ?, fuel_id = ?, fuel_type = ?, card_no = ?, pin = ?, reg_date = ?, status = ?, expiry_date = ?, category = ?, remarks = ? WHERE id = ?`,
    [ data.asset_id, data.costcenter_id, data.fuel_id, data.fuel_type, data.card_no, data.pin, data.reg_date, data.status, data.expiry_date, data.category, data.remarks, id ]
  );
  // If costcenter_id is present, also update asset_data.costcenter_id
  if (data.asset_id && data.costcenter_id) {
    // Use pool for assetdata DB
    await pool.query(
      `UPDATE assetdata.asset_data SET costcenter_id = ? WHERE id = ?`,
      [data.costcenter_id, data.asset_id]
    );
  }
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