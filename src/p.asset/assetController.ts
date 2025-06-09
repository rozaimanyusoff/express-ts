import { Request, Response } from 'express';
import * as assetModel from './assetModel';
import path from 'path';

// TYPES
export const getTypes = async (req: Request, res: Response) => {
  const rows = await assetModel.getTypes();
  res.json({
    status: 'success',
    message: 'Asset type retrieved successfully',
    data: rows
  });
};
export const getTypeById = async (req: Request, res: Response) => {
  const row = await assetModel.getTypeById(Number(req.params.id));
  res.json(row);
};
export const createType = async (req: Request, res: Response) => {
  try {
    const { code, name, description, image } = req.body;
    const result = await assetModel.createType({ code, name, description, image });
    // Ensure correct type for insertId
    const typeId = (result as import('mysql2').ResultSetHeader).insertId;
    // Fetch the created type to return with full image URL
    const type = await assetModel.getTypeById(typeId);
    if (type && type.image) {
      type.image = `${req.protocol}://${req.get('host')}/uploads/types/${type.image}`;
    }
    res.status(201).json({ status: 'success', message: 'Type created', data: type });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', message, data: null });
  }
};
export const updateType = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { code, name, description, image } = req.body;
    await assetModel.updateType(id, { code, name, description, image });
    // Fetch the updated type to return with full image URL
    const type = await assetModel.getTypeById(id);
    if (type && type.image) {
      type.image = `${req.protocol}://${req.get('host')}/uploads/types/${type.image}`;
    }
    res.json({ status: 'success', message: 'Type updated', data: type });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', message, data: null });
  }
};
export const deleteType = async (req: Request, res: Response) => {
  const result = await assetModel.deleteType(Number(req.params.id));
  res.json(result);
};

// CATEGORIES
export const getCategories = async (req: Request, res: Response) => {
  const rows = await assetModel.getCategories();
  const brands = await assetModel.getBrands();
  // Build brand map
  const brandMap = new Map<string, { id: number; name: string; code: string }>();
  for (const b of brands as any[]) {
    brandMap.set(b.code, { id: b.id, name: b.name, code: b.code });
  }
  // Get brand-category associations
  const { categoryToBrands } = await getAllBrandCategoryAssociations();
  // Map categories to include all fields plus brands[]
  const data = (rows as any[]).map((cat) => {
    let brandsForCategory: any[] = [];
    if (cat.code && categoryToBrands[cat.code]) {
      brandsForCategory = categoryToBrands[cat.code]
        .map((brandCode: string) => brandMap.get(brandCode))
        .filter(Boolean);
    }
    return {
      ...cat,
      brands: brandsForCategory
    };
  });
  res.json({
    status: 'success',
    message: 'Categories data retrieved successfully',
    data
  });
};
export const getCategoryById = async (req: Request, res: Response) => {
  const row = await assetModel.getCategoryById(Number(req.params.id));
  res.json(row);
};
export const createCategory = async (req: Request, res: Response) => {
  // Accept frontend payload with typeId, map to type_id for DB
  const { name, description, typeId, image } = req.body;
  const result = await assetModel.createCategory({
    name,
    description,
    image,
    type_id: typeId
  });
  res.json({
    status: 'success',
    message: 'Category created successfully',
    result
  });
};
export const updateCategory = async (req: Request, res: Response) => {
  const result = await assetModel.updateCategory(Number(req.params.id), req.body);
  res.json(result);
};
export const deleteCategory = async (req: Request, res: Response) => {
  const result = await assetModel.deleteCategory(Number(req.params.id));
  res.json(result);
};

// BRANDS
// Helper: get all brand-category associations from join table
async function getAllBrandCategoryAssociations() {
  // Get all brands and categories
  const brands = await assetModel.getBrands();
  const categories = await assetModel.getCategories();
  // Build brand->categories map
  const brandToCategories: Record<string, string[]> = {};
  for (const b of brands as any[]) {
    const cats = await assetModel.getCategoriesByBrand(b.code);
    const catArr = Array.isArray(cats) ? cats : [];
    brandToCategories[b.code] = catArr.map((c: any) => c.category_code);
  }
  // Build category->brands map
  const categoryToBrands: Record<string, string[]> = {};
  for (const c of categories as any[]) {
    const brs = await assetModel.getBrandsByCategory(c.code);
    const brArr = Array.isArray(brs) ? brs : [];
    categoryToBrands[c.code] = brArr.map((b: any) => b.brand_code);
  }
  return { brandToCategories, categoryToBrands };
}

export const getBrands = async (req: Request, res: Response) => {
  // Fetch all brands and categories
  const brands = await assetModel.getBrands();
  const categories = await assetModel.getCategories();

  // Build category map by code
  const categoryMap = new Map<string, { id: number; name: string; code: string }>();
  for (const c of categories as any[]) {
    categoryMap.set(c.code, { id: c.id, name: c.name, code: c.code });
  }

  // Get brand-category associations
  const { brandToCategories } = await getAllBrandCategoryAssociations();

  // Map brands to include only required fields and categories[]
  const data = (brands as any[]).map((brand) => {
    let categoriesForBrand: any[] = [];
    if (brand.code && brandToCategories[brand.code]) {
      categoriesForBrand = brandToCategories[brand.code]
        .map((catCode: string) => categoryMap.get(catCode))
        .filter(Boolean);
    }
    return {
      id: brand.id,
      name: brand.name,
      code: brand.code,
      image: brand.image
        ? (brand.image.startsWith('http')
            ? brand.image
            : `${req.protocol}://${req.get('host')}/uploads/brands/${brand.image}`)
        : null,
      categories: categoriesForBrand
    };
  });

  res.json({
    status: 'success',
    message: 'Brands data retrieved successfully',
    data
  });
};
export const getBrandById = async (req: Request, res: Response) => {
  const row = await assetModel.getBrandById(Number(req.params.id));
  res.json(row);
};
export const createBrand = async (req: Request, res: Response) => {
  // Accept frontend payload as-is (type_id, category_id)
  const result = await assetModel.createBrand(req.body);
  res.json({
    status: 'success',
    message: 'Brand created successfully',
    result
  });
};
export const updateBrand = async (req: Request, res: Response) => {
  // Accept frontend payload as-is (type_id, category_id)
  const result = await assetModel.updateBrand(Number(req.params.id), req.body);
  res.json({
    status: 'success',
    message: 'Brand updated successfully',
    result
  });
};
export const deleteBrand = async (req: Request, res: Response) => {
  const result = await assetModel.deleteBrand(Number(req.params.id));
  res.json(result);
};

