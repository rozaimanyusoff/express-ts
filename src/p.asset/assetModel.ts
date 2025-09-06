import {pool, pool2} from "../utils/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import fs from 'fs';
import path from 'path';
import { get } from "axios";

// Database and table declarations for easy swapping/testing
const db = 'assets';
const companyDb = 'companies';
const assetTable = `${db}.assetdata`;
const assetManagerTable = `${db}.asset_managers`;
const assetHistoryTable = `${db}.asset_history`;
const brandTable = `${db}.brands`;
const brandCategoryTable = `${db}.brand_category`;
const categoryTable = `${db}.categories`;
const costcenterTable = `${db}.costcenters`;
const departmentTable = `${db}.departments`;
const districtTable = `${db}.districts`;
const employeeTable = `${db}.employees`;
const employeeCostcenterTable = `${db}.employee_costcenters`;
const employeeDepartmentTable = `${db}.employee_departments`;
const employeeDistrictTable = `${db}.employee_districts`;
const employeePositionTable = `${db}.employee_positions`;
const modelTable = `${db}.models`;
const moduleTable = `${db}.modules`;
const softwareTable = `${db}.pc_software`;
const computerSpecsTable = `${db}.pc_specs`;
const vehicleSpecsTable = `${db}.v_specs`;
const positionTable = `${db}.positions`;
const sectionTable = `${db}.sections`;
const siteTable = `${db}.sites`;
const typeTable = `${db}.types`;
const zoneTable = `${db}.zones`;
const zoneDistrictTable = `${db}.zone_districts`;
/* To be develop */
const locationTable = `${db}.locations`;
const vendorTable = `${db}.vendors`;
const procurementTable = `${db}.procurements`;
const assetPurchaseTable = `${db}.asset_purchase`;
const assetTransferRequestTable = `${db}.asset_transfer_requests`;
const assetTransferDetailsTable = `${db}.asset_transfer_details`;
const transferChecklistTable = `${db}.transfer_checklists`;

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || path.join(process.cwd(), 'uploads');

// TYPES CRUD
export const createType = async (data: any) => {
  const { name, description, image, ramco_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${typeTable} (name, description, image, manager) VALUES (?, ?, ?, ?)` ,
    [name, description, image, ramco_id]
  );
  return result;
};

export const getTypes = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${typeTable}`);
  return rows;
};

export const getTypeById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${typeTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateType = async (id: number, data: any) => {
  const { name, description, image, ramco_id } = data;
  const [result] = await pool.query(
    `UPDATE ${typeTable} SET name = ?, description = ?, image = ?, manager = ? WHERE id = ?`,
    [name, description, image, ramco_id, id]
  );
  return result;
};

export const deleteType = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${typeTable} WHERE id = ?`, [id]);
  return result;
};

// CATEGORIES CRUD

export const createCategory = async (data: any) => {
  const { name, image, type_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${categoryTable} (name, image, type_id) VALUES (?, ?, ?)` ,
    [name, image, type_id ?? null]
  );
  return result;
};

export const getCategories = async (manager?: string | number | string[]) => {
  // Normalize manager input into a deduplicated array of string ids
  let managerIds: string[] = [];
  if (manager !== undefined && manager !== null && manager !== '') {
    if (Array.isArray(manager)) {
      managerIds = manager.map(m => String(m).trim()).filter(Boolean);
    } else if (typeof manager === 'string') {
      managerIds = manager.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      managerIds = [String(manager)];
    }
  }

  // If no manager filter provided, return all categories
  if (managerIds.length === 0) {
    const [rows] = await pool.query(`SELECT * FROM ${categoryTable} ORDER BY name`);
    return rows;
  }

  // Filter directly on the categories table by manager_id (no JOINs)
  // Deduplicate managerIds to avoid redundant placeholders
  managerIds = Array.from(new Set(managerIds));
  const placeholders = managerIds.map(() => '?').join(',');
  const sql = `SELECT * FROM ${categoryTable} WHERE manager_id IN (${placeholders}) ORDER BY name`;
  const [rows] = await pool.query(sql, managerIds);
  return rows;
};

export const getCategoryById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${categoryTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateCategory = async (id: number, data: any) => {
  const { name, image, type_id } = data;
  const sets: string[] = [];
  const params: any[] = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (image !== undefined) { sets.push('image = ?'); params.push(image); }
  if (type_id !== undefined) { sets.push('type_id = ?'); params.push(type_id); }
  const sql = `UPDATE ${categoryTable} SET ${sets.join(', ')} WHERE id = ?`;
  params.push(id);
  const [result] = await pool.query(sql, params);
  return result;
};

export const deleteCategory = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${categoryTable} WHERE id = ?`, [id]);
  return result;
};

// BRANDS CRUD

export const createBrand = async (data: any) => {
  const { name, logo, type_id, category_ids } = data;
  const [result] = await pool.query(
    `INSERT INTO ${brandTable} (name, image${type_id ? ', type_id' : ''}) VALUES (?, ?${type_id ? ', ?' : ''})`,
    type_id ? [name, logo, type_id] : [name, logo]
  );
  const insertId = (result as any).insertId as number | undefined;
  if (insertId && Array.isArray(category_ids) && category_ids.length > 0) {
    for (const category_id of category_ids) {
      await pool.query(
        `INSERT INTO ${brandCategoryTable} (brand_id, category_id) VALUES (?, ?)`,
        [insertId, category_id]
      );
    }
  }
  return result;
};

export const getBrands = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${brandTable}`);
  return rows;
};

