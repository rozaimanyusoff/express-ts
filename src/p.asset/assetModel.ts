import {pool} from "../utils/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import fs from 'fs';
import path from 'path';

// Database and table declarations for easy swapping/testing
const db = 'assetdata';
const assetTable = `${db}.asset_data`;
const assetUserTable = `${db}.asset_ownership`;
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

// Helper to move type image to uploads/types/ if needed
async function handleTypeImage(image: string) {
  if (!image) return '';
  const uploadsDir = path.join(process.cwd(), 'uploads', 'types');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // If image is a base64 string, save it as a file
  if (image.startsWith('data:image/')) {
    const ext = image.substring(image.indexOf('/') + 1, image.indexOf(';'));
    const base64Data = image.split(',')[1];
    const filename = `type_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, base64Data, 'base64');
    return filename;
  }
  // If image is a filename, just return it
  return image;
}

// TYPES CRUD
export const createType = async (data: any) => {
  const { code, name, description, image, ramco_id } = data;
  const storedImage = await handleTypeImage(image);
  const [result] = await pool.query(
    `INSERT INTO ${typeTable} (code, name, description, image, ramco_id) VALUES (?, ?, ?, ?, ?)` ,
    [code, name, description, storedImage, ramco_id]
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
  const { code, name, description, image, ramco_id } = data;
  const storedImage = await handleTypeImage(image);
  const [result] = await pool.query(
    `UPDATE ${typeTable} SET code = ?, name = ?, description = ?, image = ?, ramco_id = ? WHERE id = ?`,
    [code, name, description, storedImage, ramco_id, id]
  );
  return result;
};

export const deleteType = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${typeTable} WHERE id = ?`, [id]);
  return result;
};

// CATEGORIES CRUD
// Helper to move category image to uploads/category/ if needed
async function handleCategoryImage(image: string) {
  if (!image) return '';
  const uploadsDir = path.join(process.cwd(), 'uploads', 'category');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // If image is a base64 string, save it as a file
  if (image.startsWith('data:image/')) {
    const ext = image.substring(image.indexOf('/') + 1, image.indexOf(';'));
    const base64Data = image.split(',')[1];
    const filename = `category_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, base64Data, 'base64');
    return filename;
  }
  // If image is a filename, just return it
  return image;
}

export const createCategory = async (data: any) => {
  const { name, code, image, type_code } = data;
  const storedImage = await handleCategoryImage(image);
  const [result] = await pool.query(
    `INSERT INTO ${categoryTable} (name, code, image, type_code) VALUES (?, ?, ?, ?)` ,
    [name, code, storedImage, type_code]
  );
  return result;
};

export const getCategories = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${categoryTable}`);
  return rows;
};

export const getCategoryById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${categoryTable} WHERE id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateCategory = async (id: number, data: any) => {
  const { name, code, image, type_code } = data;
  const storedImage = await handleCategoryImage(image);
  const [result] = await pool.query(
    `UPDATE ${categoryTable} SET name = ?, code = ?, image = ?, type_code = ? WHERE id = ?`,
    [name, code, storedImage, type_code, id]
  );
  return result;
};

export const deleteCategory = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${categoryTable} WHERE id = ?`, [id]);
  return result;
};

// BRANDS CRUD
// Helper to move logo image to uploads/brands/ if needed
async function handleBrandLogo(logo: string) {
  if (!logo) return '';
  const uploadsDir = path.join(process.cwd(), 'uploads', 'brands');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // If logo is a base64 string, save it as a file
  if (logo.startsWith('data:image/')) {
    const ext = logo.substring(logo.indexOf('/') + 1, logo.indexOf(';'));
    const base64Data = logo.split(',')[1];
    const filename = `brand_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, base64Data, 'base64');
    return filename;
  }
  // If logo is a filename, just return it
  return logo;
}

export const createBrand = async (data: any) => {
  const { name, code, logo, type_code, category_codes } = data;
  const image = await handleBrandLogo(logo);
  // Use type_code as type_code in DB
  const [result] = await pool.query(
    `INSERT INTO ${brandTable} (name, code, image${type_code ? ', type_code' : ''}) VALUES (?, ?, ?${type_code ? ', ?' : ''})`,
    type_code ? [name, code, image, type_code] : [name, code, image]
  );
  // Handle brand-category associations if category_codes is array
  if (Array.isArray(category_codes) && category_codes.length > 0) {
    for (const category_code of category_codes) {
      await pool.query(
        `INSERT INTO ${brandCategoryTable} (brand_code, category_code) VALUES (?, ?)`,
        [code, category_code]
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
  const { name, code, logo, type_code, category_codes } = data;
  const image = await handleBrandLogo(logo);
  // Only update type_code if type_code is present
  let sql = `UPDATE ${brandTable} SET name = ?, code = ?, image = ?`;
  let params: any[] = [name, code, image];
  if (type_code) {
    sql += ', type_code = ?';
    params.push(type_code);
  }
  sql += ' WHERE id = ?';
  params.push(id);
  const [result] = await pool.query(sql, params);
  // Remove all previous brand-category associations for this brand
  if (code) {
    await pool.query(
      `DELETE FROM ${brandCategoryTable} WHERE brand_code = ?`,
      [code]
    );
    // Add new associations
    if (Array.isArray(category_codes) && category_codes.length > 0) {
      for (const category_code of category_codes) {
        await pool.query(
          `INSERT INTO ${brandCategoryTable} (brand_code, category_code) VALUES (?, ?)`,
          [code, category_code]
        );
      }
    }
  }
  return result;
};

export const deleteBrand = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${brandTable} WHERE id = ?`, [id]);
  return result;
};

// MODELS CRUD
// Helper to move model image to uploads/models/ if needed
async function handleModelImage(image: string) {
  if (!image) return '';
  const uploadsDir = path.join(process.cwd(), 'uploads', 'models');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // If image is a base64 string, save it as a file
  if (image.startsWith('data:image/')) {
    const ext = image.substring(image.indexOf('/') + 1, image.indexOf(';'));
    const base64Data = image.split(',')[1];
    const filename = `model_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, base64Data, 'base64');
    return filename;
  }
  // If image is a filename, just return it
  return image;
}