// MODELS
export const getModels = async (req: Request, res: Response) => {
  // Fetch all models, brands, and categories
  const models = await assetModel.getModels();
  const brands = await assetModel.getBrands();
  const categories = await assetModel.getCategories();

  // Build lookup maps for brand and category
  const brandMap = new Map<number, { id: number; name: string }>();
  for (const b of brands as any[]) {
    brandMap.set(b.id, { id: b.id, name: b.name });
  }
  const categoryMap = new Map<number, { id: number; name: string }>();
  for (const c of categories as any[]) {
    categoryMap.set(c.id, { id: c.id, name: c.name });
  }

  // Map models to include all fields plus brand and category objects
  const data = (models as any[]).map((model) => ({
    ...model,
    brand: brandMap.get(model.brand_id) || null,
    category: categoryMap.get(model.category_id) || null
  }));

  res.json({
    status: 'success',
    message: 'Models data retrieved successfully',
    data
  });
};
export const getModelById = async (req: Request, res: Response) => {
  const row = await assetModel.getModelById(Number(req.params.id));
  res.json(row);
};
export const createModel = async (req: Request, res: Response) => {
  const {
    name,
    type_code,
    category_code,
    brand_code,
    model_code,
    specification,
    generation,
    status,
    description
  } = req.body;

  // Handle image upload
  let image = req.body.image;
  if (req.file) {
    image = req.file.filename;
  }

  // Pass codes directly to model layer (no ID lookups)
  const result = await assetModel.createModel({
    name,
    description,
    image,
    brand_code,
    category_code,
    type_code,
    model_code,
    specification,
    generation,
    status
  });
  // Fetch the created model to return with full image URL
  const modelId = (result as import('mysql2').ResultSetHeader).insertId;
  const model = await assetModel.getModelById(modelId);
  if (model && model.image) {
    model.image = `${req.protocol}://${req.get('host')}/uploads/models/${model.image}`;
  }
  res.status(201).json({ status: 'success', message: 'Model created successfully', data: model });
};

export const updateModel = async (req: Request, res: Response) => {
  const {
    name,
    model_code,
    specification,
    generation,
    status,
    description,
    type_code,
    category_code,
    brand_code
  } = req.body;

  // Handle image upload
  let image = req.body.image;
  if (req.file) {
    image = req.file.filename;
  }

  // Pass codes directly to model layer (no ID lookups)
  const updatePayload: any = {
    name,
    model_code,
    specification,
    generation,
    status,
    description,
    type_code,
    category_code,
    brand_code,
    image
  };
  await assetModel.updateModel(Number(req.params.id), updatePayload);
  // Fetch the updated model to return with full image URL
  const model = await assetModel.getModelById(Number(req.params.id));
  if (model && model.image) {
    model.image = `${req.protocol}://${req.get('host')}/uploads/models/${model.image}`;
  }
  res.json({ status: 'success', message: 'Model updated successfully', data: model });
};
export const deleteModel = async (req: Request, res: Response) => {
  const result = await assetModel.deleteModel(Number(req.params.id));
  res.json(result);
};