export const getBrandById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${brandTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateBrand = async (id: number, data: any) => {
  const { name, logo, type_id, category_ids } = data;
  const sets: string[] = [];
  const params: any[] = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (logo !== undefined) { sets.push('image = ?'); params.push(logo); }
  if (type_id !== undefined) { sets.push('type_id = ?'); params.push(type_id); }
  if (sets.length > 0) {
    const sql = `UPDATE ${brandTable} SET ${sets.join(', ')} WHERE id = ?`;
    params.push(id);
    await pool.query(sql, params);
  }
  // Reset brand-category associations if category_ids provided
  if (Array.isArray(category_ids)) {
    await pool.query(`DELETE FROM ${brandCategoryTable} WHERE brand_id = ?`, [id]);
    for (const category_id of category_ids) {
      await pool.query(
        `INSERT INTO ${brandCategoryTable} (brand_id, category_id) VALUES (?, ?)`,
        [id, category_id]
      );
    }
  }
  return { ok: true } as any;
};

export const deleteBrand = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${brandTable} WHERE id = ?`, [id]);
  return result;
};

// MODELS CRUD

export const createModel = async (data: any) => {
  const { name, image, brand_id, category_id, type_id, specification, generation, status } = data;
  // Check for duplicate by name and type_id
  const [dupRows] = await pool.query(
    `SELECT id FROM ${modelTable} WHERE name = ? AND type_id = ?`,
    [name, type_id]
  );
  if (Array.isArray(dupRows) && dupRows.length > 0) {
    throw new Error('Model with the same name and type already exists');
  }
  const [result] = await pool.query(
    `INSERT INTO ${modelTable} (name, image, brand_id, category_id, type_id, specification, generation, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, image, brand_id, category_id, type_id, specification, generation, status]
  );
  return result;
};

export const getModels = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${modelTable}`);
  return rows;
};

export const getModelById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${modelTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateModel = async (id: number, data: any) => {
  const { name, image, brand_code, category_code, type_code, item_code, specification, generation, status } = data;
  const [result] = await pool.query(
    `UPDATE ${modelTable} SET name = ?, image = ?, brand_code = ?, category_code = ?, type_id = ?, item_code = ?, specification = ?, generation = ?, status = ? WHERE id = ?`,
    [name, image, brand_code, category_code, type_code, item_code, specification, generation, status, id]
  );
  return result;
};

export const deleteModel = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${modelTable} WHERE id = ?`, [id]);
  return result;
};

export const getModelsByBrand = async (brand_id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${modelTable} WHERE brand_id = ?`, [brand_id]);
  return rows;
};

// DEPARTMENTS CRUD
export const createDepartment = async (data: any) => {
  const { name } = data;
  const [result] = await pool.query(`INSERT INTO ${departmentTable} (name) VALUES (?)`, [name]);
  return result;
};

export const getDepartments = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${departmentTable}`);
  return rows;
};

export const getDepartmentById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${departmentTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateDepartment = async (id: number, data: any) => {
  const { name } = data;
  const [result] = await pool.query(`UPDATE ${departmentTable} SET name = ? WHERE id = ?`, [name, id]);
  return result;
};

export const deleteDepartment = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${departmentTable} WHERE id = ?`, [id]);
  return result;
};

// POSITIONS CRUD
export const createPosition = async (data: any) => {
  const { name } = data;
  const [result] = await pool.query(`INSERT INTO ${positionTable} (name) VALUES (?)`, [name]);
  return result;
};

export const getPositions = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${positionTable}`);
  return rows;
};

export const getPositionById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${positionTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updatePosition = async (id: number, data: any) => {
  const { name } = data;
  const [result] = await pool.query(`UPDATE ${positionTable} SET name = ? WHERE id = ?`, [name, id]);
  return result;
};

export const deletePosition = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${positionTable} WHERE id = ?`, [id]);
  return result;
};

// LOCATIONS CRUD
export const createLocation = async (data: any) => {
  const { name } = data;
  const [result] = await pool.query(`INSERT INTO ${locationTable} (name) VALUES (?)`, [name]);
  return result;
};

export const getLocations = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${locationTable}`);
  return rows;
};

export const getLocationById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${locationTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateLocation = async (id: number, data: any) => {
  const { name } = data;
  const [result] = await pool.query(`UPDATE ${locationTable} SET name = ? WHERE id = ?`, [name, id]);
  return result;
};

export const deleteLocation = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${locationTable} WHERE id = ?`, [id]);
  return result;
};

// DISTRICTS CRUD
export const createDistrict = async (data: any) => {
  const { name, code } = data;
  const [result] = await pool.query(
    `INSERT INTO ${districtTable} (name, code) VALUES (?, ?)`,
    [name, code]
  );
  return result;
};

export const getDistricts = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${districtTable}`);
  return rows;
};

export const getDistrictById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${districtTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateDistrict = async (id: number, data: any) => {
  const { name, code } = data;
  const [result] = await pool.query(
    `UPDATE ${districtTable} SET name = ?, code = ? WHERE id = ?`,
    [name, code, id]
  );
  return result;
};

export const deleteDistrict = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${districtTable} WHERE id = ?`, [id]);
  return result;
};

// ZONES CRUD
export const createZone = async (data: any) => {
  const { name, code, employee_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${zoneTable} (name, code, employee_id) VALUES (?, ?, ?)`,
    [name, code, employee_id]
  );
  return result;
};

