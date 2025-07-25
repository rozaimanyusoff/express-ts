import { Request, Response } from 'express';
import * as assetModel from './assetModel';
import * as billingModel from '../p.billing/billingModel';
import path from 'path';
import { getAssetsByIds, getStringParam } from "./assetModel";
import { sendMail } from '../utils/mailer';
import assetTransferRequestEmail from '../utils/emailTemplates/assetTransferRequest';
import assetTransferSupervisorEmail from '../utils/emailTemplates/assetTransferSupervisorEmail';
import { assetTransferCurrentOwnerEmail } from '../utils/emailTemplates/assetTransferCurrentOwner';

// --- Add this helper near the top of the file ---
function isPlainObjectArray(arr: any): arr is Record<string, any>[] {
  return Array.isArray(arr) && arr.every(e => e && typeof e === 'object' && !Array.isArray(e));
}

// TYPES
export const getTypes = async (req: Request, res: Response) => {
  const rows = await assetModel.getTypes();
  // Enhance: fetch all employees for manager lookup
  const employees = await assetModel.getEmployees();
  const employeeMap = new Map((Array.isArray(employees) ? employees : []).map((e: any) => [e.ramco_id, e]));
  const data = (rows as any[]).map((type) => {
    let manager = null;
    if (type.manager && employeeMap.has(type.manager)) {
      const emp = employeeMap.get(type.manager);
      manager = { ramco_id: emp.ramco_id, full_name: emp.full_name };
    }
    // Add full image URL if image exists
    let image = type.image;
    if (image) {
      image = `https://${req.get('host')}/uploads/types/${image}`;
    }
    return {
      ...type,
      image,
      manager
    };
  });
  res.json({
    status: 'success',
    message: 'Asset type retrieved successfully',
    data
  });
};
export const getTypeById = async (req: Request, res: Response) => {
  const row = await assetModel.getTypeById(Number(req.params.id));
  if (!row) {
    return res.status(404).json({ status: 'error', message: 'Type not found', data: null });
  }
  // Enhance: fetch all employees for manager lookup
  const employees = await assetModel.getEmployees();
  const employeeMap = new Map((Array.isArray(employees) ? employees : []).map((e: any) => [e.ramco_id, e]));
  let manager = null;
  if (row.manager && employeeMap.has(row.ramco_id)) {
    const emp = employeeMap.get(row.ramco_id);
    manager = { ramco_id: emp.ramco_id, full_name: emp.full_name };
  }
  const data = { ...row, manager };
  res.json({
    status: 'success',
    message: 'Asset type retrieved successfully',
    data
  });
};
export const createType = async (req: Request, res: Response) => {
  try {
    const { code, name, description, image, manager, ramco_id } = req.body;
    // Accept ramco_id from either manager object or direct field
    const resolvedRamcoId = (manager && manager.ramco_id) ? manager.ramco_id : ramco_id;
    const result = await assetModel.createType({ code, name, description, image, ramco_id: resolvedRamcoId });
    // Ensure correct type for insertId
    const typeId = (result as import('mysql2').ResultSetHeader).insertId;
    // Fetch the created type to return with full image URL
    const type = await assetModel.getTypeById(typeId);
    if (type && type.image) {
      type.image = `https://${req.get('host')}/uploads/types/${type.image}`;
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
    const { code, name, description, image, manager, ramco_id } = req.body;
    // Accept ramco_id from either manager object or direct field
    const resolvedRamcoId = (manager && manager.ramco_id) ? manager.ramco_id : ramco_id;
    await assetModel.updateType(id, { code, name, description, image, ramco_id: resolvedRamcoId });
    // Fetch the updated type to return with full image URL
    const type = await assetModel.getTypeById(id);
    if (type && type.image) {
      type.image = `https://${req.get('host')}/uploads/types/${type.image}`;
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
            : `https://${req.get('host')}/uploads/brands/${brand.image}`)
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
    model.image = `https://${req.get('host')}/uploads/models/${model.image}`;
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
    model.image = `https://${req.get('host')}/uploads/models/${model.image}`;
  }
  res.json({ status: 'success', message: 'Model updated successfully', data: model });
};
export const deleteModel = async (req: Request, res: Response) => {
  const result = await assetModel.deleteModel(Number(req.params.id));
  res.json(result);
};

// ASSETS
// Helper type guard for RowDataPacket with asset_id and ramco_id
function isOwnershipRow(obj: any): obj is { asset_id: number; ramco_id: string; effective_date?: string } {
  return obj && typeof obj === 'object' && 'asset_id' in obj && 'ramco_id' in obj;
}

export const getAssets = async (req: Request, res: Response) => {
  // Support ?type=[type_id] and ?status=[status] params
  const typeIdParam = req.query.type;
  const statusParam = req.query.status;
  let typeIds: number[] | undefined = undefined;
  let status: string | undefined = undefined;
  if (typeof typeIdParam === 'string' && typeIdParam !== '' && typeIdParam !== 'all') {
    // Support comma-separated type IDs
    typeIds = typeIdParam.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
    if (typeIds.length === 0) typeIds = undefined;
  }
  if (typeof statusParam === 'string' && statusParam !== '') {
    status = statusParam;
  }
  // Fetch all assets and related data
  const assetsRaw = await assetModel.getAssets(typeIds, status);
  const ownershipsRaw = await assetModel.getAssetOwnerships();
  const employeesRaw = await assetModel.getEmployees();
  const typesRaw = await assetModel.getTypes();
  const categoriesRaw = await assetModel.getCategories();
  const brandsRaw = await assetModel.getBrands();
  const modelsRaw = await assetModel.getModels();
  const departmentsRaw = await assetModel.getDepartments();
  const costcentersRaw = await assetModel.getCostcenters();
  const districtsRaw = await assetModel.getDistricts();
  // Fetch fleet cards for vehicle assets
  const fleetCards = await billingModel.getFleetCards();

  const assets = Array.isArray(assetsRaw) ? assetsRaw : [];
  const ownerships = Array.isArray(ownershipsRaw) ? ownershipsRaw : [];
  const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
  const models = Array.isArray(modelsRaw) ? modelsRaw : [];
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
  const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];

  // Build lookup maps
  const typeMap = new Map(types.map((t: any) => [t.id, t]));
  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
  const brandMap = new Map(brands.map((b: any) => [b.id, b]));
  const modelMap = new Map(models.map((m: any) => [m.id, m]));
  const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
  const departmentMap = new Map(departments.map((d: any) => [d.id, d]));
  const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
  const districtMap = new Map(districts.map((d: any) => [d.id, d]));

  // Group ownerships by asset_id
  const ownershipsByAsset: Record<number, any[]> = {};
  for (const o of ownerships) {
    if (!isOwnershipRow(o)) continue;
    if (!ownershipsByAsset[o.asset_id]) ownershipsByAsset[o.asset_id] = [];
    const emp = employeeMap.get(o.ramco_id);
    if (emp) {
      // Add employee details to ownership
      ownershipsByAsset[o.asset_id].push({
        ramco_id: emp.ramco_id,
        name: emp.full_name,
        email: emp.email,
        contact: emp.contact,
        department: emp.department_id ? (departmentMap.get(emp.department_id)?.code || null) : null,
        //cost_center: emp.costcenter_id ? (costcenterMap.get(emp.costcenter_id)?.name || null) : null,
        district: emp.district_id ? (districtMap.get(emp.district_id)?.code || null) : null,
        effective_date: (o as any).effective_date || null
      });
    }
  }

  // Build asset data
  const data = await Promise.all(assets.map(async (asset: any) => {
    const type = typeMap.get(asset.type_id);
    let specs: any = null;
    if (type && type.id === 1) {
      // Computer specs
      const compSpecsArr = await assetModel.getComputerSpecsForAsset(asset.id);
      if (Array.isArray(compSpecsArr) && compSpecsArr.length > 0) {
        const compSpecs = compSpecsArr[0];
        const installedSoftware = await assetModel.getInstalledSoftwareForAsset(asset.id);
        specs = {
          categories: asset.category_id ? {
            category_id: asset.category_id,
            name: categoryMap.get(asset.category_id)?.name || null
          } : null,
          brands: asset.brand_id ? {
            brand_id: asset.brand_id,
            name: brandMap.get(asset.brand_id)?.name || null
          } : null,
          models: asset.model_id ? {
            model_id: asset.model_id,
            name: modelMap.get(asset.model_id)?.name || null
          } : null,
          ...compSpecs,
          installed_software: installedSoftware || []
        };
      }
    } else if (type && type.id === 2) {
      // Vehicle specs
      const vehSpecsArr = await assetModel.getVehicleSpecsForAsset(asset.id);
      if (Array.isArray(vehSpecsArr) && vehSpecsArr.length > 0) {
        const vehSpecs = vehSpecsArr[0];
        // Find fleet card by register_number
        let card_no = null;
        if (asset.register_number) {
          const fleetCard = fleetCards.find((fc: any) => fc.register_number === asset.register_number);
          if (fleetCard && fleetCard.card_no) {
            card_no = fleetCard.card_no;
          }
        }
        specs = {
          categories: asset.category_id ? {
            category_id: asset.category_id,
            name: categoryMap.get(asset.category_id)?.name || null
          } : null,
          brands: asset.brand_id ? {
            brand_id: asset.brand_id,
            name: brandMap.get(asset.brand_id)?.name || null
          } : null,
          models: asset.model_id ? {
            model_id: asset.model_id,
            name: modelMap.get(asset.model_id)?.name || null
          } : null,
          ...vehSpecs,
          card_no
        };
      }
    }
    return {
      id: asset.id,
      classification: asset.classification,
      asset_code: asset.asset_code,
      finance_tag: asset.finance_tag,
      register_number: asset.register_number,
      dop: asset.dop,
      year: asset.year,
      unit_price: asset.unit_price,
      depreciation_length: asset.depreciation_length,
      depreciation_rate: asset.depreciation_rate,
      costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
        ? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id)?.name || null }
        : null,
      status: asset.status,
      disposed_date: asset.disposed_date,
      types: type ? {
        id: type.id,
        code: type.code,
        name: type.name
      } : null,
      specs,
      owner: ownershipsByAsset[asset.id] || []
    };
  }));

  res.json({
    status: 'success',
    message: 'Assets data retrieved successfully',
    data
  });
};

