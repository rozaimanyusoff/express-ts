import { pool, pool2 } from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';


// Database and table declarations
const dbBillings = 'billings';
const dbAssets = 'assets';
const dbApps = 'applications';
const vehicleMtnBillingTable = `${dbBillings}.tbl_inv`;
const vehicleMtnBillingPartTable = `${dbBillings}.tbl_inv_part`;
const workshopTable = `${dbBillings}.costws`;
const fuelBillingTable = `${dbBillings}.fuel_stmt`;
const fuelVehicleAmountTable = `${dbBillings}.fuel_stmt_detail`;
const fuelVendorTable = `${dbBillings}.fuel_vendor`;
const fleetCardTable = `${dbBillings}.fleet2`;
const fleetCardHistoryTable = `${dbBillings}.fleet_history`;
const fleetAssetJoinTable = `${dbBillings}.fleet_asset`;
const utilitiesTable = `${dbBillings}.tbl_util`;
const billingAccountTable = `${dbBillings}.costbill2`;
const beneficiaryTable = `${dbBillings}.costbfcy`;

const vehicleMtnAppTable = `${dbApps}.vehicle_svc`; // index field: req_id
const serviceOptionsTable = `${dbApps}.svctype`;

const tempVehicleRecordTable = `${dbAssets}.vehicle`;
const tempVehicleRecordDetailsTable = `${dbAssets}.vehicle_dt`;


/* =========== VEHICLE MAINTENANCE BILLING PARENT TABLE =========== */

export interface VehicleMaintenance {
  inv_id: number;
  inv_no: string;
  inv_date: string;
  svc_order: string;
  vehicle_id: number;
  costcenter_id: number;
  location_id: number;
  ws_id: number;
  svc_date: string;
  svc_odo: string;
  inv_total: string;
  inv_stat: string;
  inv_remarks: string | null;
  running_no: number;
}

export const getVehicleMtnBillings = async (): Promise<VehicleMaintenance[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${vehicleMtnBillingTable} ORDER BY inv_id DESC`);
  return rows as VehicleMaintenance[];
};

export const getVehicleMtnBillingById = async (id: number): Promise<VehicleMaintenance | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${vehicleMtnBillingTable} WHERE inv_id = ?`, [id]);
  const VehicleMaintenance = (rows as VehicleMaintenance[])[0];
  return VehicleMaintenance || null;
};

export const createVehicleMtnBilling = async (data: Partial<VehicleMaintenance>): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${vehicleMtnBillingTable} (
      inv_no, inv_date, svc_order, vehicle_id, costcenter_id, location_id, ws_id, svc_date, svc_odo, inv_total, inv_stat, inv_remarks, running_no
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.inv_no, data.inv_date, data.svc_order, data.vehicle_id, data.costcenter_id, data.location_id, data.ws_id, data.svc_date, data.svc_odo, data.inv_total, data.inv_stat, data.inv_remarks, data.running_no ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateVehicleMtnBilling = async (id: number, data: Partial<VehicleMaintenance>): Promise<void> => {
  await pool2.query(
    `UPDATE ${vehicleMtnBillingTable} SET inv_no = ?, inv_date = ?, svc_order = ?, vehicle_id = ?, costcenter_id = ?, location_id = ?, ws_id = ?, svc_date = ?, svc_odo = ?, inv_total = ?, inv_stat = ?, inv_remarks = ?, running_no = ? WHERE inv_id = ?`,
    [ data.inv_no, data.inv_date, data.svc_order, data.vehicle_id, data.costcenter_id, data.location_id, data.ws_id, data.svc_date,
      data.svc_odo, data.inv_total, data.inv_stat, data.inv_remarks, data.running_no,id ]
  );
};

export const deleteVehicleMtnBilling = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${vehicleMtnBillingTable} WHERE id = ?`, [id]);
};

/* =========== VEHICLE MAINTENANCE BILLING PARTS TABLE ============= */
// Obtain vehicle maintenance parts by maintenance ID
export const getVehicleMtnBillingParts = async (maintenanceId: number): Promise<VehicleMaintenance[]> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${vehicleMtnBillingPartTable} WHERE inv_id = ?`,
    [maintenanceId]
  );
  return rows as VehicleMaintenance[];
};

