// Set the attachment (PDF filename) for a vehicle maintenance billing record
export const setVehicleMtnBillingAttachment = async (inv_id: number, attachment: string): Promise<void> => {
  // Persist to the `upload` column which is the column used by updateVehicleMtnBilling
  await pool2.query(
    `UPDATE ${vehicleMtnBillingTable} SET upload = ? WHERE inv_id = ?`,
    [attachment, inv_id]
  );
};
import { pool, pool2 } from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';


// Database and table declarations
const dbBillings = 'billings';
const dbAssets = 'assets';
const dbApps = 'applications';

const workshopTable = `${dbBillings}.costws`;
const fuelBillingTable = `${dbBillings}.fuel_stmt`;
const fuelVehicleAmountTable = `${dbBillings}.fuel_stmt_detail`;
const fuelVendorTable = `${dbBillings}.fuel_vendor`;
const fleetCardTable = `${dbBillings}.fleet2`;
const fleetCardHistoryTable = `${dbBillings}.fleet_history`;
const fleetAssetJoinTable = `${dbBillings}.fleet_asset`;
const utilitiesTable = `${dbBillings}.tbl_util`;
const billingAccountTable = `${dbBillings}.util_billing_ac`;
const beneficiaryTable = `${dbBillings}.util_beneficiary`;

const serviceOptionsTable = `${dbApps}.svctype`;
const servicePartsTable = `${dbBillings}.autoparts`;
const vehicleMtnBillingTable = `${dbBillings}.tbl_inv`;
const vehicleMtnBillingPartTable = `${dbBillings}.tbl_inv_part`;

//to be removed later
const tempVehicleRecordTable = `${dbAssets}.assetdata`;
const tempVehicleRecordDetailsTable = `${dbAssets}.vehicle_dt`;
const vehicleMtnAppTable = `${dbApps}.vehicle_svc`; // index field: req_id

/* =================== SERVICE OPTION TABLE ========================== */
export interface ServiceOption {
  svcTypeId: number;
  svcType: string;
  svcOpt: string;
  group_desc: string;
}

export const getServiceOptions = async (): Promise<ServiceOption[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${serviceOptionsTable} ORDER BY svcTypeId DESC`);
  return rows as ServiceOption[];
};
export const getServiceOptionById = async (id: number): Promise<ServiceOption | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${serviceOptionsTable} WHERE svcTypeId = ?`, [id]);
  const serviceOption = (rows as ServiceOption[])[0];
  return serviceOption || null;
};
export const createServiceOption = async (data: ServiceOption): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${serviceOptionsTable} (
      svcType, svcOpt, group_desc
    ) VALUES (?, ?, ?)`,
    [ data.svcType, data.svcOpt, data.group_desc ]
  );
  return (result as ResultSetHeader).insertId;
};
export const updateServiceOption = async (id: number, data: ServiceOption): Promise<void> => {
  await pool2.query(
    `UPDATE ${serviceOptionsTable} SET svcType = ?, svcOpt = ?, group_desc = ? WHERE svcTypeId = ?`,
    [ data.svcType, data.svcOpt, data.group_desc, id ]
  );
};



/* =================== SERVICE PARTS (autoparts) CRUD =================== */
export interface ServicePart {
  autopart_id: number;
  autocat_id?: string;
  vtype_id?: string;
  part_name?: string;
  part_uprice?: string;
  part_sst_rate?: number;
  part_sst_amount?: string;
  part_disc_amount?: string;
  part_final_amount?: string;
  part_stat?: number;
  reg_date?: string | null;
}

export const getServiceParts = async (): Promise<ServicePart[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${servicePartsTable} ORDER BY autopart_id DESC`);
  return rows as ServicePart[];
};

