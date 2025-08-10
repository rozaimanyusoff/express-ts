import { pool } from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const dbWebstock = process.env.WEBSTOCK_DB || 'web_stock';
const locationTypeTable = `${dbWebstock}.location_type`;
const locationsTable = `${dbWebstock}.locations`;
const fixedAssetTable = `${dbWebstock}.fixed_asset`;


// =============== LOCATIONS =================

export interface Location {
  id: number;
  old_asset_id: string | null;
  sitecode: string | null;
  sitename: string | null;
  location_fname: string | null;
  room_number: string | null;
  longitude: string | null;
  latitude: string | null;
  location_scope: string | null;
  extension: string | null;
  idcomp: string | null;
  tel: string | null;
  fax: string | null;
  contact_person: string | null;
  designation: string | null;
  mobile_no: string | null;
  email_address: string | null;
  location_class: number | null;
  loc_class_name: string | null;
  district: string | null;
  dept_ownership: string | null;
  type_of_location: string | null;
}

export async function getLocations(): Promise<Location[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM ${locationsTable} ORDER BY old_asset_id DESC`
  );
  return rows as unknown as Location[];
}

export async function getLocationById(id: number): Promise<Location | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
      n_id, 
      \`ID\`, 
      sitecode, 
      sitename, 
      location_fname, 
      room_number, 
      longitude, 
      latitude, 
      location_scope, 
      extension, 
      idcomp, 
      tel, 
      fax, 
      contact_person, 
      designation, 
      mobile_no, 
      email_address, 
      location_class, 
      district, 
      dept_ownership, 
      type_of_location
     FROM ${locationsTable}
     WHERE n_id = ?`,
    [id]
  );
  const item = (rows as RowDataPacket[])[0] as unknown as Location;
  return item || null;
}

export async function createLocation(data: Partial<Location>): Promise<number> {
  const {
    old_asset_id = null,
    sitecode = null,
    sitename = null,
    location_fname = null,
    room_number = null,
    longitude = null,
    latitude = null,
    location_scope = null,
    extension = null,
    idcomp = null,
    tel = null,
    fax = null,
    contact_person = null,
    designation = null,
    mobile_no = null,
    email_address = null,
    location_class = null,
    district = null,
    dept_ownership = null,
    type_of_location = null,
  } = data;

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO ${locationsTable} (
      \`ID\`, sitecode, sitename, location_fname, room_number, longitude, latitude, location_scope, extension, idcomp, tel, fax, contact_person, designation, mobile_no, email_address, location_class, district, dept_ownership, type_of_location
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      old_asset_id,
      sitecode,
      sitename,
      location_fname,
      room_number,
      longitude,
      latitude,
      location_scope,
      extension,
      idcomp,
      tel,
      fax,
      contact_person,
      designation,
      mobile_no,
      email_address,
      location_class,
      district,
      dept_ownership,
      type_of_location,
    ]
  );
  return result.insertId;
}

export async function updateLocation(id: number, data: Partial<Location>): Promise<void> {
  const {
    old_asset_id = null,
    sitecode = null,
    sitename = null,
    location_fname = null,
    room_number = null,
    longitude = null,
    latitude = null,
    location_scope = null,
    extension = null,
    idcomp = null,
    tel = null,
    fax = null,
    contact_person = null,
    designation = null,
    mobile_no = null,
    email_address = null,
    location_class = null,
    district = null,
    dept_ownership = null,
    type_of_location = null,
  } = data;

  await pool.query(
    `UPDATE ${locationsTable} SET 
      \`ID\` = ?,
      sitecode = ?,
      sitename = ?,
      location_fname = ?,
      room_number = ?,
      longitude = ?,
      latitude = ?,
      location_scope = ?,
      extension = ?,
      idcomp = ?,
      tel = ?,
      fax = ?,
      contact_person = ?,
      designation = ?,
      mobile_no = ?,
      email_address = ?,
      location_class = ?,
      district = ?,
      dept_ownership = ?,
      type_of_location = ?
     WHERE n_id = ?`,
    [
      old_asset_id,
      sitecode,
      sitename,
      location_fname,
      room_number,
      longitude,
      latitude,
      location_scope,
      extension,
      idcomp,
      tel,
      fax,
      contact_person,
      designation,
      mobile_no,
      email_address,
      location_class,
      district,
      dept_ownership,
      type_of_location,
      id,
    ]
  );
}

export async function deleteLocation(id: number): Promise<void> {
  await pool.query(`DELETE FROM ${locationsTable} WHERE n_id = ?`, [id]);
}


// =============== LOCATION TYPES =================

export interface LocationType {
  id: number;
  old_id: number | null;
  type: string;
}

export async function getLocationTypes(): Promise<LocationType[]> {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT id, old_id, type FROM ${locationTypeTable} ORDER BY id DESC`);
  return rows as unknown as LocationType[];
}

export async function getLocationTypeById(id: number): Promise<LocationType | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT id, old_id, type FROM ${locationTypeTable} WHERE id = ?`, [id]);
  const item = (rows as RowDataPacket[])[0] as unknown as LocationType;
  return item || null;
}