export const createModel = async (data: any) => {
  const { name, image, brand_code, category_code, type_code, model_code, item_code, specification, generation, status } = data;
  const storedImage = await handleModelImage(image);
  const [result] = await pool.query(
    `INSERT INTO ${modelTable} (name, image, brand_code, category_code, type_code, model_code, item_code, specification, generation, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, storedImage, brand_code, category_code, type_code, model_code, item_code, specification, generation, status]
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
  const { name, image, brand_code, category_code, type_code, model_code, item_code, specification, generation, status } = data;
  const storedImage = await handleModelImage(image);
  const [result] = await pool.query(
    `UPDATE ${modelTable} SET name = ?, image = ?, brand_code = ?, category_code = ?, type_code = ?, model_code = ?, item_code = ?, specification = ?, generation = ?, status = ? WHERE id = ?`,
    [name, storedImage, brand_code, category_code, type_code, model_code, item_code, specification, generation, status, id]
  );
  return result;
};

export const deleteModel = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${modelTable} WHERE id = ?`, [id]);
  return result;
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

export const getEmployees = async (status?: string) => {
  let query = `SELECT * FROM ${employeeTable}`;
  const params: any[] = [];
  if (status) {
    query += ' WHERE employment_status = ?';
    params.push(status);
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
export const getAssets = async (type_ids?: number[] | number, status?: string) => {
  let sql = `SELECT * FROM ${assetTable}`;
  let params: any[] = [];
  const conditions: string[] = [];
  if (Array.isArray(type_ids) && type_ids.length > 0) {
    conditions.push(`type_id IN (${type_ids.map(() => '?').join(',')})`);
    params.push(...type_ids);
  } else if (typeof type_ids === 'number' && !isNaN(type_ids)) {
    conditions.push('type_id = ?');
    params.push(type_ids);
  }
  if (typeof status === 'string' && status !== '') {
    conditions.push('status = ?');
    params.push(status);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  const [rows] = await pool.query(sql, params);
  return rows;
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
  // Build update query dynamically from data keys
  const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const values = Object.values(data);
  const sql = `UPDATE ${assetTable} SET ${fields} WHERE id = ?`;
  const [result] = await pool.query(sql, [...values, id]);
  return result;
};

export const deleteAsset = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetTable} WHERE id = ?`, [id]);
  return result;
};

// ASSET_OWNERSHIP CRUD (using pc_ownership join table)
export const createAssetOwnership = async (data: any) => {
  const { asset_code, ramco_id, effective_date } = data;
  const [result] = await pool.query(
    `INSERT INTO ${assetUserTable} (asset_code, ramco_id, effective_date) VALUES (?, ?, ?)` ,
    [asset_code, ramco_id, effective_date]
  );
  return result;
};

export const getAssetOwnerships = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetUserTable}`);
  return rows;
};

export const getAssetOwnershipById = async (id: number) => {
  const [rows] = await pool.query(`SELECT * FROM ${assetUserTable} id = ?`, [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateAssetOwnership = async (id: number, data: any) => {
  const { asset_code, ramco_id, effective_date } = data;
  const [result] = await pool.query(
    `UPDATE ${assetUserTable} SET asset_code = ?, ramco_id = ?, effective_date = ? WHERE id = ?`,
    [asset_code, ramco_id, effective_date, id]
  );
  return result;
};

export const deleteAssetOwnership = async (id: number) => {
  const [result] = await pool.query(`DELETE FROM ${assetUserTable} WHERE id = ?`, [id]);
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

export const getBrandsByCategory = async (category_code: string) => {
  const [rows] = await pool.query(
    `SELECT brand_code FROM ${brandCategoryTable} WHERE category_code = ?`,
    [category_code]
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
    `SELECT ramco_id, full_name FROM ${employeeTable} WHERE LOWER(full_name) LIKE ? OR LOWER(ramco_id) LIKE ? LIMIT 20`,
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
  getBrandsByCategory,
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
};