// ASSETS
export const getAssets = async (req: Request, res: Response) => {
  // Fetch all assets and related data
  const assetsRaw = await assetModel.getAssets();
  const ownershipsRaw = await assetModel.getAssetOwnerships();
  const employeesRaw = await assetModel.getEmployees();
  const typesRaw = await assetModel.getTypes();
  const categoriesRaw = await assetModel.getCategories();
  const brandsRaw = await assetModel.getBrands();
  const modelsRaw = await assetModel.getModels();
  const departmentsRaw = await assetModel.getDepartments();
  const costcentersRaw = await assetModel.getCostcenters();
  const districtsRaw = await assetModel.getDistricts();

  const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
  // Only keep objects with pc_id, ramco_id, effective_date
  const ownerships = Array.isArray(ownershipsRaw) ? ownershipsRaw.filter((o: any) => o && typeof o === 'object' && !Array.isArray(o) && Object.prototype.hasOwnProperty.call(o, 'pc_id') && Object.prototype.hasOwnProperty.call(o, 'ramco_id') && Object.prototype.hasOwnProperty.call(o, 'effective_date')) : [];
  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
  const models = Array.isArray(modelsRaw) ? modelsRaw : [];
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
  const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];

  // Build lookup maps (keyed by both code and id)
  const assetTypeMap = new Map<any, any>(
    types.flatMap((t: any) => [[t.code, t], [t.id, t]])
  );
  const assetCategoryMap = new Map<any, any>(
    categories.flatMap((c: any) => [[c.code, c], [c.id, c]])
  );
  const assetBrandMap = new Map<any, any>(
    brands.flatMap((b: any) => [[b.code, b], [b.id, b]])
  );
  const assetModelMap = new Map<any, any>(
    models.flatMap((m: any) => [[m.code, m], [m.id, m], [m.model_code, m]])
  );
  const assetDepartmentMap = new Map<any, any>(departments.map((d: any) => [d.id, d]));
  const assetCostcenterMap = new Map<any, any>(costcenters.map((c: any) => [c.id, c]));
  const assetDistrictMap = new Map<any, any>(districts.map((d: any) => [d.id, d]));
  const employeeMap = new Map<any, any>(employees.map((e: any) => [e.ramco_id, e]));

  // Group ownerships by asset (pc_id)
  const ownershipsByAsset: Record<number, any[]> = {};
  for (const o of ownerships) {
    const own = o as { pc_id: number, ramco_id: string, effective_date: string };
    if (!ownershipsByAsset[own.pc_id]) ownershipsByAsset[own.pc_id] = [];
    const emp = employeeMap.get(own.ramco_id);
    if (emp) {
      ownershipsByAsset[own.pc_id].push({
        id: emp.id,
        ramco_id: emp.ramco_id,
        name: emp.full_name,
        district: emp.district_id ? (assetDistrictMap.get(emp.district_id)?.code || null) : null,
        department: emp.department_id ? (assetDepartmentMap.get(emp.department_id)?.code || null) : null,
        cost_center: emp.costcenter_id ? (assetCostcenterMap.get(emp.costcenter_id)?.name || null) : null,
        effective_date: own.effective_date
      });
    }
  }

  // Attach nested objects and owners to each asset
  const data = assets.map((asset: any) => {
    // Try both code and id for each field
    const typeObj = assetTypeMap.get(asset.type_id) || assetTypeMap.get(asset.type_code);
    const categoryObj = assetCategoryMap.get(asset.category_id) || assetCategoryMap.get(asset.category_code);
    const brandObj = assetBrandMap.get(asset.brand_id) || assetBrandMap.get(asset.brand_code);
    const modelObj = assetModelMap.get(asset.model_id) || assetModelMap.get(asset.model_code);
    return {
      id: asset.id,
      item_code: asset.item_code,
      finance_tag: asset.finance_tag,
      serial_number: asset.serial_number,
      pc_hostname: asset.pc_hostname,
      dop: asset.dop,
      year: asset.year,
      unit_price: asset.unit_price,
      depreciation_length: asset.depreciation_length,
      depreciation_rate: asset.depreciation_rate,
      cost_center: asset.cost_center,
      types: typeObj ? { type_code: (typeObj as any).code, name: (typeObj as any).name } : null,
      categories: categoryObj ? { category_code: (categoryObj as any).code, name: (categoryObj as any).name } : null,
      brands: brandObj ? { brand_code: (brandObj as any).code, name: (brandObj as any).name } : null,
      models: modelObj ? { model_code: (modelObj as any).code, name: (modelObj as any).name } : null,
      asses: asset.asses,
      comment: asset.comment,
      classification: asset.classification,
      owner: ownershipsByAsset[asset.id] || []
    };
  });

  res.json({
    status: 'success',
    message: 'Assets data retrieved successfully',
    data
  });
};

