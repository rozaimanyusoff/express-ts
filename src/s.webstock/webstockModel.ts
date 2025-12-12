import { ResultSetHeader, RowDataPacket } from 'mysql2';

import { pool } from '../utils/db';

const dbWebstock = process.env.WEBSTOCK_DB || 'web_stock';
const locationTypeTable = `${dbWebstock}.location_type`;
const locationsTable = `${dbWebstock}.locations`;
const fixedAssetTable = `${dbWebstock}.fixed_asset`;


// =============== LOCATIONS =================

export interface FixedAsset {
  account_bill: null | string;
  acquisition_code: null | string;
  acquisition_date: null | string;
  acquisition_location: null | string;
  acquisition_price: null | number | string;
  acquisition_type: null | string;
  acquisition_user_id: null | number | string;
  active: null | number | string;
  asset_name: null | string;
  asset_serial: null | string;
  asset_type: null | string;
  bq_item_num: null | string;
  connect_otg: null | string;
  delivery_date: null | string;
  depreciation_by_day: null | number | string;
  dept_ownership: null | string;
  description: null | string;
  disposal_attachment: null | string;
  disposal_status: null | string;
  district: null | string;
  expiry_date: null | string;
  ID: null | string;
  idcomp: null | string;
  insurance_code: null | string;
  insured_value: null | number | string;
  lifetime: null | number | string;
  manufacturer: null | string;
  model: null | string;
  owner_idcomp: null | string;
  owner_name: null | string;
  owner_remarks: null | string;
  po_num2: null | string;
  po_number: null | string;
  preventive_maintainance_cost: null | number | string;
  preventive_maintainance_date: null | string;
  preventive_maintenance_period: null | number | string;
  remarks: null | string;
  supp_id: null | number | string;
  supp_name: null | string;
  type_of_location: null | string;
  user_id: null | number | string;
  warranty_end_date: null | string;
}

export interface Location {
  contact_person: null | string;
  dept_ownership: null | string;
  designation: null | string;
  district: null | string;
  email_address: null | string;
  extension: null | string;
  fax: null | string;
  id: number;
  idcomp: null | string;
  latitude: null | string;
  loc_class_name: null | string;
  location_class: null | number;
  location_fname: null | string;
  location_scope: null | string;
  longitude: null | string;
  mobile_no: null | string;
  old_asset_id: null | string;
  room_number: null | string;
  sitecode: null | string;
  sitename: null | string;
  tel: null | string;
  type_of_location: null | string;
}

export interface LocationType {
  id: number;
  old_id: null | number;
  type: string;
}