export const getAssetById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const asset = await assetModel.getAssetById(id);
  if (!asset) return res.status(404).json({ status: 'error', message: 'Asset not found' });

  // Fetch all related data for mapping
  const [ownershipsRaw, employeesRaw, typesRaw, categoriesRaw, brandsRaw, modelsRaw, departmentsRaw, costcentersRaw, districtsRaw] = await Promise.all([
    assetModel.getAssetOwnerships(),
    assetModel.getEmployees(),
    assetModel.getTypes(),
    assetModel.getCategories(),
    assetModel.getBrands(),
    assetModel.getModels(),
    assetModel.getDepartments(),
    assetModel.getCostcenters(),
    assetModel.getDistricts()
  ]);
  const ownerships = Array.isArray(ownershipsRaw) ? ownershipsRaw : [];
  const employees = isPlainObjectArray(employeesRaw) ? (employeesRaw as any[]) : [];
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
  const models = Array.isArray(modelsRaw) ? modelsRaw : [];
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
  const costcenters = Array.isArray(costcentersRaw) ? costcentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];

  // Build lookup maps
  const typeMap = new Map(types.map((t: any) => [t.id, t]));
  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
  const brandMap = new Map(brands.map((b: any) => [b.id, b]));
  const modelMap = new Map(models.map((m: any) => [m.id, m]));
  const employeeMap = new Map(employees.map((e: any) => [e.ramco_id, e]));
  const departmentMap = new Map(departments.map((d: any) => [d.id, d]));
  const costcenterMap = new Map(costcenters.map((c: any) => [c.id, c]));
  const districtMap = new Map(districts.map((d: any) => [d.id, d]));

  // Group ownerships by asset_id
  const ownershipsByAsset: Record<number, any[]> = {};
  for (const o of ownerships) {
    if (!isOwnershipRow(o)) continue;
    if (!ownershipsByAsset[o.asset_id]) ownershipsByAsset[o.asset_id] = [];
    const emp = employeeMap.get(o.ramco_id);
    if (emp) {
      ownershipsByAsset[o.asset_id].push({
        ramco_id: emp.ramco_id,
        name: emp.full_name,
        email: emp.email,
        contact: emp.contact,
        department: emp.department_id ? (departmentMap.get(emp.department_id)?.code || null) : null,
        cost_center: emp.costcenter_id ? (costcenterMap.get(emp.costcenter_id)?.name || null) : null,
        district: emp.district_id ? (districtMap.get(emp.district_id)?.code || null) : null,
        effective_date: (o as any).effective_date || null
      });
    }
  }

  // Build specs
  const type = typeMap.get(asset.type_id);
  let specs: any = null;
  if (type && type.id === 1) {
    const compSpecsArr = await assetModel.getComputerSpecsForAsset(asset.id);
    if (Array.isArray(compSpecsArr) && compSpecsArr.length > 0) {
      const compSpecs = compSpecsArr[0];
      // Fetch installed software for this asset
      const installedSoftware = await assetModel.getInstalledSoftwareForAsset(asset.id);
      specs = {
        categories: asset.category_id ? {
          category_id: asset.category_id,
          name: categoryMap.get(asset.category_id)?.name || null
        } : null,
        brands: asset.brand_id ? {
          brand_id: asset.brand_id,
          name: brandMap.get(asset.brand_id)?.name || null
        } : null,
        models: asset.model_id ? {
          model_id: asset.model_id,
          name: modelMap.get(asset.model_id)?.name || null
        } : null,
        ...compSpecs,
        installed_software: installedSoftware || []
      };
    }
  } else if (type && type.id === 2) {
    const vehSpecsArr = await assetModel.getVehicleSpecsForAsset(asset.id);
    if (Array.isArray(vehSpecsArr) && vehSpecsArr.length > 0) {
      const vehSpecs = vehSpecsArr[0];
      specs = {
        categories: asset.category_id ? {
          category_id: asset.category_id,
          name: categoryMap.get(asset.category_id)?.name || null
        } : null,
        brands: asset.brand_id ? {
          brand_id: asset.brand_id,
          name: brandMap.get(asset.brand_id)?.name || null
        } : null,
        models: asset.model_id ? {
          model_id: asset.model_id,
          name: modelMap.get(asset.model_id)?.name || null
        } : null,
        ...vehSpecs
      };
    }
  }

  const assetWithNested = {
    id: asset.id,
    classification: asset.classification,
    asset_code: asset.asset_code,
    finance_tag: asset.finance_tag,
    register_number: asset.register_number,
    dop: asset.dop,
    year: asset.year,
    unit_price: asset.unit_price,
    depreciation_length: asset.depreciation_length,
    depreciation_rate: asset.depreciation_rate,
    costcenter: asset.costcenter_id && costcenterMap.has(asset.costcenter_id)
      ? { id: asset.costcenter_id, name: costcenterMap.get(asset.costcenter_id)?.name || null }
      : null,
    status: asset.status,
    disposed_date: asset.disposed_date,
    types: type ? {
      type_id: type.id,
      type_code: type.code,
      name: type.name
    } : null,
    specs,
    owner: ownershipsByAsset[asset.id] || []
  };

  res.json({
    status: 'success',
    message: 'Asset data by ID retrieved successfully',
    data: assetWithNested
  });
};

// ASSETS CRUD
export const createAsset = async (req: Request, res: Response) => {
  const assetData = req.body;
  const result = await assetModel.createAsset(assetData);
  res.status(201).json({
    status: 'success',
    message: 'Asset created successfully',
    result
  });
};

export const updateAsset = async (req: Request, res: Response) => {
  const { id } = req.params;
  const assetData = req.body;
  const result = await assetModel.updateAsset(Number(id), assetData);
  res.json({
    status: 'success',
    message: 'Asset updated successfully',
    result
  });
};

export const deleteAsset = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await assetModel.deleteAsset(Number(id));
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
  // Support ?status=active param
  const status = typeof req.query.status === 'string' && req.query.status !== '' ? req.query.status : undefined;
  const employees = await assetModel.getEmployees(status);
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
          : `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
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
            : `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
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

export const getEmployeeByRamco = async (req: Request, res: Response) => {
  const ramcoId = req.params.ramco_id;
  const emp = await assetModel.getEmployeeByRamco(ramcoId);
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
            : `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
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
}

export const getEmployeeByEmail = async (req: Request, res: Response) => {
  const email = req.params.email;
  const emp = await assetModel.getEmployeeByEmail(email);
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
            : `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
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
}

export const getEmployeeByContact = async (req: Request, res: Response) => {
  const email = req.params.email;
  const emp = await assetModel.getEmployeeByEmail(email);
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
            : `https://${req.get('host')}/uploads/employees/${emp.avatar}`)
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
}


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
        serial_no: a.register_number,
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

