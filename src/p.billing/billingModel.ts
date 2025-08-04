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
const fleetCardHistoryTable = `${dbBillings}.fleet_history`;
const serviceOptionsTable = `${dbApps}.svctype`;
const tempVehicleRecordTable = `${dbAssets}.vehicle`;
const tempVehicleRecordDetailsTable = `${dbAssets}.vehicle_dt`;

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
  const [rows] = await pool2.query(`SELECT * FROM ${fleetCardTable} ORDER BY bill_order_no `);
  return rows as any[];
};
export const getFleetCardById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fleetCardTable} WHERE id = ?`, [id]);
  const fleetCard = (rows as any[])[0];
  return fleetCard || null;
};

export const createFleetCard = async (data: any): Promise<number> => {
  // Check for duplicate card_no
  const [existingRows] = await pool2.query(
    `SELECT id FROM ${fleetCardTable} WHERE card_no = ? LIMIT 1`,
    [data.card_no]
  );
  if (Array.isArray(existingRows) && existingRows.length > 0) {
    // Duplicate found, return -1 or throw error
    throw new Error('Fleet card with this card_no already exists.');
    // Or: return (existingRows[0] as any).id;
  }

  const [result] = await pool2.query(
    `INSERT INTO ${fleetCardTable} (
      vehicle_id, fuel_id, card_no, pin, reg_date, status, expiry_date, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.vehicle_id, data.fuel_id, data.card_no, data.pin, data.reg_date, data.status, data.expiry_date, data.remarks ]
  );

  const cardId = (result as ResultSetHeader).insertId;

  // Update card_id in tempVehicleRecordTable
  if (data.vehicle_id) {
    await pool2.query(
      `UPDATE ${tempVehicleRecordTable} SET card_id = ? WHERE vehicle_id = ?`,
      [cardId, data.vehicle_id]
    );
  }

  return cardId;
};