export async function createLocationType(data: Partial<LocationType>): Promise<number> {
  const { old_id = null, type } = data;
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO ${locationTypeTable} (old_id, type) VALUES (?, ?)`,
    [old_id, type]
  );
  return result.insertId;
}

export async function updateLocationType(id: number, data: Partial<LocationType>): Promise<void> {
  const { old_id = null, type } = data;
  await pool.query(
    `UPDATE ${locationTypeTable} SET old_id = ?, type = ? WHERE id = ?`,
    [old_id, type, id]
  );
}

export async function deleteLocationType(id: number): Promise<void> {
  await pool.query(`DELETE FROM ${locationTypeTable} WHERE id = ?`, [id]);
}

// =============== FIXED ASSET =================

export interface FixedAsset {
  ID: string | null;
  asset_type: string | null;
  asset_serial: string | null;
  model: string | null;
  description: string | null;
  manufacturer: string | null;
  depreciation_by_day: string | number | null;
  lifetime: string | number | null;
  po_number: string | null;
  account_bill: string | null;
  insurance_code: string | null;
  insured_value: string | number | null;
  warranty_end_date: string | null;
  acquisition_code: string | null;
  acquisition_type: string | null;
  acquisition_location: string | null;
  acquisition_price: string | number | null;
  acquisition_user_id: string | number | null;
  acquisition_date: string | null;
  preventive_maintenance_period: string | number | null;
  preventive_maintainance_cost: string | number | null;
  expiry_date: string | null;
  delivery_date: string | null;
  preventive_maintainance_date: string | null;
  idcomp: string | null;
  user_id: string | number | null;
  connect_otg: string | null;
  asset_name: string | null;
  active: string | number | null;
  remarks: string | null;
  supp_id: string | number | null;
  supp_name: string | null;
  owner_remarks: string | null;
  owner_name: string | null;
  owner_idcomp: string | null;
  disposal_status: string | null;
  disposal_attachment: string | null;
  district: string | null;
  dept_ownership: string | null;
  type_of_location: string | null;
  po_num2: string | null;
  bq_item_num: string | null;
}

export async function getFixedAssets(): Promise<FixedAsset[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
      \`ID\`, asset_type, asset_serial, \`model\`, \`description\`, manufacturer,
      depreciation_by_day, lifetime, po_number, account_bill, insurance_code, insured_value,
      warranty_end_date, acquisition_code, acquisition_type, acquisition_location, acquisition_price,
      acquisition_user_id, acquisition_date, preventive_maintenance_period, preventive_maintainance_cost,
      expiry_date, delivery_date, preventive_maintainance_date, idcomp, user_id, connect_otg, asset_name, active,
      remarks, supp_id, supp_name, owner_remarks, owner_name, owner_idcomp, disposal_status, disposal_attachment,
      district, dept_ownership, type_of_location, po_num2, bq_item_num
     FROM ${fixedAssetTable}
     ORDER BY \`ID\` DESC`
  );
  return rows as unknown as FixedAsset[];
}

export async function getFixedAssetById(id: string): Promise<FixedAsset | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
      \`ID\`, asset_type, asset_serial, \`model\`, \`description\`, manufacturer,
      depreciation_by_day, lifetime, po_number, account_bill, insurance_code, insured_value,
      warranty_end_date, acquisition_code, acquisition_type, acquisition_location, acquisition_price,
      acquisition_user_id, acquisition_date, preventive_maintenance_period, preventive_maintainance_cost,
      expiry_date, delivery_date, preventive_maintainance_date, idcomp, user_id, connect_otg, asset_name, active,
      remarks, supp_id, supp_name, owner_remarks, owner_name, owner_idcomp, disposal_status, disposal_attachment,
      district, dept_ownership, type_of_location, po_num2, bq_item_num
     FROM ${fixedAssetTable}
     WHERE \`ID\` = ?`,
    [id]
  );
  const item = (rows as RowDataPacket[])[0] as unknown as FixedAsset;
  return item || null;
}