// Fetch assets by employee (ramco_id, email, or contact)
export const getAssetsByEmployee = async (req: Request, res: Response) => {
  const ramco_id = getStringParam(req.query.ramco_id);
  const email = getStringParam(req.query.email);
  const contactStr = getStringParam(req.query.contact);
  let contactNum: number | undefined = undefined;
  if (contactStr && !isNaN(Number(contactStr))) {
    contactNum = Number(contactStr);
  }
  let employee: any = null;
  if (ramco_id) {
    employee = await assetModel.getEmployeeByRamco(ramco_id);
  } else if (email) {
    employee = await assetModel.getEmployeeByEmail(email);
  } else if (contactNum !== undefined) {
    employee = await assetModel.getEmployeeByContact(contactNum);
  }
  if (!employee) {
    return res.status(404).json({ status: 'error', message: 'Employee not found', data: null });
  }
  // Find all asset ownerships for this employee
  const ownershipsRaw = await assetModel.getAssetOwnerships();
  const ownerships = isPlainObjectArray(ownershipsRaw) ? (ownershipsRaw as any[]) : [];
  const assetIds = ownerships.filter((o: any) => o.ramco_id === employee.ramco_id).map((o: any) => o.asset_id);
  // Filter out invalid asset IDs
  const validAssetIds = assetIds.filter((id: any) => typeof id === 'number' && !isNaN(id));
  if (!validAssetIds.length) {
    return res.json({ status: 'success', message: 'No assets found for employee', data: [{ employee: [employee], assets: [] }] });
  }
  // Fetch all lookup data
  const [assetsRaw, departmentsRaw, typesRaw, categoriesRaw, brandsRaw, modelsRaw, sectionsRaw, positionsRaw, costCentersRaw, districtsRaw] = await Promise.all([
    getAssetsByIds(validAssetIds),
    assetModel.getDepartments(),
    assetModel.getTypes(),
    assetModel.getCategories(),
    assetModel.getBrands(),
    assetModel.getModels(),
    assetModel.getSections(),
    assetModel.getPositions(),
    assetModel.getCostcenters(),
    assetModel.getDistricts()
  ]);
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
  const models = Array.isArray(modelsRaw) ? modelsRaw : [];
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
  const positions = Array.isArray(positionsRaw) ? positionsRaw : [];
  const costCenters = Array.isArray(costCentersRaw) ? costCentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
  const departmentMap = new Map(departments.map((d: any) => [d.id, { id: d.id, name: d.name }]));
  const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));
  const categoryMap = new Map(categories.map((c: any) => [c.id, { id: c.id, name: c.name }]));
  const brandMap = new Map(brands.map((b: any) => [b.id, { id: b.id, name: b.name }]));
  const modelMap = new Map(models.map((m: any) => [m.id, { id: m.id, name: m.name }]));
  const sectionMap = new Map(sections.map((s: any) => [s.id, { id: s.id, name: s.name }]));
  const positionMap = new Map(positions.map((p: any) => [p.id, { id: p.id, name: p.name }]));
  const costCenterMap = new Map(costCenters.map((c: any) => [c.id, { id: c.id, name: c.name }]));
  const districtMap = new Map(districts.map((d: any) => [d.id, { id: d.id, name: d.name }]));
  // Enrich assets
  const assets = (assetsRaw as any[]).map(asset => {
    return {
      id: asset.id,
      entry_code: asset.entry_code,
      asset_code: asset.asset_code,
      classification: asset.classification,
      finance_tag: asset.finance_tag,
      register_number: asset.register_number,
      dop: asset.dop,
      year: asset.year,
      unit_price: asset.unit_price,
      depreciation_length: asset.depreciation_length,
      depreciation_rate: asset.depreciation_rate,
      costcenter: asset.costcenter_id && costCenterMap.has(asset.costcenter_id)
        ? { id: asset.costcenter_id, name: costCenterMap.get(asset.costcenter_id)!.name }
        : null,
      type: asset.type_id && typeMap.has(asset.type_id)
        ? { id: asset.type_id, name: typeMap.get(asset.type_id)!.name }
        : null,
      category: asset.category_id && categoryMap.has(asset.category_id)
        ? { id: asset.category_id, name: categoryMap.get(asset.category_id)!.name }
        : null,
      brand: asset.brand_id && brandMap.has(asset.brand_id)
        ? { id: asset.brand_id, name: brandMap.get(asset.brand_id)!.name }
        : null,
      model: asset.model_id && modelMap.has(asset.model_id)
        ? { id: asset.model_id, name: modelMap.get(asset.model_id)!.name }
        : null,
      department: employee.department_id && departmentMap.has(employee.department_id)
        ? { id: employee.department_id, name: departmentMap.get(employee.department_id)!.name }
        : null,
      district: employee.district_id && districtMap.has(employee.district_id)
        ? { id: employee.district_id, name: districtMap.get(employee.district_id)!.name }
        : null,
      owner: {
        id: employee.id,
        ramco_id: employee.ramco_id,
        full_name: employee.full_name
      }
    };
  });
  // Build employee object with department, section, position, cost_center, district
  const employeeObj: any = {
    id: employee.id,
    ramco_id: employee.ramco_id,
    full_name: employee.full_name,
    email: employee.email,
    contact: employee.contact,
    department: employee.department_id ? departmentMap.get(employee.department_id) || null : null,
    position: employee.position_id ? positionMap.get(employee.position_id) || null : null,
    costcenter: employee.costcenter_id ? costCenterMap.get(employee.costcenter_id) || null : null,
    district: employee.district_id ? districtMap.get(employee.district_id) || null : null
  };
  if (employee.section_id) {
    employeeObj.section = sectionMap.get(employee.section_id) || null;
  }
  res.json({ status: 'success', message: 'Assets for employee', data: [{ employee: [employeeObj], assets }] });
};

