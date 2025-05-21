import pool from "../utils/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";

// TYPES CRUD
export const createType = async (data: any) => {
  const { name, description, image } = data;
  const [result] = await pool.query(
    'INSERT INTO si.types (name, description, image) VALUES (?, ?, ?)',
    [name, description, image]
  );
  return result;
};

export const getTypes = async () => {
  const [rows] = await pool.query('SELECT * FROM si.types');
  return rows;
};

export const getTypeById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.types WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateType = async (id: number, data: any) => {
  const { name, description, image } = data;
  const [result] = await pool.query(
    'UPDATE si.types SET name = ?, description = ?, image = ? WHERE id = ?',
    [name, description, image, id]
  );
  return result;
};

export const deleteType = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.types WHERE id = ?', [id]);
  return result;
};

// CATEGORIES CRUD
export const createCategory = async (data: any) => {
  const { name, description, image, type_id } = data;
  const [result] = await pool.query(
    'INSERT INTO si.categories (name, description, image, type_id) VALUES (?, ?, ?, ?)',
    [name, description, image, type_id]
  );
  return result;
};

export const getCategories = async () => {
  const [rows] = await pool.query('SELECT * FROM si.categories');
  return rows;
};

export const getCategoryById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.categories WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateCategory = async (id: number, data: any) => {
  const { name, description, image, type_id } = data;
  const [result] = await pool.query(
    'UPDATE si.categories SET name = ?, description = ?, image = ?, type_id = ? WHERE id = ?',
    [name, description, image, type_id, id]
  );
  return result;
};

export const deleteCategory = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.categories WHERE id = ?', [id]);
  return result;
};

// BRANDS CRUD
export const createBrand = async (data: any) => {
  const { name, description, image, type_id, category_id } = data;
  const [result] = await pool.query(
    'INSERT INTO si.brands (name, description, image, type_id, category_id) VALUES (?, ?, ?, ?, ?)',
    [name, description, image, type_id, category_id]
  );
  return result;
};

export const getBrands = async () => {
  const [rows] = await pool.query('SELECT * FROM si.brands');
  return rows;
};

export const getBrandById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.brands WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateBrand = async (id: number, data: any) => {
  const { name, description, image, type_id, category_id } = data;
  const [result] = await pool.query(
    'UPDATE si.brands SET name = ?, description = ?, image = ?, type_id = ?, category_id = ? WHERE id = ?',
    [name, description, image, type_id, category_id, id]
  );
  return result;
};

export const deleteBrand = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.brands WHERE id = ?', [id]);
  return result;
};

// MODELS CRUD
export const createModel = async (data: any) => {
  const { name, description, image, brand_id, category_id } = data;
  const [result] = await pool.query(
    'INSERT INTO si.models (name, description, image, brand_id, category_id) VALUES (?, ?, ?, ?, ?)',
    [name, description, image, brand_id, category_id]
  );
  return result;
};

export const getModels = async () => {
  const [rows] = await pool.query('SELECT * FROM si.models');
  return rows;
};

export const getModelById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.models WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateModel = async (id: number, data: any) => {
  const { name, description, image, brand_id, category_id } = data;
  const [result] = await pool.query(
    'UPDATE si.models SET name = ?, description = ?, image = ?, brand_id = ?, category_id = ? WHERE id = ?',
    [name, description, image, brand_id, category_id, id]
  );
  return result;
};

export const deleteModel = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.models WHERE id = ?', [id]);
  return result;
};

// DEPARTMENTS CRUD
export const createDepartment = async (data: any) => {
  const { name } = data;
  const [result] = await pool.query('INSERT INTO si.departments (name) VALUES (?)', [name]);
  return result;
};

export const getDepartments = async () => {
  const [rows] = await pool.query('SELECT * FROM si.departments');
  return rows;
};

export const getDepartmentById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.departments WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateDepartment = async (id: number, data: any) => {
  const { name } = data;
  const [result] = await pool.query('UPDATE si.departments SET name = ? WHERE id = ?', [name, id]);
  return result;
};

export const deleteDepartment = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.departments WHERE id = ?', [id]);
  return result;
};

