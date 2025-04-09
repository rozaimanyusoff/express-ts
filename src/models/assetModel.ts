import pool from "../utils/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// Define types for the database rows
interface Asset {
    id: number;
    old_ref: number;
    registered_id: string;
    registered_date: Date;
    finance_tag: string;
    asset_condition: number;
    type_id: number;
    cat_id: number;
    brand_id: number;
    model_id: number;
    model_id_old: number;
    purchase_ref: string;
    pricing: number;
    depreciation_rate: number;
    depreciation_length: number;
    warranty_term: number;
    status: number;
    disposal_date: Date;
    dept_id: number;
    cc_id: number;
    end_user: string;
}

interface AssetType {
    id: number;
    name: string;
    description: string;
}

interface Brand {
    id: number;
    name: string;
    type: string;
    status: string;
    model_count: number;
}

interface CategoryBrandAssociation {
    brand_id: number;
    category_ids: number[];
}

// Define the interface for categories
interface Category {
    id: number;
    name: string;
    old_ref: number;
    type: number;
    status: number;
}

// Define the interface for the category-brand table
interface CategoryBrand {
    category_id: number;
    brand_id: number;
}

// Define the interface for models
interface Model {
    id: number;
    model_id_old: number;
    brand_id: number;
    brand_id_old: number;
    name: string;
    type: number;
    category_id: number;
    description: string;
    image: string;
    status: number;
}

// Define the interface for departments
interface Department {
    id: number;
    old_ref: number;
    code: string;
    name: string;
    dept_desc_malay: string;
    status: number;
}

// Define the interface for section
interface Section {
    id: number;
    name: string;
    code: string;
    section_id: number;
    dept_id: number;
    createdAt: Date;
}

// Define the interface for unit
interface Unit {
    id: number;
    name: string;
    dept_id: number;
    unit: string;
    code: string;
    doc_init: string;
    wk_dept: string;
    sect_stat: number;
}

// Define the interface for cost centers
interface CostCenter {
    id: number;
    name: string;
    owner_type: string;
    owner_id: number;
    start_date: Date;
    end_date: Date;
    status: string;
    createAt: Date;
}

// Define the interface for districts
interface District {
    id: number;
    name: string;
    code: string;
    createdAt: Date;
}

//router.get('/', assetController.getAssets);
export const getAssets = async (): Promise<Asset[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.asset_data`
    );
    return rows as Asset[];
};

//router.get('/:id', assetController.getAssetsById);
export const getAssetsById = async (id: number): Promise<Asset[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.asset_data WHERE id = ?`,
        [id]
    );
    return rows as Asset[];
};

//router.get('/:serial/sn', assetController.getAssetsBySerial);
export const getAssetsBySerial = async (serial: string): Promise<Asset[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.asset_data WHERE registered_id LIKE ? LIMIT 5`,
        [`%${serial}%`]
    );
    return rows as Asset[];
};

export const getAssetByEndUser = async (endUser: string): Promise<Asset[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.asset_data WHERE end_user = ?`,
        [endUser]
    );
    return rows as Asset[];
};

//router.post('/', assetController.createAsset);
export const createAsset = async (asset: Omit<Asset, 'id'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO assets.asset_data (old_ref, registered_id, registered_date, finance_tag, asset_condition, type_id, cat_id, brand_id, model_id, model_id_old, purchase_ref, pricing, depreciation_rate, depreciation_length, warranty_term, status, disposal_date, dept_id, cc_id, end_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [asset.old_ref, asset.registered_id, asset.registered_date, asset.finance_tag, asset.asset_condition, asset.type_id, asset.cat_id, asset.brand_id, asset.model_id, asset.model_id_old, asset.purchase_ref, asset.pricing, asset.depreciation_rate, asset.depreciation_length, asset.warranty_term, asset.status, asset.disposal_date, asset.dept_id, asset.cc_id, asset.end_user]
    );
    return result;
};