export const getZones = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${zoneTable}`);
  return rows;
};

export const getZoneById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${zoneTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateZone = async (id: number, data: any) => {
  const { name, code, employee_id } = data;
  const [result] = await pool.query(
    `UPDATE ${zoneTable} SET name = ?, code = ?, employee_id = ? WHERE id = ?`,
    [name, code, employee_id, id]
  );
  return result;
};

export const deleteZone = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${zoneTable} WHERE id = ?`, [id]);
  return result;
};

// SITES CRUD
export const createSite = async (data: any) => {
  const { name = null, code = null, address = null, phone = null, email = null, description = null } = data;
  const [result] = await pool.query(
    `INSERT INTO ${siteTable} (name, code, address, phone, email, description) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, code, address, phone, email, description]
  );
  return result;
};

export const getSites = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${siteTable}`);
  return rows;
};

export const getSiteById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${siteTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateSite = async (id: number, data: any) => {
  const { name = null, code = null, address = null, phone = null, email = null, description = null } = data;
  const [result] = await pool.query(
    `UPDATE ${siteTable} SET name = ?, code = ?, address = ?, phone = ?, email = ?, description = ? WHERE id = ?`,
    [name, code, address, phone, email, description, id]
  );
  return result;
};

export const deleteSite = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${siteTable} WHERE id = ?`, [id]);
  return result;
};

export const getSitesBatch = async (offset: number, limit: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${siteTable} LIMIT ? OFFSET ?`, [limit, offset]);
  return rows;
};

export const getSitesCount = async () => {
  const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${siteTable}`);
  if (Array.isArray(rows) && rows.length > 0 && 'count' in rows[0]) {
    return (rows[0] as any).count;
  }
  return 0;
};

// ZONE_DISTRICTS (JOIN TABLE) CRUD
export const addDistrictToZone = async (zone_id: number, district_id: number) => {
  const [result] = await pool.query(
    `INSERT INTO ${zoneDistrictTable} (zone_id, district_id) VALUES (?, ?)`,
    [zone_id, district_id]
  );
  return result;
};

export const removeDistrictFromZone = async (zone_id: number, district_id: number) => {
  const [result] = await pool.query(
    `DELETE FROM ${zoneDistrictTable} WHERE zone_id = ? AND district_id = ?`,
    [zone_id, district_id]
  );
  return result;
};

export const getDistrictsByZone = async (zone_id: number) => {
  const [rows] = await pool.query(
    `SELECT d.* FROM ${districtTable} d INNER JOIN ${zoneDistrictTable} zd ON d.id = zd.district_id WHERE zd.zone_id = ?`,
    [zone_id]
  );
  return rows;
};

export const getZonesByDistrict = async (district_id: number) => {
  const [rows] = await pool.query(
    `SELECT z.* FROM ${zoneTable} z INNER JOIN ${zoneDistrictTable} zd ON z.id = zd.zone_id WHERE zd.district_id = ?`,
    [district_id]
  );
  return rows;
};

// Get all zone-district relationships
export const getAllZoneDistricts = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${zoneDistrictTable}`);
  return rows;
};

// Remove all zones from a given district
export const removeAllZonesFromDistrict = async (district_id: number) => {
  const [result] = await pool.query(
    `DELETE FROM ${zoneDistrictTable} WHERE district_id = ?`,
    [district_id]
  );
  return result;
};

// Remove all districts from a given zone
export const removeAllDistrictsFromZone = async (zone_id: number) => {
  const [result] = await pool.query(
    `DELETE FROM ${zoneDistrictTable} WHERE zone_id = ?`,
    [zone_id]
  );
  return result;
};

// USERS CRUD
export const createEmployee = async (data: any) => {
  const { name, email, phone, department_id, position_id, location_id, image, section_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${employeeTable} (name, email, phone, department_id, position_id, location_id, image, section_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, email, phone, department_id, position_id, location_id, image, section_id]
  );
  return result;
};