// POSITIONS CRUD
export const createPosition = async (data: any) => {
  const { name } = data;
  const [result] = await pool.query('INSERT INTO si.positions (name) VALUES (?)', [name]);
  return result;
};

export const getPositions = async () => {
  const [rows] = await pool.query('SELECT * FROM si.positions');
  return rows;
};

export const getPositionById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.positions WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updatePosition = async (id: number, data: any) => {
  const { name } = data;
  const [result] = await pool.query('UPDATE si.positions SET name = ? WHERE id = ?', [name, id]);
  return result;
};

export const deletePosition = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.positions WHERE id = ?', [id]);
  return result;
};

// LOCATIONS CRUD
export const createLocation = async (data: any) => {
  const { name } = data;
  const [result] = await pool.query('INSERT INTO si.locations (name) VALUES (?)', [name]);
  return result;
};

export const getLocations = async () => {
  const [rows] = await pool.query('SELECT * FROM si.locations');
  return rows;
};

export const getLocationById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.locations WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateLocation = async (id: number, data: any) => {
  const { name } = data;
  const [result] = await pool.query('UPDATE si.locations SET name = ? WHERE id = ?', [name, id]);
  return result;
};

export const deleteLocation = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.locations WHERE id = ?', [id]);
  return result;
};

// DISTRICTS CRUD
export const createDistrict = async (data: any) => {
  const { name, code } = data;
  const [result] = await pool.query(
    'INSERT INTO si.districts (name, code) VALUES (?, ?)',
    [name, code]
  );
  return result;
};

export const getDistricts = async () => {
  const [rows] = await pool.query('SELECT * FROM si.districts');
  return rows;
};

export const getDistrictById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.districts WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateDistrict = async (id: number, data: any) => {
  const { name, code } = data;
  const [result] = await pool.query(
    'UPDATE si.districts SET name = ?, code = ? WHERE id = ?',
    [name, code, id]
  );
  return result;
};

export const deleteDistrict = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.districts WHERE id = ?', [id]);
  return result;
};

// ZONES CRUD
export const createZone = async (data: any) => {
  const { name, code, employee_id } = data;
  const [result] = await pool.query(
    'INSERT INTO si.zones (name, code, employee_id) VALUES (?, ?, ?)',
    [name, code, employee_id]
  );
  return result;
};

export const getZones = async () => {
  const [rows] = await pool.query('SELECT * FROM si.zones');
  return rows;
};

export const getZoneById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.zones WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateZone = async (id: number, data: any) => {
  const { name, code, employee_id } = data;
  const [result] = await pool.query(
    'UPDATE si.zones SET name = ?, code = ?, employee_id = ? WHERE id = ?',
    [name, code, employee_id, id]
  );
  return result;
};

export const deleteZone = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.zones WHERE id = ?', [id]);
  return result;
};

// ZONE_DISTRICTS (JOIN TABLE) CRUD
export const addDistrictToZone = async (zone_id: number, district_id: number) => {
  const [result] = await pool.query(
    'INSERT INTO si.zone_districts (zone_id, district_id) VALUES (?, ?)',
    [zone_id, district_id]
  );
  return result;
};

export const removeDistrictFromZone = async (zone_id: number, district_id: number) => {
  const [result] = await pool.query(
    'DELETE FROM si.zone_districts WHERE zone_id = ? AND district_id = ?',
    [zone_id, district_id]
  );
  return result;
};

export const getDistrictsByZone = async (zone_id: number) => {
  const [rows] = await pool.query(
    'SELECT d.* FROM si.districts d INNER JOIN si.zone_districts zd ON d.id = zd.district_id WHERE zd.zone_id = ?',
    [zone_id]
  );
  return rows;
};

export const getZonesByDistrict = async (district_id: number) => {
  const [rows] = await pool.query(
    'SELECT z.* FROM si.zones z INNER JOIN si.zone_districts zd ON z.id = zd.zone_id WHERE zd.district_id = ?',
    [district_id]
  );
  return rows;
};