export const getAssetById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const assets = Array.isArray(await assetModel.getAssets()) ? await assetModel.getAssets() as any[] : [];
  const ownerships = Array.isArray(await assetModel.getAssetOwnerships()) ? await assetModel.getAssetOwnerships() as any[] : [];
  const employees = Array.isArray(await assetModel.getEmployees()) ? await assetModel.getEmployees() as any[] : [];
  const types = Array.isArray(await assetModel.getTypes()) ? await assetModel.getTypes() as any[] : [];
  const categories = Array.isArray(await assetModel.getCategories()) ? await assetModel.getCategories() as any[] : [];
  const brands = Array.isArray(await assetModel.getBrands()) ? await assetModel.getBrands() as any[] : [];
  const models = Array.isArray(await assetModel.getModels()) ? await assetModel.getModels() as any[] : [];
  const departments = Array.isArray(await assetModel.getDepartments()) ? await assetModel.getDepartments() as any[] : [];
  const costcenters = Array.isArray(await assetModel.getCostcenters()) ? await assetModel.getCostcenters() as any[] : [];
  const districts = Array.isArray(await assetModel.getDistricts()) ? await assetModel.getDistricts() as any[] : [];
  const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
  // Add districtMap, departmentMap, and costcenterMap for lookup
  const districtMap = new Map(districts.map((d: any) => [d.id, d]));
  const departmentMap = new Map(departments.map((d: any) => [d.id, d]));
  const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
  const ownershipsByAsset: Record<number, any[]> = {};
  for (const o of ownerships) {
    const own = o as { pc_id: number, ramco_id: string, effective_date: string };
    if (!ownershipsByAsset[own.pc_id]) ownershipsByAsset[own.pc_id] = [];
    const emp = employeeMap.get(own.ramco_id);
    if (emp) {
      ownershipsByAsset[own.pc_id].push({
        id: emp.id,
        ramco_id: emp.ramco_id,
        name: emp.full_name,
        district: emp.district_id ? (districtMap.get(emp.district_id)?.name || null) : null,
        department: emp.department_id ? (departmentMap.get(emp.department_id)?.name || null) : null,
        cost_center: emp.costcenter_id ? (costcenterMap.get(emp.costcenter_id)?.name || null) : null,
        effective_date: own.effective_date
      });
    }
  }
  const assetTypeMap = new Map<any, any>(
    types.flatMap((t: any) => [[t.code, t], [t.id, t]])
  );
  const assetCategoryMap = new Map<any, any>(
    categories.flatMap((c: any) => [[c.code, c], [c.id, c]])
  );
  const assetBrandMap = new Map<any, any>(
    brands.flatMap((b: any) => [[b.code, b], [b.id, b]])
  );
  const assetModelMap = new Map<any, any>(
    models.flatMap((m: any) => [[m.code, m], [m.id, m], [m.model_code, m]])
  );

  const asset = assets.find((a: any) => a.id === id);
  if (!asset) return res.status(404).json({ status: 'error', message: 'Asset not found' });
  // Attach nested objects and owners to the asset
  const typeObj = assetTypeMap.get(asset.type_id) || assetTypeMap.get(asset.type_code);
  const categoryObj = assetCategoryMap.get(asset.category_id) || assetCategoryMap.get(asset.category_code);
  const brandObj = assetBrandMap.get(asset.brand_id) || assetBrandMap.get(asset.brand_code);
  const modelObj = assetModelMap.get(asset.model_id) || assetModelMap.get(asset.model_code);
  // Fetch specs and installed_software for this asset
  let specs: any[] = [];
  const specsRaw = await assetModel.getSpecsForAsset(asset.id);
  if (Array.isArray(specsRaw)) {
    specs = await Promise.all(specsRaw.map(async (spec: any) => {
      const installed_software = await assetModel.getInstalledSoftwareForAsset(asset.id);
      return {
        id: spec.id,
        effective_date: spec.effective_date || null, // If you have this field
        cpu: spec.cpu,
        cpu_generation: spec.cpu_generation,
        memory_size: spec.memory_size,
        storage_size: spec.storage_size,
        os: spec.os,
        screen_size: spec.screen_size || null, // If you have this field
        installed_software: Array.isArray(installed_software) ? installed_software.map((sw: any) => ({
          id: sw.software_id,
          name: sw.name,
          installed_at: sw.installed_at
        })) : []
      };
    }));
  }
  const assetWithNested = {
    id: asset.id,
    item_code: asset.item_code,
    finance_tag: asset.finance_tag,
    serial_number: asset.serial_number,
    pc_hostname: asset.pc_hostname,
    dop: asset.dop,
    year: asset.year,
    unit_price: asset.unit_price,
    depreciation_length: asset.depreciation_length,
    depreciation_rate: asset.depreciation_rate,
    cost_center: asset.cost_center,
    types: typeObj ? { type_code: (typeObj as any).code, name: (typeObj as any).name } : null,
    categories: categoryObj ? { category_code: (categoryObj as any).code, name: (categoryObj as any).name } : null,
    brands: brandObj ? { brand_code: (brandObj as any).code, name: (brandObj as any).name } : null,
    models: modelObj ? { model_code: (modelObj as any).code, name: (modelObj as any).name } : null,
    asses: asset.asses,
    comment: asset.comment,
    classification: asset.classification,
    specs,
    owner: (ownershipsByAsset[asset.id] || []).map((o: any) => {
      const emp = employeeMap.get(o.ramco_id);
      return {
        id: o.id,
        ramco_id: o.ramco_id,
        name: o.name,
        district: emp && emp.district_id ? (districtMap.get(emp.district_id)?.name || null) : null,
        department: emp && emp.department_id ? (departmentMap.get(emp.department_id)?.name || null) : null,
        cost_center: emp && emp.costcenter_id ? (costcenterMap.get(emp.costcenter_id)?.name || null) : null,
        effective_date: o.effective_date
      };
    })
  };
  res.json({
    status: 'success',
    message: 'Asset data retrieved successfully',
    data: assetWithNested
  });
};

export const createAsset = async (req: Request, res: Response) => {
  const result = await assetModel.createAsset(req.body);
  res.status(201).json({
    status: 'success',
    message: 'Asset created successfully',
    result
  });
};

export const updateAsset = async (req: Request, res: Response) => {
  const result = await assetModel.updateAsset(Number(req.params.id), req.body);
  res.json({
    status: 'success',
    message: 'Asset updated successfully',
    result
  });
};

export const deleteAsset = async (req: Request, res: Response) => {
  const result = await assetModel.deleteAsset(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Asset deleted successfully',
    result
  });
};

// DEPARTMENTS
export const getDepartments = async (req: Request, res: Response) => {
  const rows = await assetModel.getDepartments();
  res.json({
    status: 'success',
    message: 'Departments data retrieved successfully',
    data: rows
  });
};
export const getDepartmentById = async (req: Request, res: Response) => {
  const row = await assetModel.getDepartmentById(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Department data retrieved successfully',
    data: row
  });
};
export const createDepartment = async (req: Request, res: Response) => {
  const result = await assetModel.createDepartment(req.body);
  res.json({
    status: 'success',
    message: 'Department created successfully',
    result
  });
};
export const updateDepartment = async (req: Request, res: Response) => {
  const result = await assetModel.updateDepartment(Number(req.params.id), req.body);
  res.json({
    status: 'success',
    message: 'Department updated successfully',
    result
  });
};
export const deleteDepartment = async (req: Request, res: Response) => {
  const result = await assetModel.deleteDepartment(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Department deleted successfully',
    result
  });
};

// POSITIONS
export const getPositions = async (req: Request, res: Response) => {
  const rows = await assetModel.getPositions();
  res.json({
    status: 'success',
    message: 'Positions data retrieved successfully',
    data: rows
  });
};
export const getPositionById = async (req: Request, res: Response) => {
  const row = await assetModel.getPositionById(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Position data retrieved successfully',
    data: row
  });
};
export const createPosition = async (req: Request, res: Response) => {
  const result = await assetModel.createPosition(req.body);
  res.json({
    status: 'success',
    message: 'Position created successfully',
    result
  });
};
export const updatePosition = async (req: Request, res: Response) => {
  const result = await assetModel.updatePosition(Number(req.params.id), req.body);
  res.json({
    status: 'success',
    message: 'Position updated successfully',
    result
  });
};
export const deletePosition = async (req: Request, res: Response) => {
  const result = await assetModel.deletePosition(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Position deleted successfully',
    result
  });
};