export const getVehicleMtnBillingPartById = async (id: number): Promise<VehicleMaintenance | null> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${vehicleMtnBillingPartTable} WHERE inv_id = ?`,
    [id]
  );
  const part = (rows as VehicleMaintenance[])[0];
  return part || null;
};

export const getVehicleMtnBillingByDate = async (from: string, to: string): Promise<VehicleMaintenance[]> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${vehicleMtnBillingTable} WHERE inv_date BETWEEN ? AND ? ORDER BY inv_date DESC`,
    [from, to]
  );
  return rows as VehicleMaintenance[];
};

export const getVehicleMtnBillingByAssetId = async (assetId: number): Promise<VehicleMaintenance[]> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${vehicleMtnBillingTable} WHERE asset_id = ? ORDER BY inv_date DESC, inv_id DESC`,
    [assetId]
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
  // Check for duplicate entry based on stmt_no, stmt_date, and stmt_issuer
  const [existingRows] = await pool2.query(
    `SELECT stmt_id FROM ${fuelBillingTable} WHERE stmt_no = ? AND stmt_date = ? AND stmt_issuer = ? LIMIT 1`,
    [data.stmt_no, data.stmt_date, data.stmt_issuer]
  );
  
  if (Array.isArray(existingRows) && existingRows.length > 0) {
    throw new Error('Fuel billing with this statement number, date, and issuer already exists.');
  }

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
    `INSERT INTO ${fuelVehicleAmountTable} (stmt_id, stmt_date, card_id, vehicle_id, costcenter_id, purpose, start_odo, end_odo, total_km, total_litre, effct, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.stmt_id, data.stmt_date, data.card_id, data.vehicle_id, data.costcenter_id, data.category, data.start_odo, data.end_odo, data.total_km, data.total_litre, data.efficiency, data.amount ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateFuelVehicleAmount = async (id: number, data: any): Promise<void> => {
  await pool2.query(
    `UPDATE ${fuelVehicleAmountTable} SET stmt_id = ?, stmt_date = ?, card_id = ?, vehicle_id = ?, costcenter_id = ?, purpose = ?, start_odo = ?, end_odo = ?, total_km = ?, total_litre = ?, effct = ?, amount = ? WHERE s_id = ?`,
    [ data.stmt_id, data.stmt_date, data.card_id, data.vehicle_id, data.costcenter_id, data.category, data.start_odo, data.end_odo, data.total_km, data.total_litre, data.efficiency, data.amount, id ]
  );
};

export const deleteFuelVehicleAmount = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${fuelVehicleAmountTable} WHERE stmt_id = ?`, [id]);
};

// Delete a single fuel vehicle amount row by s_id (detail row id)
export const deleteFuelVehicleAmountBySid = async (sid: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${fuelVehicleAmountTable} WHERE s_id = ?`, [sid]);
};

// Fetch all fuel detail rows for a specific vehicle across statements
export const getFuelVehicleAmountByVehicleId = async (vehicleId: number): Promise<any[]> => {
  const [rows] = await pool2.query(
    `SELECT d.*, f.stmt_no, f.stmt_date, f.stmt_total, f.stmt_litre FROM ${fuelVehicleAmountTable} d
     LEFT JOIN ${fuelBillingTable} f ON d.stmt_id = f.stmt_id
     WHERE d.asset_id = ?
     ORDER BY d.stmt_date DESC, d.s_id DESC`,
    [vehicleId]
  );
  return rows as any[];
};


/* =================== FUEL ISSUER TABLE ======================== */