// Fetch assets by supervisor (ramco_id) with nested employees
/* export const getAssetsBySupervisor = async (req: Request, res: Response) => {
  const ramco_id = getStringParam(req.query.ramco_id);
  if (!ramco_id) {
    return res.status(400).json({ status: 'error', message: 'Supervisor ramco_id required', data: null });
  }
  // Find all employees under this supervisor
  const employeesRaw = await assetModel.getEmployees();
  const employees = isPlainObjectArray(employeesRaw) ? (employeesRaw as any[]) : [];
  // Filter employees to only plain objects with string ramco_id and numeric department_id/district_id
  const validEmployees = employees.filter((e: any) =>
    e && typeof e === 'object' &&
    typeof e.ramco_id === 'string' &&
    (typeof e.department_id === 'number' || e.department_id === null || typeof e.department_id === 'undefined') &&
    (typeof e.district_id === 'number' || e.district_id === null || typeof e.district_id === 'undefined')
  );
  // Exclude employees with status = 'resigned' and filter subordinates
  const subordinates = validEmployees.filter((e: any) => e.wk_spv_id === ramco_id && e.employment_status !== 'resigned');
  if (!subordinates.length) {
    return res.json({ status: 'success', message: 'No subordinates found', data: [] });
  }
  // Find all asset ownerships
  const ownershipsRaw = await assetModel.getAssetOwnerships();
  const ownerships = isPlainObjectArray(ownershipsRaw) ? (ownershipsRaw as any[]) : [];
  // Build lookup maps for department, type, category, brand, model, section, position, cost_center, district
  const departmentsRaw = await assetModel.getDepartments();
  const typesRaw = await assetModel.getTypes();
  const categoriesRaw = await assetModel.getCategories();
  const brandsRaw = await assetModel.getBrands();
  const modelsRaw = await assetModel.getModels();
  const sectionsRaw = await assetModel.getSections();
  const positionsRaw = await assetModel.getPositions();
  const costCentersRaw = await assetModel.getCostcenters();
  const districtsRaw = await assetModel.getDistricts();
  // Ensure all lookup arrays are arrays
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
  const models = Array.isArray(modelsRaw) ? modelsRaw : [];
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
  const positions = Array.isArray(positionsRaw) ? positionsRaw : [];
  const costCenters = Array.isArray(costCentersRaw) ? costCentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
  const departmentMap = new Map(departments.map((d: any) => [d.id, { id: d.id, name: d.name }]));
  const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));
  const categoryMap = new Map(categories.map((c: any) => [c.id, { id: c.id, name: c.name }]));
  const brandMap = new Map(brands.map((b: any) => [b.id, { id: b.id, name: b.name }]));
  const modelMap = new Map(models.map((m: any) => [m.id, { id: m.id, name: m.name }]));
  const sectionMap = new Map(sections.map((s: any) => [s.id, { id: s.id, name: s.name }]));
  const positionMap = new Map(positions.map((p: any) => [p.id, { id: p.id, name: p.name }]));
  const costCenterMap = new Map(costCenters.map((c: any) => [c.id, { id: c.id, name: c.name }]));
  const districtMap = new Map(districts.map((d: any) => [d.id, { id: d.id, name: d.name }]));

  // For each subordinate, get their assets and build nested output
  const result = await Promise.all(subordinates.map(async (emp: any) => {
    const assetIds = ownerships.filter((o: any) => o.ramco_id === emp.ramco_id).map((o: any) => o.asset_id);
    const validAssetIds = assetIds.filter((id: any) => typeof id === 'number' && !isNaN(id));
    const assetsRaw = validAssetIds.length ? await getAssetsByIds(validAssetIds) : [];
    // Use subordinates as the only valid employee array for asset mapping
    const assets = (assetsRaw as any[]).map(asset => {
      // Find the owner (employee) for this asset
      const ownership = ownerships.find((o: any) => o.asset_id === asset.id);
      let ownerEmp: any = null;
      if (ownership) {
        ownerEmp = subordinates.find((e: any) => isEmployeeObject(e) && e.ramco_id === ownership.ramco_id);
      }
      return {
        id: asset.id,
        entry_code: asset.entry_code,
        asset_code: asset.asset_code,
        classification: asset.classification,
        finance_tag: asset.finance_tag,
        register_number: asset.register_number,
        dop: asset.dop,
        year: asset.year,
        unit_price: asset.unit_price,
        depreciation_length: asset.depreciation_length,
        depreciation_rate: asset.depreciation_rate,
        costcenter: asset.costcenter_id && costCenterMap.has(asset.costcenter_id)
          ? { id: asset.costcenter_id, name: costCenterMap.get(asset.costcenter_id)!.name }
          : null,
        type: asset.type_id && typeMap.has(asset.type_id)
          ? { id: asset.type_id, name: typeMap.get(asset.type_id)!.name }
          : null,
        category: asset.category_id && categoryMap.has(asset.category_id)
          ? { id: asset.category_id, name: categoryMap.get(asset.category_id)!.name }
          : null,
        brand: asset.brand_id && brandMap.has(asset.brand_id)
          ? { id: asset.brand_id, name: brandMap.get(asset.brand_id)!.name }
          : null,
        model: asset.model_id && modelMap.has(asset.model_id)
          ? { id: asset.model_id, name: modelMap.get(asset.model_id)!.name }
          : null,
        department: ownerEmp && ownerEmp.department_id && departmentMap.has(ownerEmp.department_id)
          ? { id: ownerEmp.department_id, name: departmentMap.get(ownerEmp.department_id)!.name }
          : null,
        district: ownerEmp && ownerEmp.district_id && districtMap.has(ownerEmp.district_id)
          ? { id: ownerEmp.district_id, name: districtMap.get(ownerEmp.district_id)!.name }
          : null,
        owner: ownerEmp ? {
          id: ownerEmp.id,
          ramco_id: ownerEmp.ramco_id,
          full_name: ownerEmp.full_name
        } : null
      };
    });
    // Build employee object with department, section, position, cost_center, district
    const employeeObj: any = {
      id: emp.id,
      ramco_id: emp.ramco_id,
      full_name: emp.full_name,
      email: emp.email,
      contact: emp.contact,
      department: emp.department_id ? departmentMap.get(emp.department_id) || null : null,
      position: emp.position_id ? positionMap.get(emp.position_id) || null : null,
      costcenter: emp.costcenter_id ? costCenterMap.get(emp.costcenter_id) || null : null,
      district: emp.district_id ? districtMap.get(emp.district_id) || null : null
    };
    if (emp.section_id) {
      employeeObj.section = sectionMap.get(emp.section_id) || null;
    }
    return { employee: [employeeObj], assets };
  }));
  // Group all employees and all assets into single arrays
  const allEmployees: any[] = [];
  const allAssets: any[] = [];
  for (const entry of result) {
    if (Array.isArray(entry.employee)) {
      allEmployees.push(...entry.employee);
    } else if (entry.employee) {
      allEmployees.push(entry.employee);
    }
    if (Array.isArray(entry.assets)) {
      allAssets.push(...entry.assets);
    } else if (entry.assets) {
      allAssets.push(entry.assets);
    }
  }
  res.json({ status: 'success', message: 'Assets for supervisor', data: [{ employee: allEmployees, assets: allAssets }] });
}; */
export const getAssetsBySupervisor = async (req: Request, res: Response) => {
  const ramco_id = getStringParam(req.query.ramco_id);
  if (!ramco_id) {
    return res.status(400).json({ status: 'error', message: 'Supervisor ramco_id required', data: null });
  }

  // Find all employees under this supervisor
  const employeesRaw = await assetModel.getEmployees();
  const employees = isPlainObjectArray(employeesRaw) ? (employeesRaw as any[]) : [];
  const validEmployees = employees.filter((e: any) =>
    e && typeof e === 'object' &&
    typeof e.ramco_id === 'string' &&
    (typeof e.department_id === 'number' || e.department_id === null || typeof e.department_id === 'undefined') &&
    (typeof e.district_id === 'number' || e.district_id === null || typeof e.district_id === 'undefined')
  );
  const subordinates = validEmployees.filter((e: any) => e.wk_spv_id === ramco_id && e.employment_status !== 'resigned');

  // Find all asset ownerships
  const ownershipsRaw = await assetModel.getAssetOwnerships();
  const ownerships = isPlainObjectArray(ownershipsRaw) ? (ownershipsRaw as any[]) : [];

  // Build lookup maps for department, type, category, brand, model, section, position, cost_center, district
  const [
    departmentsRaw, typesRaw, categoriesRaw, brandsRaw, modelsRaw,
    sectionsRaw, positionsRaw, costCentersRaw, districtsRaw
  ] = await Promise.all([
    assetModel.getDepartments(),
    assetModel.getTypes(),
    assetModel.getCategories(),
    assetModel.getBrands(),
    assetModel.getModels(),
    assetModel.getSections(),
    assetModel.getPositions(),
    assetModel.getCostcenters(),
    assetModel.getDistricts()
  ]);
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
  const models = Array.isArray(modelsRaw) ? modelsRaw : [];
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
  const positions = Array.isArray(positionsRaw) ? positionsRaw : [];
  const costCenters = Array.isArray(costCentersRaw) ? costCentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
  const departmentMap = new Map(departments.map((d: any) => [d.id, { id: d.id, name: d.name }]));
  const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));
  const categoryMap = new Map(categories.map((c: any) => [c.id, { id: c.id, name: c.name }]));
  const brandMap = new Map(brands.map((b: any) => [b.id, { id: b.id, name: b.name }]));
  const modelMap = new Map(models.map((m: any) => [m.id, { id: m.id, name: m.name }]));
  const sectionMap = new Map(sections.map((s: any) => [s.id, { id: s.id, name: s.name }]));
  const positionMap = new Map(positions.map((p: any) => [p.id, { id: p.id, name: p.name }]));
  const costCenterMap = new Map(costCenters.map((c: any) => [c.id, { id: c.id, name: c.name }]));
  const districtMap = new Map(districts.map((d: any) => [d.id, { id: d.id, name: d.name }]));

  // Fetch supervisor's own employee record and assets
  const supervisor = await assetModel.getEmployeeByRamco(ramco_id);
  let supervisorAssets: any[] = [];
  if (supervisor) {
    const assetIds = ownerships.filter((o: any) => o.ramco_id === supervisor.ramco_id).map((o: any) => o.asset_id);
    const validAssetIds = assetIds.filter((id: any) => typeof id === 'number' && !isNaN(id));
    const assetsResult = validAssetIds.length ? await getAssetsByIds(validAssetIds) : [];
    supervisorAssets = Array.isArray(assetsResult) ? assetsResult : [];
  }

  // Enrich supervisor's assets
  const enrichedSupervisorAssets = (supervisorAssets as any[]).map(asset => ({
    id: asset.id,
    entry_code: asset.entry_code,
    asset_code: asset.asset_code,
    classification: asset.classification,
    finance_tag: asset.finance_tag,
    register_number: asset.register_number,
    dop: asset.dop,
    year: asset.year,
    unit_price: asset.unit_price,
    depreciation_length: asset.depreciation_length,
    depreciation_rate: asset.depreciation_rate,
    costcenter: asset.costcenter_id && costCenterMap.has(asset.costcenter_id)
      ? { id: asset.costcenter_id, name: costCenterMap.get(asset.costcenter_id)!.name }
      : null,
    type: asset.type_id && typeMap.has(asset.type_id)
      ? { id: asset.type_id, name: typeMap.get(asset.type_id)!.name }
      : null,
    category: asset.category_id && categoryMap.has(asset.category_id)
      ? { id: asset.category_id, name: categoryMap.get(asset.category_id)!.name }
      : null,
    brand: asset.brand_id && brandMap.has(asset.brand_id)
      ? { id: asset.brand_id, name: brandMap.get(asset.brand_id)!.name }
      : null,
    model: asset.model_id && modelMap.has(asset.model_id)
      ? { id: asset.model_id, name: modelMap.get(asset.model_id)!.name }
      : null,
    department: supervisor.department_id && departmentMap.has(supervisor.department_id)
      ? { id: supervisor.department_id, name: departmentMap.get(supervisor.department_id)!.name }
      : null,
    district: supervisor.district_id && districtMap.has(supervisor.district_id)
      ? { id: supervisor.district_id, name: districtMap.get(supervisor.district_id)!.name }
      : null,
    owner: {
      id: supervisor.id,
      ramco_id: supervisor.ramco_id,
      full_name: supervisor.full_name
    }
  }));

  // Build supervisor employee object
  let supervisorObj: any = null;
  if (supervisor) {
    supervisorObj = {
      id: supervisor.id,
      ramco_id: supervisor.ramco_id,
      full_name: supervisor.full_name,
      email: supervisor.email,
      contact: supervisor.contact,
      department: supervisor.department_id ? departmentMap.get(supervisor.department_id) || null : null,
      position: supervisor.position_id ? positionMap.get(supervisor.position_id) || null : null,
      costcenter: supervisor.costcenter_id ? costCenterMap.get(supervisor.costcenter_id) || null : null,
      district: supervisor.district_id ? districtMap.get(supervisor.district_id) || null : null
    };
    if (supervisor.section_id) {
      supervisorObj.section = sectionMap.get(supervisor.section_id) || null;
    }
  }

  // For each subordinate, get their assets and build nested output
  const result = await Promise.all(subordinates.map(async (emp: any) => {
    const assetIds = ownerships.filter((o: any) => o.ramco_id === emp.ramco_id).map((o: any) => o.asset_id);
    const validAssetIds = assetIds.filter((id: any) => typeof id === 'number' && !isNaN(id));
    const assetsRaw = validAssetIds.length ? await getAssetsByIds(validAssetIds) : [];
    const assets = (assetsRaw as any[]).map(asset => {
      const ownership = ownerships.find((o: any) => o.asset_id === asset.id);
      let ownerEmp: any = null;
      if (ownership) {
        ownerEmp = subordinates.find((e: any) => isEmployeeObject(e) && e.ramco_id === ownership.ramco_id);
      }
      return {
        id: asset.id,
        entry_code: asset.entry_code,
        asset_code: asset.asset_code,
        classification: asset.classification,
        finance_tag: asset.finance_tag,
        register_number: asset.register_number,
        dop: asset.dop,
        year: asset.year,
        unit_price: asset.unit_price,
        depreciation_length: asset.depreciation_length,
        depreciation_rate: asset.depreciation_rate,
        costcenter: asset.costcenter_id && costCenterMap.has(asset.costcenter_id)
          ? { id: asset.costcenter_id, name: costCenterMap.get(asset.costcenter_id)!.name }
          : null,
        type: asset.type_id && typeMap.has(asset.type_id)
          ? { id: asset.type_id, name: typeMap.get(asset.type_id)!.name }
          : null,
        category: asset.category_id && categoryMap.has(asset.category_id)
          ? { id: asset.category_id, name: categoryMap.get(asset.category_id)!.name }
          : null,
        brand: asset.brand_id && brandMap.has(asset.brand_id)
          ? { id: asset.brand_id, name: brandMap.get(asset.brand_id)!.name }
          : null,
        model: asset.model_id && modelMap.has(asset.model_id)
          ? { id: asset.model_id, name: modelMap.get(asset.model_id)!.name }
          : null,
        department: ownerEmp && ownerEmp.department_id && departmentMap.has(ownerEmp.department_id)
          ? { id: ownerEmp.department_id, name: departmentMap.get(ownerEmp.department_id)!.name }
          : null,
        district: ownerEmp && ownerEmp.district_id && districtMap.has(ownerEmp.district_id)
          ? { id: ownerEmp.district_id, name: districtMap.get(ownerEmp.district_id)!.name }
          : null,
        owner: ownerEmp ? {
          id: ownerEmp.id,
          ramco_id: ownerEmp.ramco_id,
          full_name: ownerEmp.full_name
        } : null
      };
    });
    const employeeObj: any = {
      id: emp.id,
      ramco_id: emp.ramco_id,
      full_name: emp.full_name,
      email: emp.email,
      contact: emp.contact,
      department: emp.department_id ? departmentMap.get(emp.department_id) || null : null,
      position: emp.position_id ? positionMap.get(emp.position_id) || null : null,
      costcenter: emp.costcenter_id ? costCenterMap.get(emp.costcenter_id) || null : null,
      district: emp.district_id ? districtMap.get(emp.district_id) || null : null
    };
    if (emp.section_id) {
      employeeObj.section = sectionMap.get(emp.section_id) || null;
    }
    return { employee: [employeeObj], assets };
  }));

  // Group all employees and all assets into single arrays
  const allEmployees: any[] = [];
  const allAssets: any[] = [];
  if (supervisorObj) allEmployees.push(supervisorObj);
  if (enrichedSupervisorAssets.length) allAssets.push(...enrichedSupervisorAssets);
  for (const entry of result) {
    if (Array.isArray(entry.employee)) {
      allEmployees.push(...entry.employee);
    } else if (entry.employee) {
      allEmployees.push(entry.employee);
    }
    if (Array.isArray(entry.assets)) {
      allAssets.push(...entry.assets);
    } else if (entry.assets) {
      allAssets.push(entry.assets);
    }
  }
  res.json({ status: 'success', message: 'Assets for supervisor', data: [{ employee: allEmployees, assets: allAssets }] });
};