//router.put('/:id', assetController.updateAsset);
export const updateAsset = async (id: number, asset: Omit<Asset, 'id'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE assets.asset_data SET old_ref = ?, registered_id = ?, registered_date = ?, finance_tag = ?, asset_condition = ?, type_id = ?, cat_id = ?, brand_id = ?, model_id = ?, model_id_old = ?, purchase_ref = ?, pricing = ?, depreciation_rate = ?, depreciation_length = ?, warranty_term = ?, status = ?, disposal_date = ?, dept_id = ?, cc_id = ?, end_user = ? WHERE id = ?`,
        [asset.old_ref, asset.registered_id, asset.registered_date, asset.finance_tag, asset.asset_condition, asset.type_id, asset.cat_id, asset.brand_id, asset.model_id, asset.model_id_old, asset.purchase_ref, asset.pricing, asset.depreciation_rate, asset.depreciation_length, asset.warranty_term, asset.status, asset.disposal_date, asset.dept_id, asset.cc_id, asset.end_user, id]
    );
    return result;
};

//router.delete('/:id', assetController.deleteAsset);
export const deleteAsset = async (id: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.asset_data WHERE id = ?`,
        [id]
    );
    return result;
};

//router.get('/:id/records', assetController.getAssetRecords);
export const getAssetRecords = async (assetId: number): Promise<RowDataPacket[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.com_asset_dt WHERE pc_id = ? ORDER BY cust_id DESC`,
        [assetId]
    );
    return rows;
};

//router.get('/type', assetController.getTypes);
export const getTypes = async (): Promise<AssetType[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.types`
    );
    return rows as AssetType[];
};

//router.get('/type/:id', assetController.getAssetTypeById);
export const getAssetTypeById = async (id: number): Promise<AssetType[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.types WHERE id = ?`,
        [id]
    );
    return rows as AssetType[];
};

//router.post('/type', assetController.createAssetType);
export const createAssetType = async (type: Omit<AssetType, 'id'>): Promise<ResultSetHeader> => {
    const [check] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.types WHERE name = ?`,
        [type.name]
    );
    if ((check as RowDataPacket[]).length) {
        throw new Error('Asset type already exists');
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO assets.types (name, description) VALUES (?, ?)`,
        [type.name, type.description]
    );
    return result;
};

//router.put('/type/:id', assetController.updateAssetType);
export const updateAssetType = async (id: number, type: Omit<AssetType, 'id'>): Promise<ResultSetHeader> => {
    const [check] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.types WHERE name = ?`,
        [type.name]
    );
    if ((check as RowDataPacket[]).length) {
        throw new Error('Asset type already exists');
    }
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE assets.types SET name = ?, description = ? WHERE id = ?`,
        [type.name, type.description, id]
    );
    return result;
};

//router.delete('/type/:id', assetController.deleteAssetType);
export const deleteAssetType = async (id: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.types WHERE id = ?`,
        [id]
    );

    await pool.query<ResultSetHeader>(
        `UPDATE assets.asset_data SET type = 0 WHERE type = ?`,
        [id]
    );
    return result;
};

//router.get('/brand', assetController.getBrands);
export const getBrands = async (): Promise<Brand[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT
        b.id,
        b.name,
        b.type,
        COUNT(DISTINCT m.id) AS model_count,
        b.status
        FROM assets.brands b
        LEFT JOIN assets.models m ON m.brand_id = b.id
        GROUP BY b.id, b.name, b.type, b.status
        ORDER BY b.type, b.name
    `);
    return rows as Brand[];
};

//router.get('/brand/:id', assetController.getBrandById);
export const getBrandById = async (id: number): Promise<Brand[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.brands WHERE id = ?`,
        [id]
    );
    return rows as Brand[];
};

//router.post('/brand', assetController.createBrand);
export const createBrand = async (brand: Omit<Brand, 'id' | 'model_count'>): Promise<ResultSetHeader> => {
    const [check] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.brands WHERE name = ?`,
        [brand.name]
    );
    if (check.length) {
        throw new Error('Brand already exists');
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO assets.brands (name, type, status) VALUES (?, ?, ?)`,
        [brand.name, brand.type, brand.status]
    );
    return result;
};