export async function createFixedAsset(data: Partial<FixedAsset>): Promise<null | string> {
  const {
    account_bill = null,
    acquisition_code = null,
    acquisition_date = null,
    acquisition_location = null,
    acquisition_price = null,
    acquisition_type = null,
    acquisition_user_id = null,
    active = null,
    asset_name = null,
    asset_serial = null,
    asset_type = null,
    bq_item_num = null,
    connect_otg = null,
    delivery_date = null,
    depreciation_by_day = null,
    dept_ownership = null,
    description = null,
    disposal_attachment = null,
    disposal_status = null,
    district = null,
    expiry_date = null,
    ID = null,
    idcomp = null,
    insurance_code = null,
    insured_value = null,
    lifetime = null,
    manufacturer = null,
    model = null,
    owner_idcomp = null,
    owner_name = null,
    owner_remarks = null,
    po_num2 = null,
    po_number = null,
    preventive_maintainance_cost = null,
    preventive_maintainance_date = null,
    preventive_maintenance_period = null,
    remarks = null,
    supp_id = null,
    supp_name = null,
    type_of_location = null,
    user_id = null,
    warranty_end_date = null,
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

export async function createLocation(data: Partial<Location>): Promise<number> {
  const {
    contact_person = null,
    dept_ownership = null,
    designation = null,
    district = null,
    email_address = null,
    extension = null,
    fax = null,
    idcomp = null,
    latitude = null,
    location_class = null,
    location_fname = null,
    location_scope = null,
    longitude = null,
    mobile_no = null,
    old_asset_id = null,
    room_number = null,
    sitecode = null,
    sitename = null,
    tel = null,
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

export async function createLocationType(data: Partial<LocationType>): Promise<number> {
  const { old_id = null, type } = data;
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO ${locationTypeTable} (old_id, type) VALUES (?, ?)`,
    [old_id, type]
  );
  return result.insertId;
}


// =============== LOCATION TYPES =================

export async function deleteFixedAsset(id: string): Promise<void> {
  await pool.query(`DELETE FROM ${fixedAssetTable} WHERE \`ID\` = ?`, [id]);
}

export async function deleteLocation(id: number): Promise<void> {
  await pool.query(`DELETE FROM ${locationsTable} WHERE n_id = ?`, [id]);
}

export async function deleteLocationType(id: number): Promise<void> {
  await pool.query(`DELETE FROM ${locationTypeTable} WHERE id = ?`, [id]);
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
  const item = (rows)[0] as unknown as FixedAsset;
  return item || null;
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
  const item = (rows)[0] as unknown as Location;
  return item || null;
}

// =============== FIXED ASSET =================

export async function getLocations(): Promise<Location[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM ${locationsTable} ORDER BY old_asset_id DESC`
  );
  return rows as unknown as Location[];
}

export async function getLocationTypeById(id: number): Promise<LocationType | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT id, old_id, type FROM ${locationTypeTable} WHERE id = ?`, [id]);
  const item = (rows)[0] as unknown as LocationType;
  return item || null;
}

export async function getLocationTypes(): Promise<LocationType[]> {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT id, old_id, type FROM ${locationTypeTable} ORDER BY id DESC`);
  return rows as unknown as LocationType[];
}

export async function updateFixedAsset(id: string, data: Partial<FixedAsset>): Promise<void> {
  const {
    account_bill = null,
    acquisition_code = null,
    acquisition_date = null,
    acquisition_location = null,
    acquisition_price = null,
    acquisition_type = null,
    acquisition_user_id = null,
    active = null,
    asset_name = null,
    asset_serial = null,
    asset_type = null,
    bq_item_num = null,
    connect_otg = null,
    delivery_date = null,
    depreciation_by_day = null,
    dept_ownership = null,
    description = null,
    disposal_attachment = null,
    disposal_status = null,
    district = null,
    expiry_date = null,
    ID = id,
    idcomp = null,
    insurance_code = null,
    insured_value = null,
    lifetime = null,
    manufacturer = null,
    model = null,
    owner_idcomp = null,
    owner_name = null,
    owner_remarks = null,
    po_num2 = null,
    po_number = null,
    preventive_maintainance_cost = null,
    preventive_maintainance_date = null,
    preventive_maintenance_period = null,
    remarks = null,
    supp_id = null,
    supp_name = null,
    type_of_location = null,
    user_id = null,
    warranty_end_date = null,
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

export async function updateLocation(id: number, data: Partial<Location>): Promise<void> {
  const {
    contact_person = null,
    dept_ownership = null,
    designation = null,
    district = null,
    email_address = null,
    extension = null,
    fax = null,
    idcomp = null,
    latitude = null,
    location_class = null,
    location_fname = null,
    location_scope = null,
    longitude = null,
    mobile_no = null,
    old_asset_id = null,
    room_number = null,
    sitecode = null,
    sitename = null,
    tel = null,
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

export async function updateLocationType(id: number, data: Partial<LocationType>): Promise<void> {
  const { old_id = null, type } = data;
  await pool.query(
    `UPDATE ${locationTypeTable} SET old_id = ?, type = ? WHERE id = ?`,
    [old_id, type, id]
  );
}