// Fetch assets by HOD (ramco_id) with nested employees
export const getAssetsByHOD = async (req: Request, res: Response) => {
  const ramco_id = getStringParam(req.query.ramco_id);
  if (!ramco_id) {
    return res.status(400).json({ status: 'error', message: 'HOD ramco_id required', data: null });
  }
  // Find HOD's department
  const hod = await assetModel.getEmployeeByRamco(ramco_id);
  if (!hod || !hod.department_id) {
    return res.status(404).json({ status: 'error', message: 'HOD or department not found', data: null });
  }
  // Find all employees in this department
  const employeesRaw = await assetModel.getEmployees();
  const employees = isPlainObjectArray(employeesRaw) ? (employeesRaw as any[]) : [];
  // Filter employees to only plain objects with string ramco_id and numeric department_id/district_id
  const validEmployees = employees.filter((e: any) =>
    e && typeof e === 'object' &&
    typeof e.ramco_id === 'string' &&
    (typeof e.department_id === 'number' || e.department_id === null || typeof e.department_id === 'undefined') &&
    (typeof e.district_id === 'number' || e.district_id === null || typeof e.district_id === 'undefined')
  );
  // Exclude employees with status = 'resigned' and filter subordinates
  const departmentEmployees = validEmployees.filter((e: any) => e.department_id === hod.department_id && e.employment_status !== 'resigned');
  if (!departmentEmployees.length) {
    return res.json({ status: 'success', message: 'No employees found for department', data: [] });
  }
  // Find all asset ownerships
  const ownershipsRaw = await assetModel.getAssetOwnerships();
  const ownerships = isPlainObjectArray(ownershipsRaw) ? (ownershipsRaw as any[]) : [];
  // Build lookup maps for department, type, category, brand, model, section, position, cost_center, district

  const departmentsRaw = await assetModel.getDepartments();
  const typesRaw = await assetModel.getTypes();
  const categoriesRaw = await assetModel.getCategories();
  const brandsRaw = await assetModel.getBrands();
  const modelsRaw = await assetModel.getModels();
  const sectionsRaw = await assetModel.getSections();
  const positionsRaw = await assetModel.getPositions();
  const costCentersRaw = await assetModel.getCostcenters();
  const districtsRaw = await assetModel.getDistricts();
  // Ensure all lookup arrays are arrays
  const departments = Array.isArray(departmentsRaw) ? departmentsRaw : [];
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];
  const models = Array.isArray(modelsRaw) ? modelsRaw : [];
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
  const positions = Array.isArray(positionsRaw) ? positionsRaw : [];
  const costCenters = Array.isArray(costCentersRaw) ? costCentersRaw : [];
  const districts = Array.isArray(districtsRaw) ? districtsRaw : [];
  const departmentMap = new Map(departments.map((d: any) => [d.id, { id: d.id, name: d.name }]));
  const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));
  const categoryMap = new Map(categories.map((c: any) => [c.id, { id: c.id, name: c.name }]));
  const brandMap = new Map(brands.map((b: any) => [b.id, { id: b.id, name: b.name }]));
  const modelMap = new Map(models.map((m: any) => [m.id, { id: m.id, name: m.name }]));
  const sectionMap = new Map(sections.map((s: any) => [s.id, { id: s.id, name: s.name }]));
  const positionMap = new Map(positions.map((p: any) => [p.id, { id: p.id, name: p.name }]));
  const costCenterMap = new Map(costCenters.map((c: any) => [c.id, { id: c.id, name: c.name }]));
  const districtMap = new Map(districts.map((d: any) => [d.id, { id: d.id, name: d.name }]));

  // For each employee, get their assets and build nested output
  const result = await Promise.all(departmentEmployees.map(async (emp: any) => {
    const assetIds = ownerships.filter((o: any) => o.ramco_id === emp.ramco_id).map((o: any) => o.asset_id);
    const validAssetIds = assetIds.filter((id: any) => typeof id === 'number' && !isNaN(id));
    const assetsRaw = validAssetIds.length ? await getAssetsByIds(validAssetIds) : [];
    // Use departmentEmployees as the only valid employee array for asset mapping
    const assets = (assetsRaw as any[]).map(asset => {
      // Find the owner (employee) for this asset
      const ownership = ownerships.find((o: any) => o.asset_id === asset.id);
      let ownerEmp: any = null;
      if (ownership) {
        ownerEmp = departmentEmployees.find((e: any) => isEmployeeObject(e) && e.ramco_id === ownership.ramco_id);
      }
      return {
        id: asset.id,
        entry_code: asset.entry_code,
        asset_code: asset.asset_code,
        classification: asset.classification,
        finance_tag: asset.finance_tag,
        register_number: asset.register_number,
        dop: asset.dop,
        year: asset.year,
        unit_price: asset.unit_price,
        depreciation_length: asset.depreciation_length,
        depreciation_rate: asset.depreciation_rate,
        costcenter: asset.costcenter_id && costCenterMap.has(asset.costcenter_id)
          ? { id: asset.costcenter_id, name: costCenterMap.get(asset.costcenter_id)!.name }
          : null,
        type: asset.type_id && typeMap.has(asset.type_id)
          ? { id: asset.type_id, name: typeMap.get(asset.type_id)!.name }
          : null,
        category: asset.category_id && categoryMap.has(asset.category_id)
          ? { id: asset.category_id, name: categoryMap.get(asset.category_id)!.name }
          : null,
        brand: asset.brand_id && brandMap.has(asset.brand_id)
          ? { id: asset.brand_id, name: brandMap.get(asset.brand_id)!.name }
          : null,
        model: asset.model_id && modelMap.has(asset.model_id)
          ? { id: asset.model_id, name: modelMap.get(asset.model_id)!.name }
          : null,
        department: ownerEmp && ownerEmp.department_id && departmentMap.has(ownerEmp.department_id)
          ? { id: ownerEmp.department_id, name: departmentMap.get(ownerEmp.department_id)!.name }
          : null,
        district: ownerEmp && ownerEmp.district_id && districtMap.has(ownerEmp.district_id)
          ? { id: ownerEmp.district_id, name: districtMap.get(ownerEmp.district_id)!.name }
          : null,
        owner: ownerEmp ? {
          id: ownerEmp.id,
          ramco_id: ownerEmp.ramco_id,
          full_name: ownerEmp.full_name
        } : null
      };
    });
    // Build employee object with department, section, position, cost_center, district
    const employeeObj: any = {
      id: emp.id,
      ramco_id: emp.ramco_id,
      full_name: emp.full_name,
      email: emp.email,
      contact: emp.contact,
      department: emp.department_id ? departmentMap.get(emp.department_id) || null : null,
      position: emp.position_id ? positionMap.get(emp.position_id) || null : null,
      costcenter: emp.costcenter_id ? costCenterMap.get(emp.costcenter_id) || null : null,
      district: emp.district_id ? districtMap.get(emp.district_id) || null : null
    };
    if (emp.section_id) {
      employeeObj.section = sectionMap.get(emp.section_id) || null;
    }
    return { employee: [employeeObj], assets };
  }));
  // Group all employees and all assets into single arrays
  const allEmployees: any[] = [];
  const allAssets: any[] = [];
  for (const entry of result) {
    if (Array.isArray(entry.employee)) {
      allEmployees.push(...entry.employee);
    } else if (entry.employee) {
      allEmployees.push(entry.employee);
    }
    if (Array.isArray(entry.assets)) {
      allAssets.push(...entry.assets);
    } else if (entry.assets) {
      allAssets.push(entry.assets);
    }
  }
  res.json({ status: 'success', message: 'Assets for HOD', data: [{ employee: allEmployees, assets: allAssets }] });
};

// --- Helper type guard for employee object ---
function isEmployeeObject(e: any): e is { id: number; ramco_id: string; full_name: string; email: string; contact: string; department_id?: number; position_id?: number; costcenter_id?: number; district_id?: number } {
  return e && typeof e === 'object' &&
    typeof e.id === 'number' &&
    typeof e.ramco_id === 'string' &&
    typeof e.full_name === 'string' &&
    typeof e.email === 'string' &&
    typeof e.contact !== 'undefined';
}

// --- Employee autocomplete search ---
// GET /employees/search?q=term
export const searchEmployees = async (req: Request, res: Response) => {
  const q = (req.query.q || '').toString().toLowerCase();
  if (!q || q.length < 2) {
    return res.json({ status: 'success', message: 'Query too short', data: [] });
  }
  const employees = await assetModel.searchEmployeesAutocomplete(q);
  // Ensure only objects with ramco_id and full_name are returned
  const data = Array.isArray(employees)
    ? employees.filter((emp: any) => typeof emp.ramco_id === 'string' && typeof emp.full_name === 'string')
    : [];
  res.json({ status: 'success', message: 'Employee search results', data });
};