export const getFuelVendor = async (): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fuelVendorTable}`);
  return rows as any[];
};


export const getFuelVendorById = async (id: number): Promise<any | null> => {
  // New schema uses `id` as primary key for fuel_vendor. Support that column.
  const [rows] = await pool2.query(`SELECT * FROM ${fuelVendorTable} WHERE id = ?`, [id]);
  const fuelIssuer = (rows as any[])[0];
  return fuelIssuer || null;
};

export const createFuelVendor = async (data: any): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${fuelVendorTable} (
      name, logo, image2
    ) VALUES (?, ?, ?)`,
    [ data.name, data.logo, data.image2 ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateFuelVendor = async (id: number, data: any): Promise<void> => {
  // Update by `id` column in new schema
  await pool2.query(
    `UPDATE ${fuelVendorTable} SET name = ?, logo = ?, image2 = ? WHERE id = ?`,
    [ data.name, data.logo, data.image2, id ]
  );
};

/* =================== FLEET CARD TABLE ========================== */

export const getFleetCards = async (): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fleetCardTable} ORDER BY register_number`);
  return rows as any[];
};
export const getFleetCardsByVendor = async (vendorId: number): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fleetCardTable} WHERE fuel_id = ? ORDER BY register_number`, [vendorId]);
  return rows as any[];
};
export const getFleetCardById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fleetCardTable} WHERE id = ?`, [id]);
  const fleetCard = (rows as any[])[0];
  return fleetCard || null;
};

export const getFleetCardsByAssetId = async (assetId: number): Promise<any[]> => {
  // First fetch linked card ids from join table
  const [linkRows] = await pool2.query(`SELECT card_id FROM ${fleetAssetJoinTable} WHERE asset_id = ?`, [assetId]);
  let cardIds = Array.isArray(linkRows) ? (linkRows as any[]).map((r: any) => Number(r.card_id)) : [];
  // filter out invalid ids (NaN, null, undefined)
  cardIds = cardIds.filter((id: any) => Number.isFinite(id));
  if (cardIds.length === 0) return [];
  const placeholders = cardIds.map(() => '?').join(',');
  const [rows] = await pool2.query(`SELECT * FROM ${fleetCardTable} WHERE id IN (${placeholders}) ORDER BY id DESC`, cardIds);
  return rows as any[];
};

export const getFleetAssetLinks = async (): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${fleetAssetJoinTable}`);
  return rows as any[];
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
      vehicle_id, asset_id, fuel_id, card_no, pin, reg_date, status, expiry_date, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.vehicle_id, data.asset_id, data.fuel_id, data.card_no, data.pin, data.reg_date, data.status, data.expiry_date, data.remarks ]
  );

  const cardId = (result as ResultSetHeader).insertId;

  // Update card_id in tempVehicleRecordTable
  if (data.asset_id) {
    await pool.query(
      `UPDATE assets.assetdata SET card_id = ? WHERE id = ?`,
      [cardId, data.asset_id]
    );
    // Insert into fleet_asset join table
    await pool2.query(
      `INSERT INTO ${fleetAssetJoinTable} (asset_id, card_id) VALUES (?, ?)`,
      [data.asset_id, cardId]
    );
  }

  return cardId;
};

export const updateFleetCard = async (id: number, data: any): Promise<void> => {
  // Fetch current values for comparison
  const [currentRows] = await pool2.query(
    `SELECT asset_id FROM ${fleetCardTable} WHERE id = ?`,
    [id]
  );
  const current = Array.isArray(currentRows) && currentRows.length > 0 ? (currentRows[0] as any) : null;
  let assetChanged = false;
  if (current) {
    assetChanged = data.asset_id !== undefined && data.asset_id !== current.asset_id;
    if (assetChanged) {
      // Insert into history table
      await pool2.query(
        `INSERT INTO ${fleetCardHistoryTable} (card_id, old_asset_id, new_asset_id, changed_at) VALUES (?, ?, ?, NOW())`,
        [id, current.asset_id, data.asset_id ?? current.asset_id]
      );

      // Update card_id in assetdata
      await pool.query(
        `UPDATE assets.assetdata SET card_id = ? WHERE id = ?`,
        [id, data.asset_id]
      );

      // Set vehicle_id as NULL on old card id
      if (current.asset_id) {
        await pool2.query(
          `UPDATE ${fleetCardTable} SET asset_id = NULL WHERE id = ?`,
          [current.asset_id]
        );
      }
      // Maintain fleet_asset join links: remove old link, add new link if present
      try {
        if (current && current.asset_id) {
          await pool2.query(`DELETE FROM ${fleetAssetJoinTable} WHERE asset_id = ? AND card_id = ?`, [current.asset_id, id]);
        }
        if (data.asset_id) {
          await pool2.query(`INSERT INTO ${fleetAssetJoinTable} (asset_id, card_id) VALUES (?, ?)`, [data.asset_id, id]);
        }
      } catch (e) {
        // silent catch to avoid blocking main update; higher-level logic may surface errors
      }
    }
  }
  await pool2.query(
    `UPDATE ${fleetCardTable} SET asset_id = ?, fuel_id = ?, card_no = ?, pin = ?, reg_date = ?, status = ?, expiry_date = ?, remarks = ? WHERE id = ?`,
    [ data.asset_id, data.fuel_id, data.card_no, data.pin, data.reg_date, data.status, data.expiry_date, data.remarks, id ]
  );
};

