import pool from "../utils/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import fs from 'fs';
import path from 'path';

// Database and table declarations for easy swapping/testing
const db = 'assetdata';
const typeTable = `${db}.types`;
const categoryTable = `${db}.pc_category`;
const brandTable = `${db}.pc_brand`;
const modelTable = `${db}.pc_model`;
const departmentTable = `${db}.departments`;
const positionTable = `${db}.positions`;
const locationTable = `${db}.locations`;
const districtTable = `${db}.districts`;
const zoneTable = `${db}.zones`;
const siteTable = `${db}.sites`;
const costcenterTable = `${db}.costcenters`;
const moduleTable = `${db}.modules`;
const employeeTable = `${db}.employees`;
const vendorTable = `${db}.vendors`;
const procurementTable = `${db}.procurements`;
const assetTable = `${db}.pc_master`;
const assetUserTable = `${db}.pc_ownership`;
const sectionTable = `${db}.sections`;
const zoneDistrictTable = `${db}.zone_districts`;
const brandCategoryTable = `${db}.pc_brand_category`;
const softwareTable = `${db}.pc_software`;

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
  const { code, name, description, image } = data;
  const storedImage = await handleTypeImage(image);
  const [result] = await pool.query(
    `INSERT INTO ${typeTable} (code, name, description, image) VALUES (?, ?, ?, ?)` ,
    [code, name, description, storedImage]
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
  const { code, name, description, image } = data;
  const storedImage = await handleTypeImage(image);
  const [result] = await pool.query(
    `UPDATE ${typeTable} SET code = ?, name = ?, description = ?, image = ? WHERE id = ?`,
    [code, name, description, storedImage, id]
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

export const getEmployees = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${employeeTable}`);
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
export const getAssets = async () => {
  const [rows] = await pool.query(`SELECT * FROM ${assetTable}`);
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
  const { serial_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id } = data;
  const [result] = await pool.query(
    `INSERT INTO ${assetTable} (serial_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [serial_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id]
  );
  return result;
};

export const updateAsset = async (id: number, data: any) => {
  const { serial_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id } = data;
  const [result] = await pool.query(
    `UPDATE ${assetTable} SET serial_number = ?, finance_tag = ?, model_id = ?, brand_id = ?, category_id = ?, type_id = ?, status = ?, depreciation_rate = ?, procurement_id = ? WHERE id = ?`,
    [serial_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id, id]
  );
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
  const [rows] = await pool.query(`SELECT * FROM ${assetUserTable} WHERE id = ?`, [id]);
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

// Fetch specs for an asset (by asset_code)
export async function getSpecsForAsset(asset_code: string) {
  const [rows] = await pool.query(
    `SELECT id, asset_code, cpu, cpu_generation, memory_size, storage_size, os
     FROM assetdata.pc_specs WHERE asset_code = ?`,
    [asset_code]
  );
  return rows;
}

// Fetch installed software for an asset (by asset_code)
export async function getInstalledSoftwareForAsset(asset_code: string) {
  const [rows] = await pool.query(
    `SELECT pis.id, pis.software_id, s.name, pis.installed_at
     FROM assetdata.pc_installed_software pis
     JOIN assetdata.pc_software s ON pis.software_id = s.id
     WHERE pis.asset_code = ?`,
    [asset_code]
  );
  return rows;
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
  getSpecsForAsset,
  getInstalledSoftwareForAsset
};