//router.put('/brand/:id', assetController.updateBrand);
export const updateBrand = async (id: number, brand: Omit<Brand, 'id' | 'model_count'>): Promise<ResultSetHeader> => {
    const [check] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.brands WHERE name = ?`,
        [brand.name]
    );
    if (check.length) {
        throw new Error('Brand already exists');
    }
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE assets.brands SET name = ?, type = ?, status = ? WHERE id = ?`,
        [brand.name, brand.type, brand.status, id]
    );
    return result;
};

//router.delete('/brand/:id', assetController.deleteBrand);
export const deleteBrand = async (id: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.brands WHERE id = ?`,
        [id]
    );

    await pool.query<ResultSetHeader>(
        `UPDATE assets.models SET brand_id = 0 WHERE brand_id = ?`,
        [id]
    );
    return result;
};

//router.get('/category-brand', assetController.getCategoryBrandAssociations);
export const getCategoryBrandAssociations = async (): Promise<CategoryBrandAssociation[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT brand_id, GROUP_CONCAT(category_id) AS category_ids FROM assets.category_brand GROUP BY brand_id`
    );
    return rows.map(row => ({
        brand_id: row.brand_id,
        category_ids: row.category_ids ? row.category_ids.split(',').map((id: string) => parseInt(id, 10)) : []
    }));
};

//router.get('/brand/:id/categories', assetController.getCategoriesForBrand);
export const getCategoriesForBrand = async (brandId: number): Promise<RowDataPacket[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT c.id, c.name
         FROM assets.category_brand cb
         JOIN assets.categories c ON cb.category_id = c.id
         WHERE cb.brand_id = ?`,
        [brandId]
    );
    return rows;
};

//router.post('/category-brand', assetController.addCategoriesToBrand);
export const addCategoriesToBrand = async (brandId: number, categoryIds: number[] = []): Promise<ResultSetHeader> => {
    if (!categoryIds.length) {
        return {} as ResultSetHeader;
    }
    const values = categoryIds.map(categoryId => `(${brandId}, ${categoryId})`).join(',');
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT IGNORE INTO assets.category_brand (brand_id, category_id) VALUES ${values}`
    );
    return result;
};

//router.post('/category-brand', assetController.addCategoryToBrand);
export const addCategoryToBrand = async (brandId: number, categoryId: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT IGNORE INTO assets.category_brand (brand_id, category_id) VALUES (?, ?)`,
        [brandId, categoryId]
    );
    return result;
};

//router.delete('/category-brand', assetController.removeCategoryFromBrand);
export const removeCategoryFromBrand = async (brandId: number, categoryId: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.category_brand WHERE brand_id = ? AND category_id = ?`,
        [brandId, categoryId]
    );
    return result;
};

//router.get('/category', assetController.getCategories);
export const getCategories = async (): Promise<Category[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.categories`
    );
    return rows as Category[];
};

//router.get('/category/:id', assetController.getCategoryById);
export const getCategoryById = async (id: number): Promise<Category[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.categories WHERE id = ?`,
        [id]
    );
    return rows as Category[];
};

//router.post('/category', assetController.createCategory);
export const createCategory = async (category: Omit<Category, 'id'>): Promise<ResultSetHeader> => {
    const [check] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.categories WHERE name = ? AND type = ?`,
        [category.name, category.type]
    );
    if (check.length) {
        throw new Error('Category already exists');
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO assets.categories (name, old_ref, type, status) VALUES (?, ?, ?, ?)`,
        [category.name, category.old_ref, category.type, category.status]
    );
    return result;
};

//router.put('/category/:id', assetController.updateCategory);
export const updateCategory = async (id: number, category: Omit<Category, 'id'>): Promise<ResultSetHeader> => {
    const [check] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.categories WHERE name = ? AND type = ?`,
        [category.name, category.type]
    );
    if (check.length) {
        throw new Error('Category already exists');
    }
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE assets.categories SET name = ?, old_ref = ?, type = ?, status = ? WHERE id = ?`,
        [category.name, category.old_ref, category.type, category.status, id]
    );
    return result;
};