export const getServicePartById = async (id: number): Promise<ServicePart | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${servicePartsTable} WHERE autopart_id = ?`, [id]);
  const part = (rows as ServicePart[])[0];
  return part || null;
};

export const createServicePart = async (data: Partial<ServicePart>): Promise<number> => {
  // Prevent duplicate: check for existing part with same part_name (case-insensitive, trimmed)
  if (data.part_name) {
    const [rows] = await pool2.query(
      `SELECT autopart_id FROM ${servicePartsTable} WHERE LOWER(TRIM(part_name)) = LOWER(TRIM(?)) LIMIT 1`,
      [data.part_name]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      // Return existing autopart_id
      return (rows[0] as any).autopart_id;
    }
  }
  const [result] = await pool2.query(
    `INSERT INTO ${servicePartsTable} (autocat_id, vtype_id, part_name, part_uprice, part_sst_rate, part_sst_amount, part_disc_amount, part_final_amount, part_stat, reg_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [data.autocat_id ?? null, data.vtype_id ?? null, data.part_name ?? null, data.part_uprice ?? null, data.part_sst_rate ?? null, data.part_sst_amount ?? null, data.part_disc_amount ?? null, data.part_final_amount ?? null, data.part_stat ?? 1]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateServicePart = async (id: number, data: Partial<ServicePart>): Promise<void> => {
  await pool2.query(
    `UPDATE ${servicePartsTable} SET autocat_id = ?, vtype_id = ?, part_name = ?, part_uprice = ?, part_sst_rate = ?, part_sst_amount = ?, part_disc_amount = ?, part_final_amount = ?, part_stat = ? WHERE autopart_id = ?`,
    [data.autocat_id ?? null, data.vtype_id ?? null, data.part_name ?? null, data.part_uprice ?? null, data.part_sst_rate ?? null, data.part_sst_amount ?? null, data.part_disc_amount ?? null, data.part_final_amount ?? null, data.part_stat ?? null, id]
  );
};

export const deleteServicePart = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${servicePartsTable} WHERE autopart_id = ?`, [id]);
};

// Count service parts matching optional filters
export const countServiceParts = async (q?: string, category?: number): Promise<number> => {
  const where: string[] = [];
  const params: any[] = [];
  if (q && q.trim() !== '') {
    where.push(`(part_name LIKE ? OR autopart_id LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like);
  }
  if (Number.isFinite(category)) {
    where.push(`autocat_id = ?`);
    params.push(category);
  }
  const sql = `SELECT COUNT(*) as cnt FROM ${servicePartsTable}` + (where.length ? ` WHERE ${where.join(' AND ')}` : '');
  const [rows] = await pool2.query(sql, params);
  const cnt = Array.isArray(rows) && rows.length > 0 ? (rows as any)[0].cnt : 0;
  return Number(cnt) || 0;
};