export const getEmployees = async (status?: string, cc?: string[] , dept?: string[] , loc?: string[] , supervisor?: string[], ramco?: string[], pos?: string[]) => {
  let query = `SELECT * FROM ${employeeTable}`;
  const params: any[] = [];
  const conditions: string[] = [];
  if (status) {
    conditions.push('employment_status = ?');
    params.push(status);
  }
  // cost center filter (assuming column name costcenter_id)
  if (Array.isArray(cc) && cc.length > 0) {
    const ph = cc.map(() => '?').join(',');
    conditions.push(`costcenter_id IN (${ph})`);
    params.push(...cc);
  }
  // department filter
  if (Array.isArray(dept) && dept.length > 0) {
    const ph = dept.map(() => '?').join(',');
    conditions.push(`department_id IN (${ph})`);
    params.push(...dept);
  }
  // location filter
  if (Array.isArray(loc) && loc.length > 0) {
    const ph = loc.map(() => '?').join(',');
    conditions.push(`location_id IN (${ph})`);
    params.push(...loc);
  }
  // supervisor filter (match supervisor_id column to ramco_id(s))
  if (Array.isArray(supervisor) && supervisor.length > 0) {
    const ph = supervisor.map(() => '?').join(',');
    conditions.push(`supervisor_id IN (${ph})`);
    params.push(...supervisor);
  }
  // ramco filter (match ramco_id column)
  if (Array.isArray(ramco) && ramco.length > 0) {
    const ph = ramco.map(() => '?').join(',');
    conditions.push(`ramco_id IN (${ph})`);
    params.push(...ramco);
  }
  // position filter (position_id)
  if (Array.isArray(pos) && pos.length > 0) {
    const ph = pos.map(() => '?').join(',');
    conditions.push(`position_id IN (${ph})`);
    params.push(...pos);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  const [rows] = await pool.query(query, params);
  return rows;
};

export const getEmployeeById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${employeeTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const getEmployeeByRamco = async (ramco_id: string) => {
  const [rows] = await pool.query(`SELECT * FROM ${employeeTable} WHERE ramco_id = ?`, [ramco_id]);
  return (rows as RowDataPacket[])[0];
};

export const getEmployeeByEmail = async (email: string) => {
  const [rows] = await pool.query(`SELECT * FROM ${employeeTable} WHERE email = ?`, [email]);
  return (rows as RowDataPacket[])[0];
};

export const getEmployeeByContact = async (contact: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${employeeTable} WHERE contact = ?`, [contact]);
  return (rows as RowDataPacket[])[0];
};

export const updateEmployee = async (id: number, data: any) => {
  const { name, email, phone, department_id, position_id, location_id, image, section_id } = data;
  const [result] = await pool.query(
    `UPDATE ${employeeTable} SET name = ?, email = ?, phone = ?, department_id = ?, position_id = ?, location_id = ?, image = ?, section_id = ? WHERE id = ?`,
    [name, email, phone, department_id, position_id, location_id, image, section_id, id]
  );
  return result;
};

export const deleteUser = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${employeeTable} WHERE id = ?`, [id]);
  return result;
};

// VENDORS CRUD
export const createVendor = async (data: any) => {
  const { name, quote_number, quote_date, quote_status } = data;
  const [result] = await pool.query(
    `INSERT INTO ${vendorTable} (name, quote_number, quote_date, quote_status) VALUES (?, ?, ?, ?)`,
    [name, quote_number, quote_date, quote_status]
  );
  return result;
};

export const getVendors = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${vendorTable}`);
  return rows;
};

export const getVendorById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${vendorTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateVendor = async (id: number, data: any) => {
  const { name, quote_number, quote_date, quote_status } = data;
  const [result] = await pool.query(
    `UPDATE ${vendorTable} SET name = ?, quote_number = ?, quote_date = ?, quote_status = ? WHERE id = ?`,
    [name, quote_number, quote_date, quote_status, id]
  );
  return result;
};

export const deleteVendor = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${vendorTable} WHERE id = ?`, [id]);
  return result;
};

// PROCUREMENTS CRUD
export const createProcurement = async (data: any) => {
  const { requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period } = data;
  const [result] = await pool.query(
    `INSERT INTO ${procurementTable} (requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period]
  );
  return result;
};

export const getProcurements = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${procurementTable}`);
  return rows;
};