// SECTIONS
export const getSections = async (req: Request, res: Response) => {
  const sections = await assetModel.getSections();
  const departments = await assetModel.getDepartments();
  const departmentMap = new Map<number, { id: number; name: string }>();
  for (const d of departments as any[]) {
    departmentMap.set(d.id, { id: d.id, name: d.name });
  }
  const data = (sections as any[]).map((section) => ({
    id: section.id,
    name: section.name,
    department: section.department_id ? departmentMap.get(section.department_id) || null : null
  }));
  res.json({
    status: 'success',
    message: 'Sections data retrieved successfully',
    data
  });
};

export const getSectionById = async (req: Request, res: Response) => {
  const section = await assetModel.getSectionById(Number(req.params.id));
  if (!section) {
    return res.status(404).json({ status: 'error', message: 'Section not found' });
  }
  let department = null;
  if (section.department_id) {
    const dep = await assetModel.getDepartmentById(section.department_id);
    if (dep) department = { id: dep.id, name: dep.name };
  }
  res.json({
    status: 'success',
    message: 'Section data retrieved successfully',
    data: {
      id: section.id,
      name: section.name,
      department
    }
  });
};

export const createSection = async (req: Request, res: Response) => {
  // Accept frontend payload with departmentId, map to department_id
  const { name, departmentId } = req.body;
  const result = await assetModel.createSection({
    name,
    department_id: departmentId
  });
  res.json({
    status: 'success',
    message: 'Section created successfully',
    result
  });
};
export const updateSection = async (req: Request, res: Response) => {
  // Accept frontend payload with departmentId, map to department_id
  const { name, departmentId } = req.body;
  const result = await assetModel.updateSection(Number(req.params.id), {
    name,
    department_id: departmentId
  });
  res.json({
    status: 'success',
    message: 'Section updated successfully',
    result
  });
};
export const deleteSection = async (req: Request, res: Response) => {
  const result = await assetModel.deleteSection(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Section deleted successfully',
    result
  });
};

// COSTCENTERS
export const getCostcenters = async (req: Request, res: Response) => {
  const rows = await assetModel.getCostcenters();
  res.json({
    status: 'success',
    message: 'Costcenters data retrieved successfully',
    data: rows
  });
};
export const getCostcenterById = async (req: Request, res: Response) => {
  const row = await assetModel.getCostcenterById(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Costcenter data retrieved successfully',
    data: row
  });
};
export const createCostcenter = async (req: Request, res: Response) => {
  const result = await assetModel.createCostcenter(req.body);
  res.json({
    status: 'success',
    message: 'Costcenter created successfully',
    result
  });
};
export const updateCostcenter = async (req: Request, res: Response) => {
  const result = await assetModel.updateCostcenter(Number(req.params.id), req.body);
  res.json({
    status: 'success',
    message: 'Costcenter updated successfully',
    result
  });
};
export const deleteCostcenter = async (req: Request, res: Response) => {
  const result = await assetModel.deleteCostcenter(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Costcenter deleted successfully',
    result
  });
};

// EMPLOYEES
export const getEmployees = async (req: Request, res: Response) => {
  const employees = await assetModel.getEmployees();
  const departments = await assetModel.getDepartments();
  const positions = await assetModel.getPositions();
  const costcenters = await assetModel.getCostcenters();
  const districts = await assetModel.getDistricts();

  // Build lookup maps
  const departmentMap = new Map<number, { id: number; name: string, code: string }>();
  for (const d of departments as any[]) {
    departmentMap.set(d.id, { id: d.id, name: d.name, code: d.code });
  }
  const positionMap = new Map<number, { id: number; name: string }>();
  for (const p of positions as any[]) {
    positionMap.set(p.id, { id: p.id, name: p.name });
  }
  const costcenterMap = new Map<number, { id: number; name: string }>();
  for (const c of costcenters as any[]) {
    costcenterMap.set(c.id, { id: c.id, name: c.name });
  }
  const districtMap = new Map<number, { id: number; name: string, code: string }>();
  for (const l of districts as any[]) {
    districtMap.set(l.id, { id: l.id, name: l.name, code: l.code });
  }

  const data = (employees as any[]).map(emp => ({
    id: emp.id,
    ramco_id: emp.ramco_id,
    full_name: emp.full_name,
    email: emp.email,
    contact: emp.contact,
    gender: emp.gender,
    dob: emp.dob,
    avatar: emp.avatar
      ? (emp.avatar.startsWith('http')
          ? emp.avatar
          : `${req.protocol}://${req.get('host')}/uploads/employees/${emp.avatar}`)
      : null,
    hire_date: emp.hire_date,
    resignation_date: emp.resignation_date,
    employment_type: emp.employment_type,
    employment_status: emp.employment_status,
    grade: emp.grade,
    position: emp.position_id ? positionMap.get(emp.position_id) || null : null,
    department: emp.department_id ? departmentMap.get(emp.department_id) || null : null,
    costcenter: emp.costcenter_id ? costcenterMap.get(emp.costcenter_id) || null : null,
    district: emp.district_id ? districtMap.get(emp.district_id) || null : null
  }));

  res.json({
    status: 'success',
    message: 'Employees data retrieved successfully',
    data
  });
};