// Lookup employee by ramco_id, email, or contact
export const getEmployeeByUsername = async (req: Request, res: Response) => {
  const username = req.params.username;
  let emp = null;
  // Try ramco_id (all digits or leading zeros)
  if (/^\d{5,}$/.test(username) || /^0+\d+$/.test(username)) {
    emp = await assetModel.getEmployeeByRamco(username);
  }
  // Try email
  if (!emp && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(username)) {
    emp = await assetModel.getEmployeeByEmail(username);
  }
  // Try contact (all digits, length >= 7)
  if (!emp && /^\d{7,}$/.test(username)) {
    emp = await assetModel.getEmployeeByContact(Number(username));
  }
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
      avatar: emp.avatar,
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

// ASSET TRANSFER REQUESTS
export const getAssetTransferRequests = async (req: Request, res: Response) => {
  // Fetch all transfer requests with their items
  const requests = await assetModel.getAssetTransferRequestsWithDetails();

  // Collect all unique employee, department, district, and costcenter IDs from requests and items
  const employeeRamcoIds = new Set<string>();
  const departmentIds = new Set<number>();
  const districtIds = new Set<number>();
  const costcenterIds = new Set<number>();

  for (const reqObj of requests) {
    if (reqObj.requestor) employeeRamcoIds.add(reqObj.requestor);
    for (const item of reqObj.items || []) {
      if (item.curr_owner) employeeRamcoIds.add(item.curr_owner);
      if (item.new_owner) employeeRamcoIds.add(item.new_owner);
      if (item.accepted_by) employeeRamcoIds.add(item.accepted_by);
      if (item.curr_department) departmentIds.add(item.curr_department);
      if (item.new_department) departmentIds.add(item.new_department);
      if (item.curr_district) districtIds.add(item.curr_district);
      if (item.new_district) districtIds.add(item.new_district);
      if (item.curr_costcenter) costcenterIds.add(item.curr_costcenter);
      if (item.new_costcenter) costcenterIds.add(item.new_costcenter);
    }
  }

  // Fetch all related objects in bulk (arrays)
  const [employeesArr, departmentsArr, districtsArr, costcentersArr] = await Promise.all([
    assetModel.getEmployees(),
    assetModel.getDepartments(),
    assetModel.getDistricts(),
    assetModel.getCostcenters()
  ]);

  // Build lookup maps
  const employeeRamcoMap = new Map<string, any>();
  for (const emp of employeesArr as any[]) {
    employeeRamcoMap.set(emp.ramco_id, {
      ramco_id: emp.ramco_id,
      name: emp.full_name,
      cost_center: emp.costcenter_id ? { id: emp.costcenter_id, name: (costcentersArr as any[]).find((c: any) => c.id === emp.costcenter_id)?.name || null } : null,
      department: emp.department_id ? { id: emp.department_id, name: (departmentsArr as any[]).find((d: any) => d.id === emp.department_id)?.name || null } : null,
      district: emp.district_id ? { id: emp.district_id, name: (districtsArr as any[]).find((d: any) => d.id === emp.district_id)?.name || null } : null
    });
  }
  const departmentMap = new Map<number, any>();
  for (const d of departmentsArr as any[]) departmentMap.set(d.id, { id: d.id, name: d.name });
  const districtMap = new Map<number, any>();
  for (const d of districtsArr as any[]) districtMap.set(d.id, { id: d.id, name: d.name });
  const costcenterMap = new Map<number, any>();
  for (const c of costcentersArr as any[]) costcenterMap.set(c.id, { id: c.id, name: c.name });

  // Helper to map by ramco_id for requestor, curr_owner, accepted_by
  const mapEmployeeByRamco = (ramco_id: any) => ramco_id ? employeeRamcoMap.get(ramco_id) || null : null;
  // Helper to map only ramco_id and name for item-level employee fields
  const mapEmployeeShortByRamco = (ramco_id: any) => {
    const emp = mapEmployeeByRamco(ramco_id);
    return emp ? { ramco_id: emp.ramco_id, name: emp.name } : null;
  };
  const mapDepartment = (id: any) => id ? departmentMap.get(id) || null : null;
  const mapDistrict = (id: any) => id ? districtMap.get(id) || null : null;
  const mapCostcenter = (id: any) => id ? costcenterMap.get(id) || null : null;

  // Map each request and its items to the enriched structure
  const enrichedRequests = requests.map((reqObj: any) => {
    return {
      ...reqObj,
      requestor: mapEmployeeByRamco(reqObj.requestor),
      items: (reqObj.items || []).map((item: any) => {
        const newItem: any = {
          ...item,
          curr_owner: mapEmployeeShortByRamco(item.curr_owner),
          new_owner: mapEmployeeShortByRamco(item.new_owner),
          accepted_by: mapEmployeeShortByRamco(item.accepted_by),
          curr_department: mapDepartment(item.curr_department),
          new_department: mapDepartment(item.new_department),
          curr_district: mapDistrict(item.curr_district),
          new_district: mapDistrict(item.new_district),
          curr_costcenter: mapCostcenter(item.curr_costcenter),
          new_costcenter: mapCostcenter(item.new_costcenter)
        };
        // Remove redundant id fields
        delete newItem.curr_department_id;
        delete newItem.new_department_id;
        delete newItem.curr_district_id;
        delete newItem.new_district_id;
        delete newItem.curr_costcenter_id;
        delete newItem.new_costcenter_id;
        delete newItem.owner;
        return newItem;
      })
    };
  });

  res.json({
    status: 'success',
    message: 'Asset transfer requests retrieved successfully',
    data: enrichedRequests
  });
};

export const getAssetTransferRequestById = async (req: Request, res: Response) => {
  const request = await assetModel.getAssetTransferRequestById(Number(req.params.id));
  if (!request) {
    return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
  }

  // Fetch items (details) for this request
  const itemsRaw = await assetModel.getAssetTransferDetailsByRequestId(request.id);
  // Cast to AssetTransferDetailItem[] for type safety
  const items = Array.isArray(itemsRaw) ? (itemsRaw as import('./assetController').AssetTransferDetailItem[]) : [];

  // Collect all unique employee, department, district, and costcenter IDs from the request and its items
  const employeeRamcoIds = new Set<string>();
  const departmentIds = new Set<number>();
  const districtIds = new Set<number>();
  const costcenterIds = new Set<number>();

  if (request.requestor) employeeRamcoIds.add(request.requestor);
  for (const item of items) {
    if (item.curr_owner) employeeRamcoIds.add(item.curr_owner);
    if (item.new_owner) employeeRamcoIds.add(item.new_owner);
    if (item.accepted_by) employeeRamcoIds.add(item.accepted_by);
    if (item.curr_department) departmentIds.add(item.curr_department);
    if (item.new_department) departmentIds.add(item.new_department);
    if (item.curr_district) districtIds.add(item.curr_district);
    if (item.new_district) districtIds.add(item.new_district);
    if (item.curr_costcenter) costcenterIds.add(item.curr_costcenter);
    if (item.new_costcenter) costcenterIds.add(item.new_costcenter);
  }

  // Fetch all related objects in bulk (arrays)
  const [employeesArr, departmentsArr, districtsArr, costcentersArr] = await Promise.all([
    assetModel.getEmployees(),
    assetModel.getDepartments(),
    assetModel.getDistricts(),
    assetModel.getCostcenters()
  ]);

  // Build lookup maps
  const employeeRamcoMap = new Map<string, any>();
  for (const emp of employeesArr as any[]) {
    employeeRamcoMap.set(emp.ramco_id, {
      ramco_id: emp.ramco_id,
      name: emp.full_name,
      cost_center: emp.costcenter_id ? { id: emp.costcenter_id, name: (costcentersArr as any[]).find((c: any) => c.id === emp.costcenter_id)?.name || null } : null,
      department: emp.department_id ? { id: emp.department_id, name: (departmentsArr as any[]).find((d: any) => d.id === emp.department_id)?.name || null } : null,
      district: emp.district_id ? { id: emp.district_id, name: (districtsArr as any[]).find((d: any) => d.id === emp.district_id)?.name || null } : null
    });
  }
  const departmentMap = new Map<number, any>();
  for (const d of departmentsArr as any[]) departmentMap.set(d.id, { id: d.id, name: d.name });
  const districtMap = new Map<number, any>();
  for (const d of districtsArr as any[]) districtMap.set(d.id, { id: d.id, name: d.name });
  const costcenterMap = new Map<number, any>();
  for (const c of costcentersArr as any[]) costcenterMap.set(c.id, { id: c.id, name: c.name });

  // Helper to map by ramco_id for requestor, curr_owner, accepted_by
  const mapEmployeeByRamco = (ramco_id: any) => ramco_id ? employeeRamcoMap.get(ramco_id) || null : null;
  // Helper to map only ramco_id and name for item-level employee fields
  const mapEmployeeShortByRamco = (ramco_id: any) => {
    const emp = mapEmployeeByRamco(ramco_id);
    return emp ? { ramco_id: emp.ramco_id, name: emp.name } : null;
  };
  const mapDepartment = (id: any) => id ? departmentMap.get(id) || null : null;
  const mapDistrict = (id: any) => id ? districtMap.get(id) || null : null;
  const mapCostcenter = (id: any) => id ? costcenterMap.get(id) || null : null;

  // Enrich the request and its items
  const enrichedRequest = {
    ...request,
    requestor: mapEmployeeByRamco(request.requestor),
    items: items.map((item: any) => {
      const newItem: any = {
        ...item,
        curr_owner: mapEmployeeShortByRamco(item.curr_owner),
        new_owner: mapEmployeeShortByRamco(item.new_owner),
        accepted_by: mapEmployeeShortByRamco(item.accepted_by),
        curr_department: mapDepartment(item.curr_department),
        new_department: mapDepartment(item.new_department),
        curr_district: mapDistrict(item.curr_district),
        new_district: mapDistrict(item.new_district),
        curr_costcenter: mapCostcenter(item.curr_costcenter),
        new_costcenter: mapCostcenter(item.new_costcenter)
      };
      // If transfer_type is Employee, resolve identifier as employee object
      if (item.transfer_type === 'Employee' && item.identifier) {
        newItem.identifier = mapEmployeeShortByRamco(item.identifier);
      }
      // Remove redundant id fields
      delete newItem.curr_department_id;
      delete newItem.new_department_id;
      delete newItem.curr_district_id;
      delete newItem.new_district_id;
      delete newItem.curr_costcenter_id;
      delete newItem.new_costcenter_id;
      delete newItem.owner;
      return newItem;
    })
  };

  res.json({
    status: 'success',
    message: 'Asset transfer request data retrieved successfully',
    data: enrichedRequest
  });
};

export const createAssetTransfer = async (req: Request, res: Response) => {
  // Accepts new frontend payload: {requestor, request_no, request_date, request_status, details: [...]}
  const { requestor, request_no, request_date, request_status, details } = req.body;
  if (!requestor || !Array.isArray(details) || details.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid request data' });
  }
  // Generate request_no if not provided
  const finalRequestNo = request_no && request_no.trim() ? request_no : await assetModel.generateNextRequestNo();
  // Use provided request_date or today
  const finalRequestDate = request_date || new Date();
  // Use provided request_status or default
  const finalRequestStatus = request_status || 'submitted';
  // Create the transfer request and get its ID
  const insertId = await assetModel.createAssetTransferRequest({
    request_no: finalRequestNo,
    requestor,
    request_date: finalRequestDate,
    request_status: finalRequestStatus,
    return_to_asset_manager: 0
  });
  // Insert each detail, mapping nested objects to IDs
  for (const detail of details) {
    await assetModel.createAssetTransferDetail({
      ...detail,
      transfer_request_id: insertId,
      curr_department: detail.curr_department?.id ?? null,
      curr_district: detail.curr_district?.id ?? null,
      curr_costcenter: detail.curr_costcenter?.id ?? null,
      new_department: detail.new_department?.id ?? null,
      new_district: detail.new_district?.id ?? null,
      new_costcenter: detail.new_costcenter?.id ?? null
    });
  }

  // --- EMAIL NOTIFICATION LOGIC ---
  try {
    // Fetch the full request and its items for email
    const request = await assetModel.getAssetTransferRequestById(insertId);
    const itemsRaw = await assetModel.getAssetTransferDetailsByRequestId(insertId);
    const items = Array.isArray(itemsRaw) ? itemsRaw : [];
    // Fetch all employees, costcenters, departments, districts for mapping
    const [employees, costcenters, departments, districts] = await Promise.all([
      assetModel.getEmployees(),
      assetModel.getCostcenters(),
      assetModel.getDepartments(),
      assetModel.getDistricts()
    ]);
    // Ensure all lookup arrays are arrays
    const empArr = Array.isArray(employees) ? employees : [];
    const costcenterArr = Array.isArray(costcenters) ? costcenters : [];
    const departmentArr = Array.isArray(departments) ? departments : [];
    const districtArr = Array.isArray(districts) ? districts : [];
    const empMap = new Map(empArr.map((e: any) => [e.ramco_id, e]));
    const costcenterMap = new Map(costcenterArr.map((c: any) => [c.id, c]));
    const departmentMap = new Map(departmentArr.map((d: any) => [d.id, d]));
    const districtMap = new Map(districtArr.map((d: any) => [d.id, d]));
    // Enrich items for email
    const enrichedItems = items.map((item: any) => {
      // Identifier logic
      let identifierDisplay = item.identifier;
      if (item.transfer_type === 'Employee' && item.identifier && empMap.has(item.identifier)) {
        const emp = empMap.get(item.identifier);
        identifierDisplay = emp && typeof emp === 'object' && 'full_name' in emp ? emp.full_name : item.identifier;
      }
      // Owners
      const currOwnerEmp = item.curr_owner && empMap.has(item.curr_owner) ? empMap.get(item.curr_owner) : null;
      const currOwnerName = currOwnerEmp && typeof currOwnerEmp === 'object' && 'full_name' in currOwnerEmp ? currOwnerEmp.full_name : item.curr_owner || '-';
      const newOwnerEmp = item.new_owner && empMap.has(item.new_owner) ? empMap.get(item.new_owner) : null;
      const newOwnerName = newOwnerEmp && typeof newOwnerEmp === 'object' && 'full_name' in newOwnerEmp ? newOwnerEmp.full_name : item.new_owner || '-';
      // Costcenters
      const currCostcenterObj = item.curr_costcenter && costcenterMap.has(item.curr_costcenter) ? costcenterMap.get(item.curr_costcenter) : null;
      const currCostcenterName = currCostcenterObj && typeof currCostcenterObj === 'object' && 'name' in currCostcenterObj ? currCostcenterObj.name : item.curr_costcenter || '-';
      const newCostcenterObj = item.new_costcenter && costcenterMap.has(item.new_costcenter) ? costcenterMap.get(item.new_costcenter) : null;
      const newCostcenterName = newCostcenterObj && typeof newCostcenterObj === 'object' && 'name' in newCostcenterObj ? newCostcenterObj.name : item.new_costcenter || '-';
      // Departments (show code)
      const currDepartmentObj = item.curr_department && departmentMap.has(item.curr_department) ? departmentMap.get(item.curr_department) : null;
      const currDepartmentCode = currDepartmentObj && typeof currDepartmentObj === 'object' && 'code' in currDepartmentObj ? currDepartmentObj.code : item.curr_department || '-';
      const newDepartmentObj = item.new_department && departmentMap.has(item.new_department) ? departmentMap.get(item.new_department) : null;
      const newDepartmentCode = newDepartmentObj && typeof newDepartmentObj === 'object' && 'code' in newDepartmentObj ? newDepartmentObj.code : item.new_department || '-';
      // Districts (show code)
      const currDistrictObj = item.curr_district && districtMap.has(item.curr_district) ? districtMap.get(item.curr_district) : null;
      const currDistrictCode = currDistrictObj && typeof currDistrictObj === 'object' && 'code' in currDistrictObj ? currDistrictObj.code : item.curr_district || '-';
      const newDistrictObj = item.new_district && districtMap.has(item.new_district) ? districtMap.get(item.new_district) : null;
      const newDistrictCode = newDistrictObj && typeof newDistrictObj === 'object' && 'code' in newDistrictObj ? newDistrictObj.code : item.new_district || '-';
      return {
        ...item,
        identifierDisplay,
        currOwnerName,
        newOwnerName,
        currCostcenterName,
        newCostcenterName,
        currDepartmentCode,
        newDepartmentCode,
        currDistrictCode,
        newDistrictCode
      };
    });
    // Fetch requestor info
    const requestorObj = await assetModel.getEmployeeByRamco(requestor);
    // Find supervisor by requestor's wk_spv_id
    let supervisorObj = null;
    if (requestorObj && requestorObj.wk_spv_id) {
      supervisorObj = await assetModel.getEmployeeByRamco(requestorObj.wk_spv_id);
    }
    // Generate action token and base URL for supervisor email
    // TODO: Replace with secure token generation and real base URL in production
    const actionToken = require('crypto').randomBytes(32).toString('hex');
    const actionBaseUrl = `${req.protocol}://${req.get('host')}/api/assets/asset-transfer`;
    // Compose email content for requestor (no actionToken/actionBaseUrl)
    const requestorEmailData = {
      request,
      items: enrichedItems,
      requestor: requestorObj,
      supervisor: supervisorObj || { name: 'Supervisor', email: '-' }
    };
    // Compose email content for supervisor (with actionToken/actionBaseUrl)
    const supervisorEmailData = {
      request,
      items: enrichedItems,
      requestor: requestorObj,
      supervisor: supervisorObj || { name: 'Supervisor', email: '-' },
      actionToken,
      actionBaseUrl
    };
    // Send to requestor (notification only)
    if (requestorObj && requestorObj.email) {
      const { subject, html } = assetTransferRequestEmail(requestorEmailData);
      await sendMail(requestorObj.email, subject, html);
    }
    // Send to supervisor (with action buttons)
    if (supervisorObj && supervisorObj.email) {
      // Only send if supervisor is not the same as requestor
      if (!requestorObj || requestorObj.email !== supervisorObj.email) {
        const { subject, html } = assetTransferSupervisorEmail(supervisorEmailData);
        await sendMail(supervisorObj.email, subject, html);
      }
    }
  } catch (err) {
    // Log but do not block the response
    console.error('Asset transfer email notification failed:', err);
  }
  // --- END EMAIL LOGIC ---

  res.status(201).json({
    status: 'success',
    message: 'Asset transfer request created successfully',
    request_id: insertId,
    request_no: finalRequestNo
  });
};

export const updateAssetTransfer = async (req: Request, res: Response) => {
  const requestId = Number(req.params.id);
  const { status, items } = req.body;
  if (!requestId || !status || !Array.isArray(items)) {
    return res.status(400).json({ status: 'error', message: 'Invalid request data' });
  }
  // Validate request exists
  const request = await assetModel.getAssetTransferRequestById(requestId);
  if (!request) {
    return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
  }
  // Validate each item
  for (const item of items) {
    if (!item.asset_id || !item.curr_owner || !item.new_department_id || !item.new_district_id || !item.new_costcenter_id) {
      return res.status(400).json({ status: 'error', message: 'Invalid item data' });
    }
    // Validate current owner exists
    const currOwner = await assetModel.getEmployeeByRamco(item.curr_owner);
    if (!currOwner) {
      return res.status(404).json({ status: 'error', message: `Current owner ${item.curr_owner} not found` });
    }
    // Validate new department, district, costcenter exist
    if (item.new_department_id && !(await assetModel.getDepartmentById(item.new_department_id))) {
      return res.status(404).json({ status: 'error', message: `New department ${item.new_department_id} not found` });
    }
    if (item.new_district_id && !(await assetModel.getDistrictById(item.new_district_id))) {
      return res.status(404).json({ status: 'error', message: `New district ${item.new_district_id} not found` });
    }
    if (item.new_costcenter_id && !(await assetModel.getCostcenterById(item.new_costcenter_id))) {
      return res.status(404).json({ status: 'error', message: `New cost center ${item.new_costcenter_id} not found` });
    }
  }
  // Update the transfer request
  const result = await assetModel.updateAssetTransferRequest(requestId, items);
  res.json({
    status: 'success',
    message: 'Asset transfer request updated successfully',
    result
  });
}

export const deleteAssetTransfer = async (req: Request, res: Response) => {
  const requestId = Number(req.params.id);
  if (!requestId) {
    return res.status(400).json({ status: 'error', message: 'Invalid request ID' });
  }
  // Validate request exists
  const request = await assetModel.getAssetTransferRequestById(requestId);
  if (!request) {
    return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
  }
  // Delete the transfer request
  await assetModel.deleteAssetTransferRequest(requestId);
  res.json({
    status: 'success',
    message: 'Asset transfer request deleted successfully'
  });
}

// TypeScript interface for asset transfer detail item
export interface AssetTransferDetailItem {
  id: number;
  transfer_request_id: number;
  transfer_type: string;
  asset_type: string;
  identifier: string;
  curr_owner: string | null;
  curr_department: number | null;
  curr_district: number | null;
  curr_costcenter: number | null;
  new_owner: string | null;
  new_department: number | null;
  new_district: number | null;
  new_costcenter: number | null;
  effective_date: string | null;
  reasons: string | null;
  attachment: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  acceptance_remarks: string | null;
  created_at: string;
  updated_at: string;
  // ...add any other fields as needed
}

export const updateAssetTransferApprovalStatusById = async (req: Request, res: Response) => {
  const requestId = Number(req.params.id);
  const { status, supervisorId } = req.body; // status: 'approved' or 'rejected', supervisorId: ramco_id
  if (!requestId || !status || !supervisorId) {
    return res.status(400).json({ status: 'error', message: 'Invalid request data' });
  }
  // Fetch the request
  const request = await assetModel.getAssetTransferRequestById(requestId);
  if (!request) {
    return res.status(404).json({ status: 'error', message: 'Transfer request not found' });
  }
  // Update approval fields
  const now = new Date();
  await assetModel.updateAssetTransferRequest(requestId, {
    ...request,
    approval_id: supervisorId,
    approval_date: now,
    request_status: status
  });
  // Fetch requestor and supervisor
  const requestor = await assetModel.getEmployeeByRamco(request.requestor);
  const supervisor = await assetModel.getEmployeeByRamco(supervisorId);
  // Fetch transfer items
  const itemsRaw = await assetModel.getAssetTransferDetailsByRequestId(requestId);
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .filter(item => item && typeof item === 'object' && 'transfer_type' in item && 'identifier' in item)
        .map(item => item as any)
    : [];
  // Send notification to requestor
  if (requestor?.email) {
    await sendMail(requestor.email, `Asset Transfer Request ${status.toUpperCase()}`, `Your asset transfer request #${request.request_no} has been ${status} by your supervisor.`);
  }
  // Notify each item owner/employee
  for (const item of items) {
    let ownerRamcoId: string | null = null;
    if (item.transfer_type === 'Employee' && item.identifier) {
      ownerRamcoId = item.identifier;
    } else if (item.transfer_type === 'Asset' && item.curr_owner) {
      ownerRamcoId = item.curr_owner;
    }
    if (ownerRamcoId) {
      const emp = await assetModel.getEmployeeByRamco(ownerRamcoId);
      if (emp?.email) {
        // Send asset transfer preparation email to current owner
        const { subject, html } = assetTransferCurrentOwnerEmail({
          request,
          item,
          currentOwner: emp,
          supervisor
        });
        await sendMail(emp.email, subject, html);
      }
    }
    // Existing notifications for transfer_type Employee/Asset
    if (item.transfer_type === 'Employee' && item.identifier) {
      const emp = await assetModel.getEmployeeByRamco(item.identifier);
      if (emp?.email) await sendMail(emp.email, 'Asset Transfer Status Update', `Your transfer status has been updated for request #${request.request_no}.`);
    } else if (item.transfer_type === 'Asset' && item.curr_owner) {
      const emp = await assetModel.getEmployeeByRamco(item.curr_owner);
      if (emp?.email) await sendMail(emp.email, 'Asset Transfer Status Update', `Your asset transfer status has been updated for request #${request.request_no}.`);
    }
  }
  res.json({ status: 'success', message: `Asset transfer request ${status}. Notifications sent.` });
};

// --- EMAIL APPROVAL/REJECTION HANDLERS FOR EMAIL LINKS ---
// GET /api/assets/asset-transfer/approve?id=...&token=...
export const approveAssetTransferByEmail = async (req: Request, res: Response) => {
  const { id, token } = req.query;
  // TODO: Validate token (implement real token validation in production)
  if (!id || !token) {
    return res.status(400).send('Invalid approval link.');
  }
  // Fetch the request
  const request = await assetModel.getAssetTransferRequestById(Number(id));
  if (!request) return res.status(404).send('Request not found.');
  // Fetch requestor's employee record to get supervisor
  const requestor = await assetModel.getEmployeeByRamco(request.requestor);
  const supervisorId = requestor?.wk_spv_id;
  if (!supervisorId) return res.status(400).send('Supervisor not found.');
  // Call approval logic directly
  await updateAssetTransferApprovalStatusById({
    ...req,
    params: { id },
    body: { status: 'approved', supervisorId },
  } as any, res);
};
// GET /api/assets/asset-transfer/reject?id=...&token=...
export const rejectAssetTransferByEmail = async (req: Request, res: Response) => {
  const { id, token } = req.query;
  // TODO: Validate token (implement real token validation in production)
  if (!id || !token) {
    return res.status(400).send('Invalid rejection link.');
  }
  // Fetch the request
  const request = await assetModel.getAssetTransferRequestById(Number(id));
  if (!request) return res.status(404).send('Request not found.');
  // Fetch requestor's employee record to get supervisor
  const requestor = await assetModel.getEmployeeByRamco(request.requestor);
  const supervisorId = requestor?.wk_spv_id;
  if (!supervisorId) return res.status(400).send('Supervisor not found.');
  // Call rejection logic directly
  await updateAssetTransferApprovalStatusById({
    ...req,
    params: { id },
    body: { status: 'rejected', supervisorId },
  } as any, res);
};

// --- TRANSFER CHECKLIST ---
export const getTransferChecklist = async (req: Request, res: Response) => {
  // Fetch basic transfer checklist items
  const checklistItems = await assetModel.getTransferChecklists();
  if (!Array.isArray(checklistItems)) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch checklist items' });
  }

  // Fetch all types for mapping
  const typesRaw = await assetModel.getTypes();
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));

  // Enrich checklist items with type information
  const enrichedChecklistItems = (checklistItems as any[]).map(item => ({
    ...item,
    type_id: item.type_id && typeMap.has(item.type_id) 
      ? typeMap.get(item.type_id) 
      : { id: item.type_id, name: null }
  }));

  res.json({ status: 'success', message: 'Transfer checklist items retrieved successfully', data: enrichedChecklistItems });
}