export const getProcurementById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${procurementTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateProcurement = async (id: number, data: any) => {
  const { requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period } = data;
  const [result] = await pool.query(
    `UPDATE ${procurementTable} SET requisition_number = ?, vendor_id = ?, purchase_order = ?, purchase_order_date = ?, purchase_order_status = ?, delivery_date = ?, delivery_status = ?, develivery_order = ?, invoice_number = ?, invoice_date = ?, invoice_status = ?, cost_center_id = ?, department_id = ?, conditions = ?, price = ?, currency = ?, purchase_date = ?, warranty_period = ? WHERE id = ?`,
    [requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period, id]
  );
  return result;
};

export const deleteProcurement = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${procurementTable} WHERE id = ?`, [id]);
  return result;
};

// ASSETS GETTERS
export const getAssets = async (type_ids?: number[] | number, classification?: string, status?: string, manager?: number, registerNumber?: string, owner?: string | Array<string>, brandId?: number) => {
  let sql = `SELECT * FROM ${assetTable}`;
  let params: any[] = [];
  const conditions: string[] = [];
  if (typeof manager === 'number' && !isNaN(manager)) {
    conditions.push('manager_id = ?');
    params.push(manager);
  }
  if (Array.isArray(type_ids) && type_ids.length > 0) {
    conditions.push(`type_id IN (${type_ids.map(() => '?').join(',')})`);
    params.push(...type_ids);
  } else if (typeof type_ids === 'number' && !isNaN(type_ids)) {
    conditions.push('type_id = ?');
    params.push(type_ids);
  }
  if (typeof classification === 'string' && classification !== '') {
    conditions.push('classification = ?');
    params.push(classification);
  }
  if (typeof status === 'string' && status !== '') {
    conditions.push('record_status = ?');
    params.push(status);
  }
  if (typeof registerNumber === 'string' && registerNumber !== '') {
    conditions.push('register_number = ?');
    params.push(registerNumber);
  }
  // owner may be a single ramco_id or array/comma-separated list; match either current asset.ramco_id
  if (owner !== undefined && owner !== null && owner !== '') {
    // normalize owner to string array (accept single value, comma-separated, array, or number)
    let ownerIds: string[] = [];
    if (Array.isArray(owner)) {
      ownerIds = owner.map((o: any) => String(o).trim());
    } else if (typeof owner === 'string') {
      ownerIds = owner.split(',').map(s => s.trim()).filter(Boolean);
    } else if (typeof owner === 'number') {
      ownerIds = [String(owner)];
    }
    if (ownerIds.length > 0) {
      const placeholders = ownerIds.map(() => '?').join(',');
      // Only match current asset ramco_id (no asset_history involvement)
      conditions.push(`${assetTable}.ramco_id IN (${placeholders})`);
      params.push(...ownerIds);
    }
  }
  if (typeof brandId === 'number' && !isNaN(brandId)) {
    conditions.push('brand_id = ?');
    params.push(brandId);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  const [rows] = await pool.query(sql, params);
  // Ensure compatibility: some callers expect `asset_id` field (billing code).
  // Mirror `id` to `asset_id` when `asset_id` is not present.
  const mapped = (rows as RowDataPacket[]).map((r: any) => ({ ...r, asset_id: r.asset_id !== undefined && r.asset_id !== null ? r.asset_id : r.id }));
  return mapped;
};

export const getAssetById = async (id: number) => {
  if (typeof id !== 'number' || isNaN(id)) {
    throw new Error('Invalid asset id');
  }
  const [rows] = await pool.query(`SELECT * FROM ${assetTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const getAssetByCode = async (asset_code: string) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTable} WHERE asset_code = ?`, [asset_code]);
  return (rows as RowDataPacket[])[0];
};

// ASSETS CRUD
export const createAsset = async (data: any) => {
  const { register_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${assetTable} (register_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [register_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id]
  );
  return result;
};

export const updateAsset = async (id: number, data: any) => {
  const [result] = await pool.query(
    `UPDATE ${assetTable} SET brand_id = ?, category_id = ?, classification = ?, costcenter_id = ?, department_id = ?, entry_code = ?, fuel_type = ?, location_id = ?, model_id = ?, purchase_date = ?, purpose = ?, ramco_id = ?, record_status = ?, transmission = ?, type_id = ? WHERE id = ?`,
    [ data.brand_id, data.category_id, data.classification, data.costcenter_id, data.department_id, data.entry_code, data.fuel_type, data.location_id, data.model_id, data.purchase_date, data.purpose, data.ramco_id, data.record_status, data.transmission, data.type_id, id ]
  );

  // insert into asset_history on successful update
  try {
    const resAny: any = result as any;
    if (resAny && resAny.affectedRows && resAny.affectedRows > 0) {
      const asset = await getAssetById(id);
      if (asset) {
        await pool.query(
          `INSERT INTO ${assetHistoryTable} (asset_id, entry_code, register_number, vehicle_id, type_id, costcenter_id, department_id, location_id, ramco_id, effective_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.entry_code ?? null,
            asset.register_number ?? null,
            asset.vehicle_id ?? null,
            asset.type_id ?? null,
            asset.costcenter_id ?? null,
            asset.department_id ?? null,
            asset.location_id ?? null,
            asset.ramco_id ?? null,
            data.effective_date ?? new Date()
          ]
        );
      }
    }
  } catch (err) {
    // do not fail the update if history insertion fails; log and continue
    // eslint-disable-next-line no-console
    console.error('Failed to insert asset history for asset', id, err);
  }

  return result;
};

// Get the last entry_code for a given type_id (ordered by numeric suffix)
export const getLastEntryCodeByType = async (typeId: number): Promise<string | null> => {
  const prefix = String(typeId);
  const prefixLen = prefix.length;
  const [rows] = await pool.query(
    `SELECT entry_code FROM ${assetTable}
     WHERE type_id = ? AND entry_code IS NOT NULL AND entry_code LIKE CONCAT(?, '%')
     ORDER BY CAST(SUBSTRING(entry_code, ? + 1) AS UNSIGNED) DESC, entry_code DESC
     LIMIT 1`,
    [typeId, prefix, prefixLen]
  );
  const r = (rows as RowDataPacket[])[0];
  return r ? (r.entry_code as string) : null;
};

export const deleteAsset = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetTable} WHERE id = ?`, [id]);
  return result;
};

// ASSET_OWNERSHIP CRUD (using pc_ownership join table)
export const createAssetOwnership = async (data: any) => {
  const { asset_code, ramco_id, effective_date } = data;
  const [result] = await pool.query(
    `INSERT INTO ${assetHistoryTable} (asset_code, ramco_id, effective_date) VALUES (?, ?, ?)` ,
    [asset_code, ramco_id, effective_date]
  );
  return result;
};

export const getAssetOwnerships = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetHistoryTable}`);
  return rows;
};

export const getAssetOwnershipById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetHistoryTable} id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateAssetOwnership = async (id: number, data: any) => {
  const { asset_code, ramco_id, effective_date } = data;
  const [result] = await pool.query(
    `UPDATE ${assetHistoryTable} SET asset_code = ?, ramco_id = ?, effective_date = ? WHERE id = ?`,
    [asset_code, ramco_id, effective_date, id]
  );
  return result;
};

export const deleteAssetOwnership = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetHistoryTable} WHERE id = ?`, [id]);
  return result;
};

// SECTIONS CRUD
export const createSection = async (data: any) => {
  const { name, department_id } = data;
  const [result] = await pool.query(`INSERT INTO ${sectionTable} (name, department_id) VALUES (?, ?)`, [name, department_id]);
  return result;
};

export const getSections = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${sectionTable}`);
  return rows;
};