//router.delete('/category/:id', assetController.deleteCategory);
export const deleteCategory = async (id: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.categories WHERE id = ?`,
        [id]
    );

    await pool.query<ResultSetHeader>(
        `UPDATE assets.models SET category_id = 0 WHERE category_id = ?`,
        [id]
    );
    return result;
};

export const getCategoryBrandMapping = async (categoryId: number): Promise<RowDataPacket[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT brand_id FROM assets.category_brand WHERE JSON_CONTAINS(category_ids, ?)`,
        [categoryId]
    );
    return rows;
};

//router.get('/model', assetController.getModels);
export const getModels = async (): Promise<Model[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.models`
    );
    return rows as Model[];
};

//router.get('/model/:id', assetController.getModelById);
export const getModelById = async (id: number): Promise<Model[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.models WHERE id = ?`,
        [id]
    );
    return rows as Model[];
};

//router.post('/model', assetController.createModel);
export const createModel = async (model: Omit<Model, 'id'>): Promise<ResultSetHeader> => {
    const [check] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.models WHERE name = ? AND brand_id = ?`,
        [model.name, model.brand_id]
    );
    if (check.length) {
        throw new Error('Model already exists');
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO assets.models (model_id_old, brand_id, brand_id_old, name, type, category_id, description, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [model.model_id_old, model.brand_id, model.brand_id_old, model.name, model.type, model.category_id, model.description, model.image, model.status]
    );
    return result;
};

//router.put('/model/:id', assetController.updateModel);
export const updateModel = async (id: number, model: Omit<Model, 'id'>): Promise<ResultSetHeader> => {
    const [check] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.models WHERE name = ? AND brand_id = ? AND id != ?`,
        [model.name, model.brand_id, id]
    );
    if (check.length) {
        throw new Error('Model already exists');
    }
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE assets.models SET model_id_old = ?, brand_id = ?, brand_id_old = ?, name = ?, type = ?, category_id = ?, description = ?, image = ?, status = ? WHERE id = ?`,
        [model.model_id_old, model.brand_id, model.brand_id_old, model.name, model.type, model.category_id, model.description, model.image, model.status, id]
    );
    return result;
};

//router.delete('/model/:id', assetController.deleteModel);
export const deleteModel = async (id: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.models WHERE id = ?`,
        [id]
    );
    return result;
};

// Get all departments
export const getDepartments = async (): Promise<Department[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.dept`
    );
    return rows as Department[];
};

// Get department by ID
export const getDepartmentById = async (id: number): Promise<Department[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.dept WHERE id = ?`,
        [id]
    );
    return rows as Department[];
};

// Create a new department
export const createDepartment = async (department: Omit<Department, 'id'>): Promise<ResultSetHeader> => {
    const [check] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.dept WHERE code = ?`,
        [department.code]
    );
    if (check.length) {
        throw new Error('Department code already exists');
    }
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO assets.dept (old_ref, code, name, dept_desc_malay, status) VALUES (?, ?, ?, ?, ?)`,
        [department.old_ref, department.code, department.name, department.dept_desc_malay, department.status]
    );
    return result;
};

// Update a department
export const updateDepartment = async (id: number, department: Omit<Department, 'id'>): Promise<ResultSetHeader> => {
    const [check] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.dept WHERE code = ? AND id != ?`,
        [department.code, id]
    );
    if (check.length) {
        throw new Error('Department code already exists');
    }
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE assets.dept SET old_ref = ?, code = ?, name = ?, dept_desc_malay = ?, status = ? WHERE id = ?`,
        [department.old_ref, department.code, department.name, department.dept_desc_malay, department.status, id]
    );
    return result;
};

// Delete a department
export const deleteDepartment = async (id: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.dept WHERE id = ?`,
        [id]
    );
    return result;
};

// Get all section
export const getSections = async (): Promise<Section[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.section`
    );
    return rows as Section[];
};

// Get section by ID
export const getSectionById = async (id: number): Promise<Section[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.section WHERE id = ?`,
        [id]
    );
    return rows as Section[];
};

// Create a new section
export const createSection = async (section: Omit<Section, 'id'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO assets.section (name, code, section_id, dept_id, createdAt) VALUES (?, ?, ?, ?, ?)`,
        [section.name, section.code, section.section_id, section.dept_id, section.createdAt]
    );
    return result;
};