// Instantly update fleet card info from fuel billings -- payload data: asset_id, card_id, card_no, costcenter_id, & purpose
export const updateFleetCardFromBilling = async (data: any): Promise<void> => {
  if (!data.asset_id || !data.card_id || !data.card_no || !data.costcenter_id || !data.purpose) {
    throw new Error('Missing required fields for fleet card update');
  }

  // Update the fleet card details
  await pool2.query(
    `UPDATE ${fleetCardTable} SET asset_id = ?, card_no = ?, costcenter_id = ?, purpose = ? WHERE id = ?`,
    [ data.asset_id, data.card_no, data.costcenter_id, data.purpose, data.card_id ]
  );

  // Update the temp vehicle record table
  await pool.query(
    `UPDATE assets.assetdata SET card_id = ?, purpose = ?, cc_id = ? WHERE id = ?`,
    [ data.card_id, data.purpose, data.costcenter_id, data.asset_id ]
  );
}

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


// =================== UTILITIES TABLE CRUD ===================
export interface UtilityBill {
  bill_id: number;
  loc_id: number;
  cc_id: number;
  ubill_date: string;
  ubill_no: string;
  ubill_stotal: string;
  ubill_tax: string;
  ubill_disc: string;
  ubill_round: string;
  ubill_rent: string;
  ubill_bw: string;
  ubill_color: string;
  ubill_gtotal: string;
  ubill_paystat: string;
  ubill_payref: string;
}

export const getUtilityBills = async (): Promise<UtilityBill[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${utilitiesTable} ORDER BY util_id DESC`);
  return rows as UtilityBill[];
};

export const getUtilityBillById = async (util_id: number): Promise<UtilityBill | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${utilitiesTable} WHERE util_id = ?`, [util_id]);
  const bill = (rows as UtilityBill[])[0];
  return bill || null;
};

export const createUtilityBill = async (data: Partial<UtilityBill>): Promise<number> => {
  // Check for duplicate ubill_no and ubill_date
  const [existingRows] = await pool2.query(
    `SELECT util_id FROM ${utilitiesTable} WHERE bill_id = ?, ubill_no = ? AND ubill_date = ? LIMIT 1`,
    [data.bill_id, data.ubill_no, data.ubill_date]
  );
  if (Array.isArray(existingRows) && existingRows.length > 0) {
    throw new Error('Utility bill with this bill number and date already exists.');
  }

  const [result] = await pool2.query(
    `INSERT INTO ${utilitiesTable} (
      bill_id, loc_id, cc_id, ubill_date, ubill_no, ubill_stotal, ubill_tax, ubill_disc, ubill_round, ubill_rent, ubill_bw, ubill_color, ubill_gtotal, ubill_paystat, ubill_payref
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.bill_id, data.loc_id, data.cc_id, data.ubill_date, data.ubill_no, data.ubill_stotal, data.ubill_tax, data.ubill_disc, data.ubill_round, data.ubill_rent, data.ubill_bw, data.ubill_color, data.ubill_gtotal, data.ubill_paystat, data.ubill_payref
    ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateUtilityBill = async (util_id: number, data: Partial<UtilityBill>): Promise<void> => {
  await pool2.query(
    `UPDATE ${utilitiesTable} SET loc_id = ?, cc_id = ?, ubill_date = ?, ubill_no = ?, ubill_stotal = ?, ubill_tax = ?, ubill_disc = ?, ubill_round = ?, ubill_rent = ?, ubill_bw = ?, ubill_color = ?, ubill_gtotal = ?, ubill_paystat = ?, ubill_payref = ? WHERE util_id = ?`,
    [
      data.bill_id, data.loc_id, data.cc_id, data.ubill_date, data.ubill_no, data.ubill_stotal, data.ubill_tax, data.ubill_disc, data.ubill_round, data.ubill_rent, data.ubill_bw, data.ubill_color, data.ubill_gtotal, data.ubill_paystat, data.ubill_payref, util_id
    ]
  );
};

export const deleteUtilityBill = async (util_id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${utilitiesTable} WHERE util_id = ?`, [util_id]);
};