export const getSectionById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${sectionTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateSection = async (id: number, data: any) => {
  const { name, department_id } = data;
  const [result] = await pool.query(`UPDATE ${sectionTable} SET name = ?, department_id = ? WHERE id = ?`, [name, department_id, id]);
  return result;
};

export const deleteSection = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${sectionTable} WHERE id = ?`, [id]);
  return result;
};

// COSTCENTERS CRUD
export const createCostcenter = async (data: any) => {
  const { name = null, description = null } = data;
  const [result] = await pool.query(`INSERT INTO ${costcenterTable} (name, description) VALUES (?, ?)`, [name, description]);
  return result;
};

export const getCostcenters = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${costcenterTable}`);
  return rows;
};

export const getCostcenterById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${costcenterTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateCostcenter = async (id: number, data: any) => {
  const { name = null, description = null } = data;
  const [result] = await pool.query(`UPDATE ${costcenterTable} SET name = ?, description = ? WHERE id = ?`, [name, description, id]);
  return result;
};

export const deleteCostcenter = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${costcenterTable} WHERE id = ?`, [id]);
  return result;
};

// MODULES CRUD
export const createModule = async (data: any) => {
  const { name = null, code = null } = data;
  const [result] = await pool.query(`INSERT INTO ${moduleTable} (name, code) VALUES (?, ?)`, [name, code]);
  return result;
};

export const getModules = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${moduleTable}`);
  return rows;
};

export const getModuleById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${moduleTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateModule = async (id: number, data: any) => {
  const { name = null, code = null } = data;
  const [result] = await pool.query(`UPDATE ${moduleTable} SET name = ?, code = ? WHERE id = ?`, [name, code, id]);
  return result;
};

export const deleteModule = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${moduleTable} WHERE id = ?`, [id]);
  return result;
};

// BRAND_CATEGORIES JOIN TABLE CRUD
export const addBrandCategory = async (brand_code: string, category_code: string) => {
  const [result] = await pool.query(
    `INSERT INTO ${brandCategoryTable} (brand_code, category_code) VALUES (?, ?)`,
    [brand_code, category_code]
  );
  return result;
};

export const removeBrandCategory = async (brand_code: string, category_code: string) => {
  const [result] = await pool.query(
    `DELETE FROM ${brandCategoryTable} WHERE brand_code = ? AND category_code = ?`,
    [brand_code, category_code]
  );
  return result;
};

export const getCategoriesByBrand = async (brand_code: string) => {
  const [rows] = await pool.query(
    `SELECT category_code FROM ${brandCategoryTable} WHERE brand_code = ?`,
    [brand_code]
  );
  return rows;
};

export const getCategoriesByBrandId = async (brand_id: number) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name 
     FROM ${categoryTable} c 
     JOIN ${brandCategoryTable} bc ON c.id = bc.category_id 
     WHERE bc.brand_id = ?`,
    [brand_id]
  );
  return rows;
};

export const getBrandsByCategory = async (category_code: string) => {
  const [rows] = await pool.query(
    `SELECT brand_code FROM ${brandCategoryTable} WHERE category_code = ?`,
    [category_code]
  );
  return rows;
};

export const getBrandsByCategoryId = async (category_id: number) => {
  const [rows] = await pool.query(
    `SELECT b.id, b.name 
     FROM ${brandTable} b 
     JOIN ${brandCategoryTable} bc ON b.id = bc.brand_id 
     WHERE bc.category_id = ?`,
    [category_id]
  );
  return rows;
};

// SOFTWARE CRUD
export const getSoftwares = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${softwareTable}`);
  return rows;
};

export const getSoftwareById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${softwareTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const createSoftware = async (data: { name: string }) => {
  const { name } = data;
  const [result] = await pool.query(
    `INSERT INTO ${softwareTable} (name) VALUES (?)`,
    [name]
  );
  return result;
};

export const updateSoftware = async (id: number, data: { name: string }) => {
  const { name } = data;
  const [result] = await pool.query(
    `UPDATE ${softwareTable} SET name = ? WHERE id = ?`,
    [name, id]
  );
  return result;
};

export const deleteSoftware = async (id: number) => {
  const [result] = await pool.query(
    `DELETE FROM ${softwareTable} WHERE id = ?`,
    [id]
  );
  return result;
};

// Resolve codes to IDs for model creation/update
export const getTypeByCode = async (code: string | number) => {
  const [rows] = await pool.query(`SELECT * FROM ${typeTable} WHERE code = ? OR id = ?`, [code, code]);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getCategoryByCode = async (code: string | number) => {
  const [rows] = await pool.query(`SELECT * FROM ${categoryTable} WHERE code = ? OR id = ?`, [code, code]);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getBrandByCode = async (code: string | number) => {
  const [rows] = await pool.query(`SELECT * FROM ${brandTable} WHERE code = ? OR id = ?`, [code, code]);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

// Fetch specs for an asset (by asset_id)
export async function getComputerSpecsForAsset(asset_id: number) {
  const [rows] = await pool.query(
    `SELECT * FROM ${computerSpecsTable} WHERE asset_id = ?`,
    [asset_id]
  );
  return rows;
}

// Fetch installed software for an asset (by asset_id)
export async function getInstalledSoftwareForAsset(asset_id: number) {
  const [rows] = await pool.query(
    `SELECT pis.id, pis.software_id, s.name, pis.installed_at
     FROM assetdata.pc_installed_software pis
     JOIN assetdata.pc_software s ON pis.software_id = s.id
     WHERE pis.asset_id = ?`,
    [asset_id]
  );
  return rows;
}

// Fetch vehicle specs for an asset (by asset_id)
export async function getVehicleSpecsForAsset(asset_id: number) {
  const [rows] = await pool.query(
    `SELECT * FROM ${vehicleSpecsTable} WHERE asset_id = ?`,
    [asset_id]
  );
  return rows;
}

// Helper: safely extract string from query param
export function getStringParam(param: any): string | undefined {
  if (typeof param === 'string') return param;
  if (Array.isArray(param) && typeof param[0] === 'string') return param[0];
  return undefined;
}

// Helper: get assets by array of asset IDs
export const getAssetsByIds = async (assetIds: number[]) => {
  if (!Array.isArray(assetIds) || !assetIds.length) return [];
  const placeholders = assetIds.map(() => '?').join(',');
  const [rows] = await pool.query(`SELECT * FROM ${assetTable} WHERE id IN (${placeholders})`, assetIds);
  return rows;
};

// Search employees for autocomplete
export const searchEmployeesAutocomplete = async (query: string) => {
  const q = `%${query.toLowerCase()}%`;
  const [rows] = await pool.query(
    `SELECT ramco_id, full_name FROM ${employeeTable} WHERE employment_status = 'active' AND LOWER(full_name) LIKE ? OR LOWER(ramco_id) LIKE ? LIMIT 20`,
    [q, q]
  );
  return rows;
};



// ASSET TRANSFER REQUESTS CRUD

export const getAssetTransferRequests = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTransferRequestTable}`);
  return rows;
};