// Paginated fetch for service parts with optional search q and category filter
export const getServicePartsPaged = async (q?: string, page: number = 1, per_page: number = 50, category?: number): Promise<ServicePart[]> => {
  page = Number(page) || 1;
  per_page = Number(per_page) || 50;
  const offset = (page - 1) * per_page;
  const where: string[] = [];
  const params: any[] = [];
  if (q && q.trim() !== '') {
    where.push(`(part_name LIKE ? OR autopart_id LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like);
  }
  if (Number.isFinite(category)) {
    where.push(`autocat_id = ?`);
    params.push(category);
  }
  const sql = `SELECT * FROM ${servicePartsTable}` + (where.length ? ` WHERE ${where.join(' AND ')}` : '') + ` ORDER BY autopart_id DESC LIMIT ? OFFSET ?`;
  params.push(per_page, offset);
  const [rows] = await pool2.query(sql, params);
  return rows as ServicePart[];
};

// Quick search endpoint for typeahead or global search (not paginated)
export const searchServiceParts = async (q: string, limit: number = 10): Promise<ServicePart[]> => {
  const like = `%${q}%`;
  const [rows] = await pool2.query(`SELECT * FROM ${servicePartsTable} WHERE part_name LIKE ? ORDER BY autopart_id DESC LIMIT ?`, [like, Number(limit) || 10]);
  return rows as ServicePart[];
};

// Bulk fetch service parts by autopart_id array
export const getServicePartsByIds = async (ids: number[]): Promise<ServicePart[]> => {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const clean = ids.map((i: any) => Number(i)).filter((n: number) => Number.isFinite(n));
  if (clean.length === 0) return [];
  const placeholders = clean.map(() => '?').join(',');
  const sql = `SELECT * FROM ${servicePartsTable} WHERE autopart_id IN (${placeholders})`;
  const [rows] = await pool2.query(sql, clean);
  return rows as ServicePart[];
};


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
  attachment: string | null;
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

// Fetch vehicle maintenance billings by request id (svc_order)
export const getVehicleMtnBillingByRequestId = async (svc_order: string): Promise<VehicleMaintenance[]> => {
  if (!svc_order || String(svc_order).trim() === '') return [];
  const [rows] = await pool2.query(
    `SELECT * FROM ${vehicleMtnBillingTable} WHERE svc_order = ? ORDER BY inv_date DESC, inv_id DESC`,
    [svc_order]
  );
  return rows as VehicleMaintenance[];
};

export const updateVehicleMtnBilling = async (id: number, data: Partial<VehicleMaintenance>): Promise<void> => {
  // Prefer data.upload if provided by controller; fall back to data.attachment for compatibility
  const uploadValue = (data as any).upload ?? (data as any).attachment ?? null;
  await pool2.query(
    `UPDATE ${vehicleMtnBillingTable} SET inv_no = ?, inv_date = ?, svc_date = ?, svc_odo = ?, inv_total = ?, inv_stat = ?, inv_remarks = ?, upload = ? WHERE inv_id = ?`,
    [ data.inv_no, data.inv_date, data.svc_date, data.svc_odo, data.inv_total, data.inv_stat, data.inv_remarks, uploadValue, id ]
  );
};

export const deleteVehicleMtnBilling = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${vehicleMtnBillingTable} WHERE id = ?`, [id]);
};

/* =========== VEHICLE MAINTENANCE BILLING PARTS TABLE ============= */

// Obtain vehicle maintenance parts by maintenance ID
export const getVehicleMtnBillingParts = async (maintenanceId: number): Promise<any[]> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${vehicleMtnBillingPartTable} WHERE inv_id = ?`,
    [maintenanceId]
  );
  return rows as any[];
};

// Delete all parts for a given invoice (inv_id)
export const deleteAllVehicleMtnBillingParts = async (inv_id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${vehicleMtnBillingPartTable} WHERE inv_id = ?`, [inv_id]);
};