export const getTransferChecklistById = async (req: Request, res: Response) => {
  const checklistId = Number(req.params.id);
  if (!checklistId) {
    return res.status(400).json({ status: 'error', message: 'Invalid checklist ID' });
  }
  // Fetch the checklist item
  const checklistItem = await assetModel.getTransferChecklistById(checklistId);
  if (!checklistItem) {
    return res.status(404).json({ status: 'error', message: 'Checklist item not found' });
  }
  // Fetch all types for mapping
  const typesRaw = await assetModel.getTypes();
  const types = Array.isArray(typesRaw) ? typesRaw : [];
  const typeMap = new Map(types.map((t: any) => [t.id, { id: t.id, name: t.name }]));
  // Enrich with type information
  checklistItem.type_id = checklistItem.type_id && typeMap.has(checklistItem.type_id)
    ? typeMap.get(checklistItem.type_id)
    : { id: checklistItem.type_id, name: null };
  
  res.json({ status: 'success', message: 'Transfer checklist item retrieved successfully', data: checklistItem });
}


export const createTransferChecklist = async (req: Request, res: Response) => {
  const { item, type_id, is_required, created_by } = req.body;
  if (!item || !type_id) {
    return res.status(400).json({ status: 'error', message: 'Name and type_id are required' });
  }
  // Create the checklist item
  const insertId = await assetModel.createTransferChecklist({ item, type_id, is_required, created_by });
  res.status(201).json({ status: 'success', message: 'Transfer checklist item created successfully', data: { id: insertId } });
}

export const updateTransferChecklist = async (req: Request, res: Response) => {
  const checklistId = Number(req.params.id);
  const { item, type_id, is_required } = req.body;
  if (!checklistId || !item || !type_id) {
    return res.status(400).json({ status: 'error', message: 'Invalid checklist ID or missing fields' });
  }
  // Update the checklist item
  const result = await assetModel.updateTransferChecklist(checklistId, { item, type_id, is_required });
  if ((result as any).affectedRows === 0) {
    return res.status(404).json({ status: 'error', message: 'Checklist item not found' });
  }
  res.json({ status: 'success', message: 'Transfer checklist item updated successfully' });
}

export const deleteTransferChecklist = async (req: Request, res: Response) => {
  const checklistId = Number(req.params.id);
  if (!checklistId) {
    return res.status(400).json({ status: 'error', message: 'Invalid checklist ID' });
  }
  // Delete the checklist item
  const result = await assetModel.deleteTransferChecklist(checklistId);
  if ((result as any).affectedRows === 0) {
    return res.status(404).json({ status: 'error', message: 'Checklist item not found' });
  }
  res.json({ status: 'success', message: 'Transfer checklist item deleted successfully' });
}