// =================== BILLING ACCOUNT TABLE CRUD ===================
export interface BillingAccount {
  bill_ac: string;
  prepared_by: string;
  bill_product: string;
  bill_desc: string;
  bill_cont_start: string;
  bill_cont_end: string;
  bill_depo: string;
  bill_mth: string;
  bill_stat: string;
  bill_consumable: string;
}
// Helper: normalize various date inputs to MySQL DATE string (YYYY-MM-DD)
const normalizeDateForMySQL = (val: any): string | null => {
  if (val === undefined || val === null) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'string') {
    // If ISO datetime provided like '2000-11-29T00:00:00.000Z', strip to date part
    const tIndex = val.indexOf('T');
    if (tIndex > 0) return val.slice(0, tIndex);
    // If value already looks like YYYY-MM-DD or other date-like string, return as-is
    return val;
  }
  // Fallback: coerce to string and attempt to extract date part
  try {
    const s = String(val);
    const t = s.indexOf('T');
    if (t > 0) return s.slice(0, t);
    return s;
  } catch (e) {
    return null;
  }
};
export const getBillingAccounts = async (): Promise<any[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${billingAccountTable} ORDER BY bfcy_id DESC`);
  return rows as any[];
};

export const getBillingAccountById = async (bill_id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${billingAccountTable} WHERE bill_id = ?`, [bill_id]);
  const account = (rows as any[])[0];
  return account || null;
};

export const createBillingAccount = async (data: any): Promise<number> => {
  // Prevent duplicate billing account by bill_ac + service + cc_id + loc_id
  if (data.bill_ac && data.service !== undefined && data.cc_id !== undefined && data.loc_id !== undefined) {
    const [existingRows] = await pool2.query(
      `SELECT bfcy_id FROM ${billingAccountTable} WHERE bill_ac = ? AND service = ? AND cc_id = ? AND loc_id = ? LIMIT 1`,
      [data.bill_ac, data.service, data.cc_id, data.loc_id]
    );
    if (Array.isArray(existingRows) && (existingRows as any[]).length > 0) {
      throw new Error('duplicate_billing_account');
    }
  }
  const [result] = await pool2.query(
    `INSERT INTO ${billingAccountTable} (
      bill_ac, service, bill_desc, cc_id, loc_id, bill_cont_start, bill_cont_end, bill_depo, bill_mth, bill_stat, bill_consumable
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
  data.bill_ac, data.bill_desc, data.cc_id, data.loc_id,
  normalizeDateForMySQL(data.bill_cont_start), normalizeDateForMySQL(data.bill_cont_end),
  data.bill_depo, data.bill_mth, data.bill_stat, data.bill_consumable
    ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateBillingAccount = async (bill_id: number, data: any): Promise<void> => {
  // Prevent duplicate billing account when updating: same bill_ac+service+cc_id+loc_id owned by another bfcy_id
  if (data.bill_ac && data.service !== undefined && data.cc_id !== undefined && data.loc_id !== undefined) {
    const [existingRows] = await pool2.query(
      `SELECT * FROM ${billingAccountTable} WHERE bill_ac = ? AND service = ? AND cc_id = ? AND loc_id = ? AND bill_id != ? LIMIT 1`,
      [data.bill_ac, data.service, data.cc_id, data.loc_id, bill_id]
    );
    if (Array.isArray(existingRows) && (existingRows as any[]).length > 0) {
      throw new Error('duplicate_billing_account');
    }
  }
  await pool2.query(
    `UPDATE ${billingAccountTable} SET bill_ac = ?, service = ?, bill_desc = ?, cc_id = ?, loc_id = ?, bill_cont_start = ?, bill_cont_end = ?, bill_depo = ?, bill_mth = ?, bill_stat = ?, bill_consumable = ? WHERE bill_id = ?`,
    [
  data.bill_ac, data.service, data.bill_desc, data.cc_id, data.loc_id,
  normalizeDateForMySQL(data.bill_cont_start), normalizeDateForMySQL(data.bill_cont_end),
  data.bill_depo, data.bill_mth, data.bill_stat, data.bill_consumable, bill_id
    ]
  );
};

export const deleteBillingAccount = async (bill_id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${billingAccountTable} WHERE bill_id = ?`, [bill_id]);
};