// USERS CRUD
export const createEmp = async (data: any) => {
  const { name, email, phone, department_id, position_id, location_id, image, section_id } = data;
  const [result] = await pool.query(
    'INSERT INTO si.employees (name, email, phone, department_id, position_id, location_id, image, section_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, email, phone, department_id, position_id, location_id, image, section_id]
  );
  return result;
};

export const getUsers = async () => {
  const [rows] = await pool.query('SELECT * FROM si.employees');
  return rows;
};

export const getUserById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.employees WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateEmp = async (id: number, data: any) => {
  const { name, email, phone, department_id, position_id, location_id, image, section_id } = data;
  const [result] = await pool.query(
    'UPDATE si.employees SET name = ?, email = ?, phone = ?, department_id = ?, position_id = ?, location_id = ?, image = ?, section_id = ? WHERE id = ?',
    [name, email, phone, department_id, position_id, location_id, image, section_id, id]
  );
  return result;
};

export const deleteUser = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.employees WHERE id = ?', [id]);
  return result;
};

// VENDORS CRUD
export const createVendor = async (data: any) => {
  const { name, quote_number, quote_date, quote_status } = data;
  const [result] = await pool.query(
    'INSERT INTO si.vendors (name, quote_number, quote_date, quote_status) VALUES (?, ?, ?, ?)',
    [name, quote_number, quote_date, quote_status]
  );
  return result;
};

export const getVendors = async () => {
  const [rows] = await pool.query('SELECT * FROM si.vendors');
  return rows;
};

export const getVendorById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.vendors WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateVendor = async (id: number, data: any) => {
  const { name, quote_number, quote_date, quote_status } = data;
  const [result] = await pool.query(
    'UPDATE si.vendors SET name = ?, quote_number = ?, quote_date = ?, quote_status = ? WHERE id = ?',
    [name, quote_number, quote_date, quote_status, id]
  );
  return result;
};

export const deleteVendor = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.vendors WHERE id = ?', [id]);
  return result;
};

// PROCUREMENTS CRUD
export const createProcurement = async (data: any) => {
  const { requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period } = data;
  const [result] = await pool.query(
    'INSERT INTO si.procurements (requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period]
  );
  return result;
};

export const getProcurements = async () => {
  const [rows] = await pool.query('SELECT * FROM si.procurements');
  return rows;
};

export const getProcurementById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.procurements WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateProcurement = async (id: number, data: any) => {
  const { requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period } = data;
  const [result] = await pool.query(
    'UPDATE si.procurements SET requisition_number = ?, vendor_id = ?, purchase_order = ?, purchase_order_date = ?, purchase_order_status = ?, delivery_date = ?, delivery_status = ?, develivery_order = ?, invoice_number = ?, invoice_date = ?, invoice_status = ?, cost_center_id = ?, department_id = ?, conditions = ?, price = ?, currency = ?, purchase_date = ?, warranty_period = ? WHERE id = ?',
    [requisition_number, vendor_id, purchase_order, purchase_order_date, purchase_order_status, delivery_date, delivery_status, develivery_order, invoice_number, invoice_date, invoice_status, cost_center_id, department_id, conditions, price, currency, purchase_date, warranty_period, id]
  );
  return result;
};

export const deleteProcurement = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.procurements WHERE id = ?', [id]);
  return result;
};

// ASSETS CRUD
export const createAsset = async (data: any) => {
  const { serial_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id } = data;
  const [result] = await pool.query(
    'INSERT INTO si.assets (serial_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [serial_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id]
  );
  return result;
};

export const getAssets = async () => {
  const [rows] = await pool.query('SELECT * FROM si.assets');
  return rows;
};

export const getAssetById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.assets WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateAsset = async (id: number, data: any) => {
  const { serial_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id } = data;
  const [result] = await pool.query(
    'UPDATE si.assets SET serial_number = ?, finance_tag = ?, model_id = ?, brand_id = ?, category_id = ?, type_id = ?, status = ?, depreciation_rate = ?, procurement_id = ? WHERE id = ?',
    [serial_number, finance_tag, model_id, brand_id, category_id, type_id, status, depreciation_rate, procurement_id, id]
  );
  return result;
};