export const getAssetTransferRequestById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTransferRequestTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const createAssetTransferRequest = async (data: any) => {
  const [result] = await pool.query(
    `INSERT INTO ${assetTransferRequestTable} (request_no, requestor, request_date, verifier_id, verified_date, approval_id, approval_date, asset_mgr_id, qa_id, qa_date, action_date, request_status, return_to_asset_manager,  created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [data.request_no, data.requestor, data.request_date, data.verifier_id, data.verified_date, data.approval_id, data.approval_date, data.asset_mgr_id, data.qa_id, data.qa_date, data.action_date, data.request_status, data.return_to_asset_manager ? 1 : 0]
  );
  return (result as any).insertId;
};

export const createAssetTransferDetail = async (data: any) => {
  // Ensure only primitive values are inserted
  const getId = (v: any) => (v && typeof v === 'object' && 'id' in v) ? v.id : v ?? null;
  const [result] = await pool.query(
    `INSERT INTO ${assetTransferDetailsTable} (transfer_request_id, transfer_type, asset_type, identifier, curr_owner, curr_department, curr_district, curr_costcenter, new_owner, new_department, new_district, new_costcenter, effective_date, reasons, attachment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.transfer_request_id,
      data.transfer_type,
      data.asset_type,
      data.identifier,
      typeof data.curr_owner === 'object' ? data.curr_owner?.ramco_id ?? null : data.curr_owner ?? null,
      getId(data.curr_department),
      getId(data.curr_district),
      getId(data.curr_costcenter),
      typeof data.curr_owner === 'object' ? data.new_owner?.ramco_id ?? null : data.new_owner ?? null,
      getId(data.new_department),
      getId(data.new_district),
      getId(data.new_costcenter),
      data.effective_date,
      data.reasons,
      data.attachment
    ]
  );
  return result;
};

export const updateAssetTransferRequest = async (id: number, data: any) => {
  const { request_no, requestor, request_date, verifier_id, verified_date, approval_id, approval_date, asset_mgr_id, qa_id, qa_date, action_date, return_to_asset_manager } = data;
  const [result] = await pool.query(
    `UPDATE ${assetTransferRequestTable} SET request_no = ?, requestor = ?, request_date = ?, verifier_id = ?, verified_date = ?, approval_id = ?, approval_date = ?, asset_mgr_id = ?, qa_id = ?, qa_date = ?, action_date = ?, return_to_asset_manager = ?, updated_at = NOW() WHERE id = ?`,
    [request_no, requestor, request_date, verifier_id, verified_date, approval_id, approval_date, asset_mgr_id, qa_id, qa_date, action_date, return_to_asset_manager ? 1 : 0, id]
  );
  return result;
};
export const deleteAssetTransferRequest = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetTransferRequestTable} WHERE id = ?`, [id]);
  return result;
};
export const deleteAssetTransferDetailsByRequestId = async (requestId: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetTransferDetailsTable} WHERE transfer_request_id = ?`, [requestId]);
  return result;
};
export const getAssetTransferDetailsByRequestId = async (transfer_request_id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTransferDetailsTable} WHERE transfer_request_id = ?`, [transfer_request_id]);
  return rows;
};

export const getAssetTransferRequestsWithDetails = async () => {
  const requests = await (await pool.query(`SELECT * FROM ${assetTransferRequestTable}`))[0] as RowDataPacket[];
  if (!requests.length) return [];
  const allIds = requests.map((r: any) => r.id);
  const placeholders = allIds.map(() => '?').join(',');
  const [allDetails] = await pool.query(
    `SELECT * FROM ${assetTransferDetailsTable} WHERE transfer_request_id IN (${placeholders})`,
    allIds
  );
  // Group details by transfer_request_id
  const detailsMap: Record<number, any[]> = {};
  for (const detail of allDetails as any[]) {
    if (!detailsMap[detail.transfer_request_id]) detailsMap[detail.transfer_request_id] = [];
    detailsMap[detail.transfer_request_id].push(detail);
  }
  // Attach items to each request
  return requests.map((r: any) => ({ ...r, items: detailsMap[r.id] || [] }));
};

// Helper to generate the next request_no in the format 'AR/0001/{year}'.
export const generateNextRequestNo = async () => {
  const year = new Date().getFullYear();
  // Find the max number for this year
  const [rows] = await pool.query(
    `SELECT request_no FROM ${assetTransferRequestTable} WHERE request_no LIKE ? ORDER BY request_no DESC LIMIT 1`,
    [`AR/%/${year}`]
  );
  let nextNumber = 1;
  if (Array.isArray(rows) && rows.length > 0) {
    const last = (rows[0] as any).request_no;
    const match = last && last.match(/AR\/(\d{4})\//);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  return `AR/${nextNumber.toString().padStart(4, '0')}/${year}`;
};

// TRANSFER CHECKLISTS CRUD
export const getTransferChecklists = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${transferChecklistTable}`);
  return rows;
};
export const getTransferChecklistById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${transferChecklistTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};
export const createTransferChecklist = async (data: any) => {
  const { type_id, item, is_required, created_by } = data;
  const [result] = await pool.query(
    `INSERT INTO ${transferChecklistTable} (type_id, item, is_required, created_by, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [type_id, item, is_required ? 1 : 0, created_by]
  );
  return result;
}
export const updateTransferChecklist = async (id: number, data: any) => {
  const { type_id, item, is_required, sort_order, created_by } = data;
  const [result] = await pool.query(
    `UPDATE ${transferChecklistTable} SET type_id = ?, item = ?, is_required = ?, created_by = ?, created_at = NOW() WHERE id = ?`,
    [type_id, item, is_required ? 1 : 0, created_by, id]
  );
  return result;
};
export const deleteTransferChecklist = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${transferChecklistTable} WHERE id = ?`, [id]);
  return result;
};