export const getEmployeeById = async (req: Request, res: Response) => {
  const emp = await assetModel.getEmployeeById(Number(req.params.id));
  if (!emp) {
    return res.status(404).json({ status: 'error', message: 'Employee not found' });
  }
  const department = emp.department_id ? await assetModel.getDepartmentById(emp.department_id) : null;
  const position = emp.position_id ? await assetModel.getPositionById(emp.position_id) : null;
  const costcenter = emp.costcenter_id ? await assetModel.getCostcenterById(emp.costcenter_id) : null;
  const district = emp.district_id ? await assetModel.getDistrictById(emp.district_id) : null;

  res.json({
    status: 'success',
    message: 'Employee data retrieved successfully',
    data: {
      id: emp.id,
      ramco_id: emp.ramco_id,
      full_name: emp.full_name,
      email: emp.email,
      contact: emp.contact,
      gender: emp.gender,
      dob: emp.dob,
      avatar: emp.avatar
        ? (emp.avatar.startsWith('http')
            ? emp.avatar
            : `${req.protocol}://${req.get('host')}/uploads/employees/${emp.avatar}`)
        : null,
      hire_date: emp.hire_date,
      resignation_date: emp.resignation_date,
      employment_type: emp.employment_type,
      employment_status: emp.employment_status,
      grade: emp.grade,
      position,
      department,
      costcenter,
      district
    }
  });
};

export const createEmployee = async (req: Request, res: Response) => {
  const {
    ramco_id,
    full_name,
    email,
    contact,
    gender,
    dob,
    avatar,
    hire_date,
    resignation_date,
    employment_type,
    employment_status,
    grade,
    position_id,
    department_id,
    costcenter_id,
    district_id
  } = req.body;
  const result = await assetModel.createEmployee({
    ramco_id,
    full_name,
    email,
    contact,
    gender,
    dob,
    avatar,
    hire_date,
    resignation_date,
    employment_type,
    employment_status,
    grade,
    position_id,
    department_id,
    costcenter_id,
    district_id
  });
  res.json({
    status: 'success',
    message: 'Employee created successfully',
    result
  });
};

export const updateEmployee = async (req: Request, res: Response) => {
  const {
    ramco_id,
    full_name,
    email,
    contact,
    gender,
    dob,
    avatar,
    hire_date,
    resignation_date,
    employment_type,
    employment_status,
    grade,
    position_id,
    department_id,
    costcenter_id,
    district_id
  } = req.body;
  const result = await assetModel.updateEmployee(Number(req.params.id), {
    ramco_id,
    full_name,
    email,
    contact,
    gender,
    dob,
    avatar,
    hire_date,
    resignation_date,
    employment_type,
    employment_status,
    grade,
    position_id,
    department_id,
    costcenter_id,
    district_id
  });
  res.json({
    status: 'success',
    message: 'Employee updated successfully',
    result
  });
};

export const deleteEmployee = async (req: Request, res: Response) => {
  const result = await assetModel.deleteUser(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Employee deleted successfully',
    result
  });
};

// DISTRICTS
export const getDistricts = async (req: Request, res: Response) => {
  const districts = await assetModel.getDistricts();
  const zoneDistricts = await assetModel.getAllZoneDistricts();
  const zones = await assetModel.getZones();
  // Build zone map with code
  const zoneMap = new Map<number, { id: number; name: string; code: string }>();
  for (const z of zones as any[]) {
    zoneMap.set(z.id, { id: z.id, name: z.name, code: z.code });
  }
  const districtToZone = new Map<number, number>();
  for (const zd of zoneDistricts as any[]) {
    districtToZone.set(zd.district_id, zd.zone_id);
  }
  const data = (districts as any[]).map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    zone: zoneMap.get(districtToZone.get(d.id)!) || null
  }));
  res.json({ status: 'success', message: 'Districts data retrieved successfully', data });
};

export const getDistrictById = async (req: Request, res: Response) => {
  const row = await assetModel.getDistrictById(Number(req.params.id));
  res.json({ status: 'success', message: 'District data retrieved successfully', data: row });
};
export const createDistrict = async (req: Request, res: Response) => {
  const { name, code, zone_id } = req.body;
  // Create the district
  const result = await assetModel.createDistrict({ name, code });
  // Get the new district's id
  const districtId = (result as any).insertId;
  // If zone_id is provided, create the join
  if (zone_id) {
    await assetModel.addDistrictToZone(zone_id, districtId);
  }
  res.json({ status: 'success', message: 'District created successfully', result });
};
export const updateDistrict = async (req: Request, res: Response) => {
  const { name, code, zone_id } = req.body;
  const districtId = Number(req.params.id);
  // Update the district
  const result = await assetModel.updateDistrict(districtId, { name, code });
  // Remove all previous zone links for this district
  await assetModel.removeAllZonesFromDistrict(districtId);
  // Add new zone link if provided
  if (zone_id) {
    await assetModel.addDistrictToZone(zone_id, districtId);
  }
  res.json({ status: 'success', message: 'District updated successfully', result });
};
export const deleteDistrict = async (req: Request, res: Response) => {
  const districtId = Number(req.params.id);
  // Remove all zone links for this district
  await assetModel.removeAllZonesFromDistrict(districtId);
  // Delete the district
  const result = await assetModel.deleteDistrict(districtId);
  res.json({ status: 'success', message: 'District deleted successfully', result });
};