export const deleteAsset = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.assets WHERE id = ?', [id]);
  return result;
};

// ASSET_USERS CRUD
export const createAssetUser = async (data: any) => {
  const { asset_id, handover_date, handover_status, return_date, handover_user_id } = data;
  const [result] = await pool.query(
    'INSERT INTO si.asset_users (asset_id, handover_date, handover_status, return_date, handover_user_id) VALUES (?, ?, ?, ?, ?)',
    [asset_id, handover_date, handover_status, return_date, handover_user_id]
  );
  return result;
};

export const getAssetUsers = async () => {
  const [rows] = await pool.query('SELECT * FROM si.asset_users');
  return rows;
};

export const getAssetUserById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.asset_users WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateAssetUser = async (id: number, data: any) => {
  const { asset_id, handover_date, handover_status, return_date, handover_user_id } = data;
  const [result] = await pool.query(
    'UPDATE si.asset_users SET asset_id = ?, handover_date = ?, handover_status = ?, return_date = ?, handover_user_id = ? WHERE id = ?',
    [asset_id, handover_date, handover_status, return_date, handover_user_id, id]
  );
  return result;
};

export const deleteAssetUser = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.asset_users WHERE id = ?', [id]);
  return result;
};

// SECTIONS CRUD
export const createSection = async (data: any) => {
  const { name, department_id } = data;
  const [result] = await pool.query('INSERT INTO si.sections (name, department_id) VALUES (?, ?)', [name, department_id]);
  return result;
};

export const getSections = async () => {
  const [rows] = await pool.query('SELECT * FROM si.sections');
  return rows;
};

export const getSectionById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.sections WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateSection = async (id: number, data: any) => {
  const { name, department_id } = data;
  const [result] = await pool.query('UPDATE si.sections SET name = ?, department_id = ? WHERE id = ?', [name, department_id, id]);
  return result;
};

export const deleteSection = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.sections WHERE id = ?', [id]);
  return result;
};

// COSTCENTERS CRUD
export const createCostcenter = async (data: any) => {
  const { name = null, description = null } = data;
  const [result] = await pool.query('INSERT INTO si.costcenters (name, description) VALUES (?, ?)', [name, description]);
  return result;
};

export const getCostcenters = async () => {
  const [rows] = await pool.query('SELECT * FROM si.costcenters');
  return rows;
};

export const getCostcenterById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.costcenters WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateCostcenter = async (id: number, data: any) => {
  const { name = null, description = null } = data;
  const [result] = await pool.query('UPDATE si.costcenters SET name = ?, description = ? WHERE id = ?', [name, description, id]);
  return result;
};

export const deleteCostcenter = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.costcenters WHERE id = ?', [id]);
  return result;
};

// MODULES CRUD
export const createModule = async (data: any) => {
  const { name = null, code = null } = data;
  const [result] = await pool.query('INSERT INTO si.modules (name, code) VALUES (?, ?)', [name, code]);
  return result;
};

export const getModules = async () => {
  const [rows] = await pool.query('SELECT * FROM si.modules');
  return rows;
};

export const getModuleById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM si.modules WHERE id = ?', [id]);
  return (rows as RowDataPacket[])[0];
};

export const updateModule = async (id: number, data: any) => {
  const { name = null, code = null } = data;
  const [result] = await pool.query('UPDATE si.modules SET name = ?, code = ? WHERE id = ?', [name, code, id]);
  return result;
};

export const deleteModule = async (id: number) => {
  const [result] = await pool.query('DELETE FROM si.modules WHERE id = ?', [id]);
  return result;
};

export const getAllZoneDistricts = async () => {
  const [rows] = await pool.query('SELECT * FROM si.zone_districts');
  return rows;
};

export const removeAllZonesFromDistrict = async (district_id: number) => {
  const [result] = await pool.query('DELETE FROM si.zone_districts WHERE district_id = ?', [district_id]);
  return result;
};

export const removeAllDistrictsFromZone = async (zone_id: number) => {
  const [result] = await pool.query('DELETE FROM si.zone_districts WHERE zone_id = ?', [zone_id]);
  return result;
};