/* =================== BENEFICIARY (BILLING PROVIDERS) TABLE =================== */

export interface Beneficiary {
  bfcy_id: number;
  name?: string;
  provider?: string;
  logo?: string;
  [key: string]: any;
}

export const getBeneficiaries = async (services?: string | string[]): Promise<any[]> => {
  // services can be undefined, a single string, or an array of strings.
  // Map to bfcy_cat filtering: support comma-separated values in query string.
  if (!services) {
    const [rows] = await pool2.query(`SELECT * FROM ${beneficiaryTable} ORDER BY bfcy_id DESC`);
    return rows as any[];
  }

  // Normalize services to an array of trimmed strings
  const svcArray = Array.isArray(services)
    ? services.reduce<string[]>((acc, s) => acc.concat(String(s).split(',').map(v => v.trim()).filter(Boolean)), [])
    : String(services).split(',').map(v => v.trim()).filter(Boolean);

  if (svcArray.length === 0) {
    const [rows] = await pool2.query(`SELECT * FROM ${beneficiaryTable} ORDER BY bfcy_id DESC`);
    return rows as any[];
  }

  // Build placeholders and params for IN clause
  const placeholders = svcArray.map(() => '?').join(',');
  const sql = `SELECT * FROM ${beneficiaryTable} WHERE bfcy_cat IN (${placeholders}) ORDER BY bfcy_id DESC`;
  const [rows] = await pool2.query(sql, svcArray);
  return rows as any[];
};

export const getBeneficiaryById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${beneficiaryTable} WHERE bfcy_id = ?`, [id]);
  const ben = (rows as any[])[0];
  return ben || null;
};

export const createBeneficiary = async (data: any): Promise<number> => {
  // Prevent duplicate beneficiary by name + category
  if (data.bfcy_name && data.bfcy_cat) {
    const [existing] = await pool2.query(`SELECT bfcy_id FROM ${beneficiaryTable} WHERE bfcy_name = ? AND bfcy_cat = ? LIMIT 1`, [data.bfcy_name, data.bfcy_cat]);
    if (Array.isArray(existing) && (existing as any[]).length > 0) {
      throw new Error('duplicate_beneficiary');
    }
  }
  // Use INSERT ... SET to allow flexible fields matching the table schema
  const [result] = await pool2.query(`INSERT INTO ${beneficiaryTable} SET ?`, [data]);
  return (result as ResultSetHeader).insertId;
};

export const updateBeneficiary = async (id: number, data: any): Promise<void> => {
  // If name and category are being set/changed, check for duplicates (exclude current id)
  if (data.bfcy_name && data.bfcy_cat) {
    const [existing] = await pool2.query(`SELECT * FROM ${beneficiaryTable} WHERE bfcy_name = ? AND bfcy_cat = ? AND bfcy_id != ? LIMIT 1`, [data.bfcy_name, data.bfcy_cat, id]);
    if (Array.isArray(existing) && (existing as any[]).length > 0) {
      throw new Error('duplicate_beneficiary');
    }
  }
  await pool2.query(`UPDATE ${beneficiaryTable} SET ? WHERE bfcy_id = ?`, [data, id]);
};

export const deleteBeneficiary = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${beneficiaryTable} WHERE bfcy_id = ?`, [id]);
};