// Bulk insert parts for a given invoice (inv_id)
export const createVehicleMtnBillingParts = async (inv_id: number, parts: any[]): Promise<void> => {
  if (!Array.isArray(parts) || parts.length === 0) return;
  // Map part_amount (payload) to part_final_amount (DB)
  const values = parts.map(part => [
    inv_id,
    part.autopart_id ?? null,
    part.part_qty ?? null,
    part.part_uprice ?? null,
    part.part_final_amount ?? part.part_amount ?? null
  ]);
  await pool2.query(
    `INSERT INTO ${vehicleMtnBillingPartTable} (inv_id, autopart_id, part_qty, part_uprice, part_final_amount)
     VALUES ?`,
    [values]
  );
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
    `SELECT * FROM ${vehicleMtnBillingTable} WHERE inv_date BETWEEN ? AND ? AND inv_date IS NOT NULL ORDER BY inv_date DESC`,
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

// Count maintenance billings by inv_no. Optionally exclude a specific inv_id (useful when validating during edit)
export const countVehicleMtnByInvNo = async (inv_no: string, excludeInvId?: number, billId?: number): Promise<number> => {
  if (!inv_no || String(inv_no).trim() === '') return 0;
  const params: any[] = [inv_no.trim()];
  let sql = `SELECT COUNT(*) as cnt FROM ${vehicleMtnBillingTable} WHERE inv_no = ?`;
  if (Number.isFinite(billId)) {
    sql += ` AND bill_id = ?`;
    params.push(billId);
  }
  if (Number.isFinite(excludeInvId)) {
    sql += ` AND inv_id != ?`;
    params.push(excludeInvId);
  }
  const [rows] = await pool2.query(sql, params);
  const cnt = Array.isArray(rows) && rows.length > 0 ? (rows as any)[0].cnt : 0;
  return Number(cnt) || 0;
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
  // Include fuel statements where the parent stmt_date is in range OR any detail row has stmt_date in range
  const sql = `
    SELECT * FROM ${fuelBillingTable} WHERE stmt_date BETWEEN ? AND ?`;
  const [rows] = await pool2.query(sql, [from, to]);
  return rows as any[];
};

/* ===== FUEL BILLING AMOUNT BY VEHICLE ===== */

export const getFuelVehicleAmount = async (stmt_id: number): Promise<any[]> => {
  // Removed previous filters on amount != '0.00', stmt_date IS NOT NULL, cc_id IS NOT NULL
  // to allow full visibility of all raw transaction rows belonging to the statement.
  // Any downstream aggregation should defensively handle null / zero values.
  const [rows] = await pool2.query(
    `SELECT * FROM ${fuelVehicleAmountTable} WHERE stmt_id = ?`,
    [stmt_id]
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

export const getFuelVehicleAmountByDateRange = async (from: string, to: string): Promise<any[]> => {
  const [rows] = await pool2.query(
    `SELECT * FROM ${fuelVehicleAmountTable}  WHERE stmt_date BETWEEN ? AND ? AND amount > 0 ORDER BY stmt_date DESC`,
    [from, to]
  );
  return rows as any[];
};

export const createFuelVehicleAmount = async (data: any): Promise<number> => {
  const [result] = await pool2.query(
    `INSERT INTO ${fuelVehicleAmountTable} (stmt_id, stmt_date, card_id, asset_id, vehicle_id, entry_code, cc_id, loc_id, purpose, start_odo, end_odo, total_km, total_litre, effct, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ data.stmt_id, data.stmt_date, data.card_id, data.asset_id, data.vehicle_id, data.entry_code, data.costcenter_id, data.location_id, data.category, data.start_odo, data.end_odo, data.total_km, data.total_litre, data.efficiency, data.amount ]
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

// Instantly update fleet card info from fuel billings
// Payload: { card_id, asset_id, costcenter_id, purpose, stmt_id, card_no }
// Mappings:
// - billings.fleet2: set asset_id, purpose, card_no by id = card_id
// - billings.fuel_stmt_detail: set asset_id, cc_id, purpose for rows matching (stmt_id, card_id)
export const updateFleetCardFromBilling = async (data: any): Promise<void> => {
  const { card_id, asset_id, costcenter_id, purpose, stmt_id, card_no } = data || {};
  if (!card_id || !asset_id || !purpose || !stmt_id || !card_no || !costcenter_id) {
    throw new Error('Missing required fields for fleet card update from billing');
  }

  // Update the fleet card (fleet2)
  await pool2.query(
    `UPDATE ${fleetCardTable} SET asset_id = ?, purpose = ?, card_no = ? WHERE id = ?`,
    [asset_id, purpose, card_no, card_id]
  );

  // Update matching fuel statement detail rows (fuel_stmt_detail)
  await pool2.query(
    `UPDATE ${fuelVehicleAmountTable} SET asset_id = ?, cc_id = ?, purpose = ? WHERE stmt_id = ? AND card_id = ?`,
    [asset_id, costcenter_id, purpose, stmt_id, card_id]
  );
}


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
  ubill_ref: string;
}

export const getUtilityBills = async (): Promise<UtilityBill[]> => {
  const [rows] = await pool2.query(`SELECT * FROM ${utilitiesTable} ORDER BY util_id DESC`);
  return rows as UtilityBill[];
};

export const getUtilityBillsByIds = async (ids: number[]): Promise<UtilityBill[]> => {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  // sanitize ids to numbers and filter invalid
  const cleanIds = ids.map((i: any) => Number(i)).filter((n: number) => Number.isFinite(n));
  if (cleanIds.length === 0) return [];
  const placeholders = cleanIds.map(() => '?').join(',');
  const sql = `SELECT * FROM ${utilitiesTable} WHERE util_id IN (${placeholders}) ORDER BY util_id DESC`;
  const [rows] = await pool2.query(sql, cleanIds);
  return rows as UtilityBill[];
};

// Get previous N utility bills for an account (bill_id), excluding a specific util_id (current bill)
export const getPreviousUtilityBillsForAccount = async (
  bill_id: number,
  excludeUtilId?: number,
  limit: number = 5
): Promise<Array<Pick<UtilityBill, 'ubill_no' | 'ubill_date' | 'ubill_gtotal'>>> => {
  if (!Number.isFinite(bill_id) || bill_id <= 0) return [];
  const params: any[] = [bill_id];
  let where = 'bill_id = ?';
  if (Number.isFinite(excludeUtilId)) {
    where += ' AND util_id <> ?';
    params.push(Number(excludeUtilId));
  }
  params.push(limit);
  const sql = `SELECT ubill_no, ubill_date, ubill_gtotal FROM ${utilitiesTable} WHERE ${where} ORDER BY ubill_date DESC, util_id DESC LIMIT ?`;
  const [rows] = await pool2.query(sql, params);
  return rows as Array<Pick<UtilityBill, 'ubill_no' | 'ubill_date' | 'ubill_gtotal'>>;
};

// Count utility bills by ubill_no. Optionally exclude a specific util_id (useful during edit)
export const countUtilityByUbillNo = async (ubill_no: string, excludeUtilId?: number, billId?: number): Promise<number> => {
  if (!ubill_no || String(ubill_no).trim() === '') return 0;
  const params: any[] = [ubill_no.trim()];
  let sql = `SELECT COUNT(*) as cnt FROM ${utilitiesTable} WHERE ubill_no = ?`;
  if (Number.isFinite(billId)) {
    sql += ` AND bill_id = ?`;
    params.push(billId);
  }
  if (Number.isFinite(excludeUtilId)) {
    sql += ` AND util_id != ?`;
    params.push(excludeUtilId);
  }
  const [rows] = await pool2.query(sql, params);
  const cnt = Array.isArray(rows) && rows.length > 0 ? (rows as any)[0].cnt : 0;
  return Number(cnt) || 0;
};

export const getUtilityBillById = async (util_id: number): Promise<UtilityBill | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${utilitiesTable} WHERE util_id = ?`, [util_id]);
  const bill = (rows as UtilityBill[])[0];
  return bill || null;
};

export const createUtilityBill = async (data: Partial<UtilityBill>): Promise<number> => {
  // Sanitize ubill_ref: accept only non-empty strings, otherwise null
  const ubillRef: string | null = (typeof data.ubill_ref === 'string' && data.ubill_ref.trim() !== '') ? data.ubill_ref : null;

  // Duplicate check: require bill_id, ubill_no and ubill_date to be present for the check
  if (data.bill_id && data.ubill_no && data.ubill_date) {
    const [existingRows] = await pool2.query(
      `SELECT util_id FROM ${utilitiesTable} WHERE bill_id = ? AND ubill_no = ? AND ubill_date = ? LIMIT 1`,
      [data.bill_id, data.ubill_no, data.ubill_date]
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      throw new Error('duplicate_utility_bill');
    }
  }

  const [result] = await pool2.query(
    `INSERT INTO ${utilitiesTable} (
      bill_id, cc_id, loc_id, ubill_bw, ubill_color, ubill_date, ubill_disc, ubill_gtotal, ubill_no, ubill_ref, ubill_paystat, ubill_rent, ubill_round, ubill_stotal, ubill_tax
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.bill_id, data.cc_id, data.loc_id, data.ubill_bw, data.ubill_color, data.ubill_date, data.ubill_disc, data.ubill_gtotal, data.ubill_no, ubillRef, data.ubill_paystat, data.ubill_rent, data.ubill_round, data.ubill_stotal, data.ubill_tax
    ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateUtilityBill = async (util_id: number, data: Partial<UtilityBill>): Promise<void> => {
  await pool2.query(
    `UPDATE ${utilitiesTable} SET loc_id = ?, cc_id = ?, ubill_date = ?, ubill_no = ?, ubill_stotal = ?, ubill_tax = ?, ubill_disc = ?, ubill_round = ?, ubill_rent = ?, ubill_bw = ?, ubill_color = ?, ubill_gtotal = ?, ubill_paystat = ?, ubill_ref = ? WHERE util_id = ?`,
    [
      data.loc_id, data.cc_id, data.ubill_date, data.ubill_no, data.ubill_stotal, data.ubill_tax, data.ubill_disc, data.ubill_round, data.ubill_rent, data.ubill_bw, data.ubill_color, data.ubill_gtotal, data.ubill_paystat, data.ubill_ref, util_id
    ]
  );
};

// Set the stored file reference (ubill_ref) for a utility bill
export const setUtilityBillRef = async (util_id: number, ubill_ref: string): Promise<void> => {
  await pool2.query(
    `UPDATE ${utilitiesTable} SET ubill_ref = ? WHERE util_id = ?`,
    [ubill_ref, util_id]
  );
};

export const deleteUtilityBill = async (util_id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${utilitiesTable} WHERE util_id = ?`, [util_id]);
};

// =================== BILLING ACCOUNT TABLE CRUD ===================
export interface BillingAccount {
  bill_id: number;
  account: string;
  category: string;
  description: string;
  beneficiary_id: number;
  costcenter_id: number;
  location_id: number;
  status: string;
  contract_start: string;
  contract_end: string;
  deposit: string;
  rental: string;
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
  const [rows] = await pool2.query(`SELECT bill_id, account, category, description, beneficiary_id, costcenter_id, location_id, status, contract_start, contract_end, deposit, rental FROM ${billingAccountTable} ORDER BY bill_id DESC`);
  return rows as any[];
};

export const getBillingAccountById = async (bill_id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT bill_id, account, category, description, beneficiary_id, costcenter_id, location_id, status, contract_start, contract_end, deposit, rental FROM ${billingAccountTable} WHERE bill_id = ?`, [bill_id]);
  const account = (rows as any[])[0];
  return account || null;
};

export const createBillingAccount = async (data: any): Promise<number> => {
  // Prevent duplicate billing account by bill_ac + service + cc_id + loc_id
  if (data.account && data.category !== undefined && data.costcenter_id !== undefined && data.location_id !== undefined) {
    const [existingRows] = await pool2.query(
      `SELECT bill_id FROM ${billingAccountTable} WHERE account = ? AND category = ? AND costcenter_id = ? AND location_id = ? LIMIT 1`,
      [data.account, data.category, data.costcenter_id, data.location_id]
    );
    if (Array.isArray(existingRows) && (existingRows as any[]).length > 0) {
      throw new Error('duplicate_billing_account');
    }
  }
  const [result] = await pool2.query(
    `INSERT INTO ${billingAccountTable} (
      account, category, description, beneficiary_id, costcenter_id, location_id, status, contract_start, contract_end, deposit, rental
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.account, data.category, data.description, data.beneficiary_id, data.costcenter_id, data.location_id,
      data.status, normalizeDateForMySQL(data.contract_start), normalizeDateForMySQL(data.contract_end),
      data.deposit, data.rental
    ]
  );
  return (result as ResultSetHeader).insertId;
};

export const updateBillingAccount = async (bill_id: number, data: any): Promise<void> => {
  // Prevent duplicate billing account when updating: same account+category+costcenter_id+location_id owned by another id
  if (data.account && data.category !== undefined && data.costcenter_id !== undefined && data.location_id !== undefined) {
    const [existingRows] = await pool2.query(
      `SELECT * FROM ${billingAccountTable} WHERE account = ? AND category = ? AND costcenter_id = ? AND location_id = ? AND bill_id != ? LIMIT 1`,
      [data.account, data.category, data.costcenter_id, data.location_id, bill_id]
    );
    if (Array.isArray(existingRows) && (existingRows as any[]).length > 0) {
      throw new Error('duplicate_billing_account');
    }
  }
  await pool2.query(
    `UPDATE ${billingAccountTable} SET account = ?, category = ?, description = ?, beneficiary_id = ?, costcenter_id = ?, location_id = ?, status = ?, contract_start = ?, contract_end = ?, deposit = ?, rental = ? WHERE bill_id = ?`,
    [
      data.account, data.category, data.description, data.beneficiary_id, data.costcenter_id, data.location_id,
      data.status, normalizeDateForMySQL(data.contract_start), normalizeDateForMySQL(data.contract_end), data.deposit, data.rental, bill_id
    ]
  );
};

export const deleteBillingAccount = async (bill_id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${billingAccountTable} WHERE bill_id = ?`, [bill_id]);
};

/* =================== BENEFICIARY (BILLING PROVIDERS) TABLE =================== */

export interface Beneficiary {
  id: number;
  name?: string;
  category?: string;
  logo?: string;
  created_at?: Date;
  entry_by?: string;
  entry_position?: string;
  contact_name?: string;
  contact_no?: string;
  address?: string;
  file_reference?: string;
  [key: string]: any;
}

export const getBeneficiaries = async (services?: string | string[]): Promise<any[]> => {
  // services can be undefined, a single string, or an array of strings.
  // Map to category filtering: support comma-separated values in query string.
  if (!services) {
    const [rows] = await pool2.query(`SELECT * FROM ${beneficiaryTable} ORDER BY id DESC`);
    return rows as any[];
  }

  // Normalize services to an array of trimmed strings
  const svcArray = Array.isArray(services)
    ? services.reduce<string[]>((acc, s) => acc.concat(String(s).split(',').map(v => v.trim()).filter(Boolean)), [])
    : String(services).split(',').map(v => v.trim()).filter(Boolean);

  if (svcArray.length === 0) {
    const [rows] = await pool2.query(`SELECT * FROM ${beneficiaryTable} ORDER BY id DESC`);
    return rows as any[];
  }

  // Build placeholders and params for IN clause
  const placeholders = svcArray.map(() => '?').join(',');
  const sql = `SELECT * FROM ${beneficiaryTable} WHERE category IN (${placeholders}) ORDER BY id DESC`;
  const [rows] = await pool2.query(sql, svcArray);
  return rows as any[];
};

export const getBeneficiaryById = async (id: number): Promise<any | null> => {
  const [rows] = await pool2.query(`SELECT * FROM ${beneficiaryTable} WHERE id = ?`, [id]);
  const ben = (rows as any[])[0];
  return ben || null;
};

export const createBeneficiary = async (data: any): Promise<number> => {
  // Prevent duplicate beneficiary by name + category
  if (data.name && data.category) {
    const [existing] = await pool2.query(`SELECT id FROM ${beneficiaryTable} WHERE name = ? AND category = ? LIMIT 1`, [data.name, data.category]);
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
  if (data.name && data.category) {
    const [existing] = await pool2.query(`SELECT * FROM ${beneficiaryTable} WHERE name = ? AND category = ? AND id != ? LIMIT 1`, [data.name, data.category, id]);
    if (Array.isArray(existing) && (existing as any[]).length > 0) {
      throw new Error('duplicate_beneficiary');
    }
  }
  await pool2.query(`UPDATE ${beneficiaryTable} SET ? WHERE id = ?`, [data, id]);
};

export const deleteBeneficiary = async (id: number): Promise<void> => {
  await pool2.query(`DELETE FROM ${beneficiaryTable} WHERE id = ?`, [id]);
};