// ZONES
export const getZones = async (req: Request, res: Response) => {
  const zones = await assetModel.getZones();
  const zoneDistricts = await assetModel.getAllZoneDistricts();
  const districts = await assetModel.getDistricts();
  const employees = await assetModel.getEmployees();
  // Build district map with code
  const districtMap = new Map<number, { id: number; name: string; code: string }>();
  for (const d of districts as any[]) {
    districtMap.set(d.id, { id: d.id, name: d.name, code: d.code });
  }
  const employeeMap = new Map<number, { id: number; name: string }>();
  for (const e of employees as any[]) {
    employeeMap.set(e.id, { id: e.id, name: e.name });
  }
  const zoneToDistricts = new Map<number, { id: number; name: string; code: string }[]>();
  for (const zd of zoneDistricts as any[]) {
    if (!zoneToDistricts.has(zd.zone_id)) zoneToDistricts.set(zd.zone_id, []);
    const district = districtMap.get(zd.district_id);
    if (district) zoneToDistricts.get(zd.zone_id)!.push(district);
  }
  const data = (zones as any[]).map((z) => ({
    id: z.id,
    name: z.name,
    code: z.code,
    employees: z.employee_id ? employeeMap.get(z.employee_id) || null : null,
    districts: zoneToDistricts.get(z.id) || []
  }));
  res.json({ status: 'success', message: 'Zones data retrieved successfully', data });
};
export const getZoneById = async (req: Request, res: Response) => {
  const row = await assetModel.getZoneById(Number(req.params.id));
  res.json({ status: 'success', message: 'Zone data retrieved successfully', data: row });
};
export const createZone = async (req: Request, res: Response) => {
  const { name, code, employee_id, districts } = req.body;
  // Create the zone
  const result = await assetModel.createZone({ name, code, employee_id });
  const zoneId = (result as any).insertId;
  // Add districts to zone if provided
  if (Array.isArray(districts)) {
    for (const districtId of districts) {
      await assetModel.addDistrictToZone(zoneId, districtId);
    }
  }
  res.json({ status: 'success', message: 'Zone created successfully', result });
};
export const updateZone = async (req: Request, res: Response) => {
  const { name, code, employee_id, districts } = req.body;
  const zoneId = Number(req.params.id);
  // Update the zone
  const result = await assetModel.updateZone(zoneId, { name, code, employee_id });
  // Remove all previous district links for this zone
  await assetModel.removeAllDistrictsFromZone(zoneId);
  // Add new district links if provided
  if (Array.isArray(districts)) {
    for (const districtId of districts) {
      await assetModel.addDistrictToZone(zoneId, districtId);
    }
  }
  res.json({ status: 'success', message: 'Zone updated successfully', result });
};
export const deleteZone = async (req: Request, res: Response) => {
  const result = await assetModel.deleteZone(Number(req.params.id));
  res.json({ status: 'success', message: 'Zone deleted successfully', result });
};

// MODULES
export const getModules = async (req: Request, res: Response) => {
  const rows = await assetModel.getModules();
  res.json({
    status: 'success',
    message: 'Modules data retrieved successfully',
    data: rows
  });
};
export const getModuleById = async (req: Request, res: Response) => {
  const row = await assetModel.getModuleById(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Module data retrieved successfully',
    data: row
  });
};
export const createModule = async (req: Request, res: Response) => {
  const { name, code } = req.body;
  const result = await assetModel.createModule({ name, code });
  res.json({
    status: 'success',
    message: 'Module created successfully',
    result
  });
};
export const updateModule = async (req: Request, res: Response) => {
  const { name, code } = req.body;
  const result = await assetModel.updateModule(Number(req.params.id), { name, code });
  res.json({
    status: 'success',
    message: 'Module updated successfully',
    result
  });
};
export const deleteModule = async (req: Request, res: Response) => {
  const result = await assetModel.deleteModule(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Module deleted successfully',
    result
  });
};

// SITES
export const getSites = async (req: Request, res: Response) => {
  // Fetch all sites
  let sites: any[] = [];
  const sitesRaw = await assetModel.getSites();
  if (Array.isArray(sitesRaw)) {
    sites = sitesRaw;
  } else if (sitesRaw && typeof sitesRaw === 'object' && 'length' in sitesRaw) {
    sites = Array.from(sitesRaw as any);
  }
  // Fetch all related data for mapping
  const assets = Array.isArray(await assetModel.getAssets()) ? await assetModel.getAssets() as any[] : [];
  const types = Array.isArray(await assetModel.getTypes()) ? await assetModel.getTypes() as any[] : [];
  const categories = Array.isArray(await assetModel.getCategories()) ? await assetModel.getCategories() as any[] : [];
  const brands = Array.isArray(await assetModel.getBrands()) ? await assetModel.getBrands() as any[] : [];
  const models = Array.isArray(await assetModel.getModels()) ? await assetModel.getModels() as any[] : [];
  const modules = Array.isArray(await assetModel.getModules()) ? await assetModel.getModules() as any[] : [];
  const districts = Array.isArray(await assetModel.getDistricts()) ? await assetModel.getDistricts() as any[] : [];

  // Build lookup maps
  const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));
  const categoryMap = new Map(categories.map((c: any) => [c.id, { id: c.id, name: c.name }]));
  const brandMap = new Map(brands.map((b: any) => [b.id, { id: b.id, name: b.name }]));
  const modelMap = new Map(models.map((m: any) => [m.id, { id: m.id, name: m.name }]));
  const moduleMap = new Map(modules.map((m: any) => [m.id, { id: m.id, name: m.code }]));
  const districtMap = new Map(districts.map((d: any) => [d.id, { id: d.id, name: d.name }]));
  const assetMap = new Map(assets.map((a: any) => [a.id, a]));

  // Format each site
  const data = sites.map((site: any) => {
    // Asset nesting
    let asset = null;
    if (site.asset_id && assetMap.has(site.asset_id)) {
      const a: any = assetMap.get(site.asset_id);
      asset = {
        id: a.id,
        serial_no: a.serial_number,
        type: typeMap.get(a.type_id) || null,
        category: categoryMap.get(a.category_id) || null,
        brand: brandMap.get(a.brand_id) || null,
        model: modelMap.get(a.model_id) || null
      };
    }
    // Module nesting
    const module = site.module_id ? moduleMap.get(site.module_id) || null : null;
    // District nesting
    const district = site.district_id ? districtMap.get(site.district_id) || null : null;
    // Geocode
    let geocode = null;
    if (site.lat !== undefined && site.lon !== undefined) {
      geocode = { lat: site.lat, lon: site.lon };
    }
    return {
      id: site.id,
      asset,
      module,
      district_id: district,
      site_category: site.site_category,
      site_code: site.site_code,
      site_name: site.site_name,
      dmafull: site.dmafull,
      geocode,
      address: site.address,
      address2: site.address2,
      boundary_coordinate: site.boundary_coordinate,
      site_status: site.site_status,
      site_picture: site.site_picture,
      site_schematic: site.site_schematic,
      site_certificate: site.site_certificate,
      notes: site.notes,
      agency: site.agency,
      wss_group: site.wss_group,
      monitoring_group: site.monitoring_group,
      area: site.area,
      assign_to: site.assign_to,
      dirname: site.dirname,
      db_id: site.db_id,
      attended_onsite_date: site.attended_onsite_date,
      team_id: site.team_id,
      team_id2: site.team_id2,
      last_upload: site.last_upload,
      main_site_code: site.main_site_code,
      mnf_baseline: site.mnf_baseline,
      nnf_baseline: site.nnf_baseline,
      dmz_baseline: site.dmz_baseline,
      cp_baseline: site.cp_baseline,
      date_created: site.date_created,
      min_mnf: site.min_mnf,
      max_mnf: site.max_mnf,
      dmz_type: site.dmz_type,
      operational_certificate: site.operational_certificate,
      eit_certificate: site.eit_certificate,
      remarks: site.remarks
    };
  });
  res.json({
    status: 'success',
    message: 'Sites data retrieved successfully',
    data
  });
};
export const getSiteById = async (req: Request, res: Response) => {
  const row = await assetModel.getSiteById(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Site data retrieved successfully',
    data: row
  });
};
export const createSite = async (req: Request, res: Response) => {
  const result = await assetModel.createSite(req.body);
  res.json({
    status: 'success',
    message: 'Site created successfully',
    result
  });
};
export const updateSite = async (req: Request, res: Response) => {
  const result = await assetModel.updateSite(Number(req.params.id), req.body);
  res.json({
    status: 'success',
    message: 'Site updated successfully',
    result
  });
};
export const deleteSite = async (req: Request, res: Response) => {
  const result = await assetModel.deleteSite(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Site deleted successfully',
    result
  });
};