/* ======= ASSET MANAGERS ======= */
export const getAssetManagers = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetManagerTable}`);
  return rows;
};

export const getAssetManagerById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetManagerTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};
export const getAssetManagerByRamcoId = async (ramco_id: string) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetManagerTable} WHERE ramco_id = ?`, [ramco_id]);
  return (rows as RowDataPacket[])[0];
};
export const createAssetManager = async (data: any) => {
  const [result] = await pool.query(
    `INSERT INTO ${assetManagerTable} (ramco_id, manager_id, created_at)
     VALUES (?, ?, NOW())`,
    [data.ramco_id, data.manager_id, data.created_at, data.is_active ? 1 : 0]
  );
  return result;
};
export const updateAssetManager = async (id: number, data: any) => {
  const [result] = await pool.query(
    `UPDATE ${assetManagerTable} SET ramco_id = ?, manager_id = ?, is_active = ?, updated_at = NOW() WHERE id = ?`,
    [data.ramco_id, data.manager_id, data.is_active ? 1 : 0, id]
  );
  return result;
};
export const deleteAssetManager = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetManagerTable} WHERE id = ?`, [id]);
  return result;
}


export default {
  createType,
  getTypes,
  getTypeById,
  updateType,
  deleteType,
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  createModel,
  getModels,
  getModelById,
  getModelsByBrand,
  updateModel,
  deleteModel,
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  createPosition,
  getPositions,
  getPositionById,
  updatePosition,
  deletePosition,
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  createDistrict,
  getDistricts,
  getDistrictById,
  updateDistrict,
  deleteDistrict,
  createZone,
  getZones,
  getZoneById,
  updateZone,
  deleteZone,
  createSite,
  getSites,
  getSiteById,
  updateSite,
  deleteSite,
  getSitesBatch,
  getSitesCount,
  addDistrictToZone,
  removeDistrictFromZone,
  getDistrictsByZone,
  getZonesByDistrict,
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteUser,
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  createProcurement,
  getProcurements,
  getProcurementById,
  updateProcurement,
  deleteProcurement,
  createAsset,
  getAssets,
  getAssetById,
  getAssetByCode,
  updateAsset,
  deleteAsset,
  createAssetOwnership,
  getAssetOwnerships,
  getAssetOwnershipById,
  updateAssetOwnership,
  deleteAssetOwnership,
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
  createCostcenter,
  getCostcenters,
  getCostcenterById,
  updateCostcenter,
  deleteCostcenter,
  createModule,
  getModules,
  getModuleById,
  updateModule,
  deleteModule,
  getAllZoneDistricts,
  removeAllZonesFromDistrict,
  removeAllDistrictsFromZone,
  getTypeByCode,
  getCategoryByCode,
  getBrandByCode,
  addBrandCategory,
  removeBrandCategory,
  getCategoriesByBrand,
  getCategoriesByBrandId,
  getBrandsByCategory,
  getBrandsByCategoryId,
  getSoftwares,
  getSoftwareById,
  createSoftware,
  updateSoftware,
  deleteSoftware,
  getComputerSpecsForAsset,
  getInstalledSoftwareForAsset,
  getVehicleSpecsForAsset,
  searchEmployeesAutocomplete,
  createAssetTransferRequest,
  createAssetTransferDetail,
  getAssetTransferRequestsWithDetails,
  generateNextRequestNo,
  getTransferChecklists,
  getTransferChecklistById,
  createTransferChecklist,
  updateTransferChecklist,
  deleteTransferChecklist,
  getAssetManagers,
  getAssetManagerById,
  getAssetManagerByRamcoId,
  createAssetManager,
  updateAssetManager,
  deleteAssetManager,
};