export async function createFixedAsset(data: Partial<FixedAsset>): Promise<string | null> {
  const {
    ID = null,
    asset_type = null,
    asset_serial = null,
    model = null,
    description = null,
    manufacturer = null,
    depreciation_by_day = null,
    lifetime = null,
    po_number = null,
    account_bill = null,
    insurance_code = null,
    insured_value = null,
    warranty_end_date = null,
    acquisition_code = null,
    acquisition_type = null,
    acquisition_location = null,
    acquisition_price = null,
    acquisition_user_id = null,
    acquisition_date = null,
    preventive_maintenance_period = null,
    preventive_maintainance_cost = null,
    expiry_date = null,
    delivery_date = null,
    preventive_maintainance_date = null,
    idcomp = null,
    user_id = null,
    connect_otg = null,
    asset_name = null,
    active = null,
    remarks = null,
    supp_id = null,
    supp_name = null,
    owner_remarks = null,
    owner_name = null,
    owner_idcomp = null,
    disposal_status = null,
    disposal_attachment = null,
    district = null,
    dept_ownership = null,
    type_of_location = null,
    po_num2 = null,
    bq_item_num = null,
  } = data;

  await pool.query<ResultSetHeader>(
    `INSERT INTO ${fixedAssetTable} (
      \`ID\`, asset_type, asset_serial, \`model\`, \`description\`, manufacturer,
      depreciation_by_day, lifetime, po_number, account_bill, insurance_code, insured_value,
      warranty_end_date, acquisition_code, acquisition_type, acquisition_location, acquisition_price,
      acquisition_user_id, acquisition_date, preventive_maintenance_period, preventive_maintainance_cost,
      expiry_date, delivery_date, preventive_maintainance_date, idcomp, user_id, connect_otg, asset_name, active,
      remarks, supp_id, supp_name, owner_remarks, owner_name, owner_idcomp, disposal_status, disposal_attachment,
      district, dept_ownership, type_of_location, po_num2, bq_item_num
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      ID,
      asset_type,
      asset_serial,
      model,
      description,
      manufacturer,
      depreciation_by_day,
      lifetime,
      po_number,
      account_bill,
      insurance_code,
      insured_value,
      warranty_end_date,
      acquisition_code,
      acquisition_type,
      acquisition_location,
      acquisition_price,
      acquisition_user_id,
      acquisition_date,
      preventive_maintenance_period,
      preventive_maintainance_cost,
      expiry_date,
      delivery_date,
      preventive_maintainance_date,
      idcomp,
      user_id,
      connect_otg,
      asset_name,
      active,
      remarks,
      supp_id,
      supp_name,
      owner_remarks,
      owner_name,
      owner_idcomp,
      disposal_status,
      disposal_attachment,
      district,
      dept_ownership,
      type_of_location,
      po_num2,
      bq_item_num,
    ]
  );
  // Return the provided ID (if generated externally), otherwise null
  return ID;
}

export async function updateFixedAsset(id: string, data: Partial<FixedAsset>): Promise<void> {
  const {
    ID = id,
    asset_type = null,
    asset_serial = null,
    model = null,
    description = null,
    manufacturer = null,
    depreciation_by_day = null,
    lifetime = null,
    po_number = null,
    account_bill = null,
    insurance_code = null,
    insured_value = null,
    warranty_end_date = null,
    acquisition_code = null,
    acquisition_type = null,
    acquisition_location = null,
    acquisition_price = null,
    acquisition_user_id = null,
    acquisition_date = null,
    preventive_maintenance_period = null,
    preventive_maintainance_cost = null,
    expiry_date = null,
    delivery_date = null,
    preventive_maintainance_date = null,
    idcomp = null,
    user_id = null,
    connect_otg = null,
    asset_name = null,
    active = null,
    remarks = null,
    supp_id = null,
    supp_name = null,
    owner_remarks = null,
    owner_name = null,
    owner_idcomp = null,
    disposal_status = null,
    disposal_attachment = null,
    district = null,
    dept_ownership = null,
    type_of_location = null,
    po_num2 = null,
    bq_item_num = null,
  } = data;

  await pool.query(
    `UPDATE ${fixedAssetTable} SET 
      \`ID\` = ?, asset_type = ?, asset_serial = ?, \`model\` = ?, \`description\` = ?, manufacturer = ?,
      depreciation_by_day = ?, lifetime = ?, po_number = ?, account_bill = ?, insurance_code = ?, insured_value = ?,
      warranty_end_date = ?, acquisition_code = ?, acquisition_type = ?, acquisition_location = ?, acquisition_price = ?,
      acquisition_user_id = ?, acquisition_date = ?, preventive_maintenance_period = ?, preventive_maintainance_cost = ?,
      expiry_date = ?, delivery_date = ?, preventive_maintainance_date = ?, idcomp = ?, user_id = ?, connect_otg = ?, asset_name = ?, active = ?,
      remarks = ?, supp_id = ?, supp_name = ?, owner_remarks = ?, owner_name = ?, owner_idcomp = ?, disposal_status = ?, disposal_attachment = ?,
      district = ?, dept_ownership = ?, type_of_location = ?, po_num2 = ?, bq_item_num = ?
     WHERE \`ID\` = ?`,
    [
      ID,
      asset_type,
      asset_serial,
      model,
      description,
      manufacturer,
      depreciation_by_day,
      lifetime,
      po_number,
      account_bill,
      insurance_code,
      insured_value,
      warranty_end_date,
      acquisition_code,
      acquisition_type,
      acquisition_location,
      acquisition_price,
      acquisition_user_id,
      acquisition_date,
      preventive_maintenance_period,
      preventive_maintainance_cost,
      expiry_date,
      delivery_date,
      preventive_maintainance_date,
      idcomp,
      user_id,
      connect_otg,
      asset_name,
      active,
      remarks,
      supp_id,
      supp_name,
      owner_remarks,
      owner_name,
      owner_idcomp,
      disposal_status,
      disposal_attachment,
      district,
      dept_ownership,
      type_of_location,
      po_num2,
      bq_item_num,
      id,
    ]
  );
}

export async function deleteFixedAsset(id: string): Promise<void> {
  await pool.query(`DELETE FROM ${fixedAssetTable} WHERE \`ID\` = ?`, [id]);
}