// Update a section
export const updateSection = async (id: number, section: Omit<Section, 'id'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE assets.section SET name = ?, code = ?, section_id = ?, dept_id = ?, createdAt = ? WHERE id = ?`,
        [section.name, section.code, section.section_id, section.dept_id, section.createdAt, id]
    );
    return result;
};

// Delete a section
export const deleteSection = async (id: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.section WHERE id = ?`,
        [id]
    );
    return result;
};

// Get all unit
export const getUnits = async (): Promise<Unit[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.unit`
    );
    return rows as Unit[];
};

// Get unit by ID
export const getUnitById = async (id: number): Promise<Unit[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.unit WHERE id = ?`,
        [id]
    );
    return rows as Unit[];
};

// Create a new unit
export const createUnit = async (unit: Omit<Unit, 'id'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO assets.unit (name, dept_id, unit, code, doc_init, wk_dept, sect_stat) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [unit.name, unit.dept_id, unit.unit, unit.code, unit.doc_init, unit.wk_dept, unit.sect_stat]
    );
    return result;
};

// Update a unit
export const updateUnit = async (id: number, unit: Omit<Unit, 'id'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE assets.unit SET name = ?, dept_id = ?, unit = ?, code = ?, doc_init = ?, wk_dept = ?, sect_stat = ? WHERE id = ?`,
        [unit.name, unit.dept_id, unit.unit, unit.code, unit.doc_init, unit.wk_dept, unit.sect_stat, id]
    );
    return result;
};

// Delete a unit
export const deleteUnit = async (id: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.unit WHERE id = ?`,
        [id]
    );
    return result;
};

// Get all cost centers
export const getCostCenters = async (): Promise<CostCenter[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.costcenter`
    );
    return rows as CostCenter[];
};

// Get cost center by ID
export const getCostCenterById = async (id: number): Promise<CostCenter[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.costcenter WHERE id = ?`,
        [id]
    );
    return rows as CostCenter[];
};

// Create a new cost center
export const createCostCenter = async (costCenter: Omit<CostCenter, 'id'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO assets.costcenter (name, owner_type, owner_id, start_date, end_date, status, createAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [costCenter.name, costCenter.owner_type, costCenter.owner_id, costCenter.start_date, costCenter.end_date, costCenter.status, costCenter.createAt]
    );
    return result;
};

// Update a cost center
export const updateCostCenter = async (id: number, costCenter: Omit<CostCenter, 'id'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE assets.costcenter SET name = ?, owner_type = ?, owner_id = ?, start_date = ?, end_date = ?, status = ?, createAt = ? WHERE id = ?`,
        [costCenter.name, costCenter.owner_type, costCenter.owner_id, costCenter.start_date, costCenter.end_date, costCenter.status, costCenter.createAt, id]
    );
    return result;
};

// Delete a cost center
export const deleteCostCenter = async (id: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.costcenter WHERE id = ?`,
        [id]
    );
    return result;
};

// Get all districts
export const getDistricts = async (): Promise<District[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.districts`
    );
    return rows as District[];
};

// Get district by ID
export const getDistrictById = async (id: number): Promise<District[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM assets.districts WHERE id = ?`,
        [id]
    );
    return rows as District[];
};

// Create a new district
export const createDistrict = async (district: Omit<District, 'id'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO assets.districts (name, code, createdAt) VALUES (?, ?, ?)`,
        [district.name, district.code, district.createdAt]
    );
    return result;
};

// Update a district
export const updateDistrict = async (id: number, district: Omit<District, 'id'>): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `UPDATE assets.districts SET name = ?, code = ?, createdAt = ? WHERE id = ?`,
        [district.name, district.code, district.createdAt, id]
    );
    return result;
};

// Delete a district
export const deleteDistrict = async (id: number): Promise<ResultSetHeader> => {
    const [result] = await pool.query<ResultSetHeader>(
        `DELETE FROM assets.districts WHERE id = ?`,
        [id]
    );
    return result;
};