export const updateFleetCard = async (id: number, data: any): Promise<void> => {
  // Fetch current values for comparison
  const [currentRows] = await pool2.query(
    `SELECT vehicle_id FROM ${fleetCardTable} WHERE id = ?`,
    [id]
  );
  const current = Array.isArray(currentRows) && currentRows.length > 0 ? (currentRows[0] as any) : null;
  let assetChanged = false;
  if (current) {
    assetChanged = data.vehicle_id !== undefined && data.vehicle_id !== current.vehicle_id;
    if (assetChanged) {
      // Insert into history table
      await pool2.query(
        `INSERT INTO ${fleetCardHistoryTable} (card_id, old_asset_id, new_asset_id, changed_at) VALUES (?, ?, ?, NOW())`,
        [id, current.vehicle_id, data.vehicle_id ?? current.vehicle_id]
      );

      // Update card_id in tempVehicleRecordTable
      await pool2.query(
        `UPDATE ${tempVehicleRecordTable} SET card_id = ? WHERE vehicle_id = ?`,
        [id, data.vehicle_id]
      );

      // Set vehicle_id as NULL on old card id
      if (current.vehicle_id) {
        await pool2.query(
          `UPDATE ${fleetCardTable} SET vehicle_id = NULL WHERE id = ?`,
          [current.vehicle_id]
        );
      }
    }
  }
  await pool2.query(
    `UPDATE ${fleetCardTable} SET vehicle_id = ?, fuel_id = ?, card_no = ?, pin = ?, reg_date = ?, status = ?, expiry_date = ?, remarks = ? WHERE id = ?`,
    [ data.vehicle_id, data.fuel_id, data.card_no, data.pin, data.reg_date, data.status, data.expiry_date, data.remarks, id ]
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


// ========== TEMP VEHICLE RECORD TABLE (assets.vehicle) CRUD ==========
export interface TempVehicleRecord {
  vehicle_id: number;
  vehicle_regno: string;
  vehicle_make: string;
  make_id: number;
  vehicle_model: string;
  model_id: number;
  vehicle_type: string;
  vtype_id: number;
  vchassis_no: string;
  vengine_no: string;
  vtrans_type: string;
  vfuel_type: string;
  ft_id: number;
  fuel_id: number;
  fc_id: number;
  vcubic: string;
  v_dop: string;
  v_lend: string;
  v_hp: string;
  v_instmt: string;
  v_tenure: number;
  v_insurer: string;
  rt_id: number;
  v_policy: string;
  v_insexp: string;
  v_ncdrate: string;
  v_rtexp: string;
  v_insdate: string;
  vdept: string;
  dept_id: number;
  v_costctr: string;
  vsect: string;
  vloc: string;
  cc_id: number;
  loc_id: number;
  vdrv: string;
  ramco_id: string;
  vcod1: string;
  vcod2: string;
  v_stat: string;
  v_fcno: string;
  v_fcpin: string;
  v_fcrem: string;
  v_disp: string;
  v_return_date: string;
  avls_availability: string;
  avls_install_date: string;
  avls_uninstall_date: string;
  avls_transfer_date: string;
  classification: string;
  record_status: string;
  purpose: string;
  condition_status: string;
  [key: string]: any;
}

export const getTempVehicleRecords = async (): Promise<TempVehicleRecord[]> => {
  const [rows] = await pool2.query(`SELECT vehicle_id, vehicle_regno, category_id, brand_id, model_id, vtrans_type, vfuel_type, v_dop, card_id, cc_id, dept_id, ramco_id, classification, record_status, purpose, condition_status FROM ${tempVehicleRecordTable} ORDER BY vehicle_regno`);
  return rows as TempVehicleRecord[];
};

export const getTempVehicleRecordById = async (id: number): Promise<TempVehicleRecord | null> => {
  const [rows] = await pool2.query(`SELECT vehicle_id, vehicle_regno, category_id, brand_id, model_id, vtrans_type, vfuel_type, v_dop, card_id, cc_id, dept_id, ramco_id, classification, record_status, purpose, condition_status FROM ${tempVehicleRecordTable} WHERE vehicle_id = ?`, [id]);
  const record = (rows as TempVehicleRecord[])[0];
  return record || null;
};

export const createTempVehicleRecord = async (data: Partial<TempVehicleRecord>): Promise<number> => {
  // Check for duplicate vehicle_regno
  if (data.vehicle_regno) {
    const [existingRows] = await pool2.query(
      `SELECT vehicle_id FROM ${tempVehicleRecordTable} WHERE vehicle_regno = ? LIMIT 1`,
      [data.vehicle_regno]
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      throw new Error('A record with this vehicle_regno already exists.');
    }
  }

  await pool2.query(
    `INSERT INTO ${tempVehicleRecordTable} (
      brand_id, category_id, cc_id, classification, condition_status, dept_id, model_id, purpose, ramco_id, record_status, v_dop, vehicle_regno, vfuel_type, vtrans_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
    [ data.brand_id, data.category_id, data.cc_id, data.classification, data.condition_status, data.dept_id, data.model_id, data.purpose, data.ramco_id, data.record_status, data.vehicle_regno, data.vfuel_type, data.vtrans_type ]
  );

  const [result] = await pool2.query(`SELECT LAST_INSERT_ID() AS vehicle_id`);
  const vehicleId = (result as RowDataPacket[])[0].vehicle_id;

  // Log creation to tempVehicleRecordDetailsTable
  await pool2.query(
    `INSERT INTO ${tempVehicleRecordDetailsTable} (vehicle_id, cc_id, dept_id, ramco_id, v_datechg) VALUES (?, ?, ?, ?, NOW())`,
    [vehicleId, data.cc_id, data.dept_id, data.ramco_id]
  );

  return vehicleId;
};

export const updateTempVehicleRecord = async (id: number, data: Partial<TempVehicleRecord>): Promise<void> => {
  await pool2.query(
    `UPDATE ${tempVehicleRecordTable} SET brand_id = ?, category_id = ?, cc_id = ?, classification = ?, condition_status = ?, dept_id = ?, model_id = ?, purpose = ?, ramco_id = ?, record_status = ?, vfuel_type = ?, vtrans_type = ? WHERE vehicle_id = ?`,
    [ data.brand_id, data.category_id, data.cc_id, data.classification, data.condition_status, data.dept_id,  data.model_id, data.purpose, data.ramco_id, data.record_status, data.vfuel_type, data.vtrans_type, id]
  );

  // Log update to tempVehicleRecordDetailsTable
  await pool2.query(
    `INSERT INTO ${tempVehicleRecordDetailsTable} (vehicle_id, cc_id, dept_id, ramco_id, v_datechg) VALUES (?, ?, ?, ?, NOW())`,
    [id, data.cc_id, data.dept_id, data.ramco_id]
  );
};

export const deleteTempVehicleRecord = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${tempVehicleRecordTable} WHERE vehicle_id = ?`, [id]);
};