// --- BRAND-CATEGORY RELATIONSHIP ENDPOINTS ---

// Assign a category to a brand
export const assignCategoryToBrand = async (req: Request, res: Response) => {
  const { brand_code, category_code } = req.params;
  await assetModel.addBrandCategory(brand_code, category_code);
  res.json({ status: 'success', message: 'Category assigned to brand' });
};

// Unassign a category from a brand
export const unassignCategoryFromBrand = async (req: Request, res: Response) => {
  const { brand_code, category_code } = req.params;
  await assetModel.removeBrandCategory(brand_code, category_code);
  res.json({ status: 'success', message: 'Category unassigned from brand' });
};

// Get all categories for a brand
export const getCategoriesForBrand = async (req: Request, res: Response) => {
  const { brand_code } = req.params;
  const categories = await assetModel.getCategoriesByBrand(brand_code);
  res.json({ status: 'success', data: categories });
};

// Get all brands for a category
export const getBrandsForCategory = async (req: Request, res: Response) => {
  const { category_code } = req.params;
  const brands = await assetModel.getBrandsByCategory(category_code);
  res.json({ status: 'success', data: brands });
};

// Get all brand-category associations (for frontend mapping)
export const getAllBrandCategoryMappings = async (req: Request, res: Response) => {
  // Get all brands and categories
  const brands = await assetModel.getBrands();
  const categories = await assetModel.getCategories();
  // Build lookup maps
  const brandMap = new Map<string, { id: number; name: string; code: string }>();
  for (const b of brands as any[]) {
    brandMap.set(b.code, { id: b.id, name: b.name, code: b.code });
  }
  const categoryMap = new Map<string, { id: number; name: string; code: string }>();
  for (const c of categories as any[]) {
    categoryMap.set(c.code, { id: c.id, name: c.name, code: c.code });
  }
  // Brute-force all pairs using getCategoriesByBrand for each brand
  let mappings: any[] = [];
  for (const b of brands as any[]) {
    const cats = await assetModel.getCategoriesByBrand(b.code);
    const catArr = Array.isArray(cats) ? cats : [];
    for (const c of catArr) {
      let catCode = '';
      if (typeof c === 'object' && c !== null) {
        // Try to extract category_code from known RowDataPacket structure
        if ('category_code' in c && typeof c.category_code === 'string') {
          catCode = c.category_code;
        } else if ('code' in c && typeof c.code === 'string') {
          catCode = c.code;
        }
      } else if (typeof c === 'string') {
        catCode = c;
      }
      if (!catCode) continue;
      mappings.push({
        brand: brandMap.get(b.code) || { code: b.code },
        category: categoryMap.get(catCode) || { code: catCode }
      });
    }
  }
  res.json({ status: 'success', data: mappings });
};

// SOFTWARES
export const getSoftwares = async (req: Request, res: Response) => {
  const rows = await assetModel.getSoftwares();
  res.json({
    status: 'success',
    message: 'Softwares data retrieved successfully',
    data: rows
  });
};

export const getSoftwareById = async (req: Request, res: Response) => {
  const row = await assetModel.getSoftwareById(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Software data retrieved successfully',
    data: row
  });
};

export const createSoftware = async (req: Request, res: Response) => {
  const { name } = req.body;
  const result = await assetModel.createSoftware({ name });
  res.status(201).json({
    status: 'success',
    message: 'Software created successfully',
    result
  });
};

export const updateSoftware = async (req: Request, res: Response) => {
  const { name } = req.body;
  const result = await assetModel.updateSoftware(Number(req.params.id), { name });
  res.json({
    status: 'success',
    message: 'Software updated successfully',
    result
  });
};

export const deleteSoftware = async (req: Request, res: Response) => {
  const result = await assetModel.deleteSoftware(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Software deleted successfully',
    result
  });
};
