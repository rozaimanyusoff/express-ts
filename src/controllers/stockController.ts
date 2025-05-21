import { Request, Response } from 'express';
import * as stockModel from '../models/stockModel';

// TYPES
export const getTypes = async (req: Request, res: Response) => {
  const rows = await stockModel.getTypes();
  res.json(rows);
};
export const getTypeById = async (req: Request, res: Response) => {
  const row = await stockModel.getTypeById(Number(req.params.id));
  res.json(row);
};
export const createType = async (req: Request, res: Response) => {
  const result = await stockModel.createType(req.body);
  res.json(result);
};
export const updateType = async (req: Request, res: Response) => {
  const result = await stockModel.updateType(Number(req.params.id), req.body);
  res.json(result);
};
export const deleteType = async (req: Request, res: Response) => {
  const result = await stockModel.deleteType(Number(req.params.id));
  res.json(result);
};

// CATEGORIES
export const getCategories = async (req: Request, res: Response) => {
  const rows = await stockModel.getCategories();
  // Fetch all types for mapping
  const types = await stockModel.getTypes();
  // Map type_id to type object
  const typeMap = new Map<number, { id: number; name: string }>();
  for (const t of types as any[]) {
    typeMap.set(t.id, { id: t.id, name: t.name });
  }
  const data = (rows as any[]).map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    image: cat.image,
    type: typeMap.get(cat.type_id) || null
  }));
  res.json({
    status: 'success',
    message: 'Categories data retrieved successfully',
    data
  });
};
export const getCategoryById = async (req: Request, res: Response) => {
  const row = await stockModel.getCategoryById(Number(req.params.id));
  res.json(row);
};
export const createCategory = async (req: Request, res: Response) => {
  // Accept frontend payload with typeId, map to type_id for DB
  const { name, description, typeId, image } = req.body;
  const result = await stockModel.createCategory({
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
  const result = await stockModel.updateCategory(Number(req.params.id), req.body);
  res.json(result);
};
export const deleteCategory = async (req: Request, res: Response) => {
  const result = await stockModel.deleteCategory(Number(req.params.id));
  res.json(result);
};

// BRANDS
export const getBrands = async (req: Request, res: Response) => {
  // Fetch all brands, types, and categories
  const brands = await stockModel.getBrands();
  const types = await stockModel.getTypes();
  const categories = await stockModel.getCategories();

  // Build lookup maps for type and category
  const typeMap = new Map<number, { id: number; name: string }>();
  for (const t of types as any[]) {
    typeMap.set(t.id, { id: t.id, name: t.name });
  }
  const categoryMap = new Map<number, { id: number; name: string }>();
  for (const c of categories as any[]) {
    categoryMap.set(c.id, { id: c.id, name: c.name });
  }

  // Map brands to include type and category objects
  const data = (brands as any[]).map((brand) => ({
    id: brand.id,
    name: brand.name,
    description: brand.description,
    image: brand.image,
    type: typeMap.get(brand.type_id) || null,
    category: categoryMap.get(brand.category_id) || null
  }));

  res.json({
    status: 'success',
    message: 'Brands data retrieved successfully',
    data
  });
};
export const getBrandById = async (req: Request, res: Response) => {
  const row = await stockModel.getBrandById(Number(req.params.id));
  res.json(row);
};
export const createBrand = async (req: Request, res: Response) => {
  // Accept frontend payload as-is (type_id, category_id)
  const result = await stockModel.createBrand(req.body);
  res.json({
    status: 'success',
    message: 'Brand created successfully',
    result
  });
};
export const updateBrand = async (req: Request, res: Response) => {
  // Accept frontend payload as-is (type_id, category_id)
  const result = await stockModel.updateBrand(Number(req.params.id), req.body);
  res.json({
    status: 'success',
    message: 'Brand updated successfully',
    result
  });
};
export const deleteBrand = async (req: Request, res: Response) => {
  const result = await stockModel.deleteBrand(Number(req.params.id));
  res.json(result);
};

// MODELS
export const getModels = async (req: Request, res: Response) => {
  // Fetch all models, brands, and categories
  const models = await stockModel.getModels();
  const brands = await stockModel.getBrands();
  const categories = await stockModel.getCategories();

  // Build lookup maps for brand and category
  const brandMap = new Map<number, { id: number; name: string }>();
  for (const b of brands as any[]) {
    brandMap.set(b.id, { id: b.id, name: b.name });
  }
  const categoryMap = new Map<number, { id: number; name: string }>();
  for (const c of categories as any[]) {
    categoryMap.set(c.id, { id: c.id, name: c.name });
  }

  // Map models to include brand and category objects
  const data = (models as any[]).map((model) => ({
    id: model.id,
    name: model.name,
    description: model.description,
    image: model.image,
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
  const row = await stockModel.getModelById(Number(req.params.id));
  res.json(row);
};
export const createModel = async (req: Request, res: Response) => {
  // Accept frontend payload with brandId and categoryId, map to brand_id and category_id
  const { name, description, image, brandId, categoryId } = req.body;
  const result = await stockModel.createModel({
    name,
    description,
    image,
    brand_id: brandId,
    category_id: categoryId
  });
  res.json({
    status: 'success',
    message: 'Model created successfully',
    result
  });
};
export const updateModel = async (req: Request, res: Response) => {
  // Accept frontend payload with brandId and categoryId, map to brand_id and category_id
  const { name, description, image, brandId, categoryId } = req.body;
  const result = await stockModel.updateModel(Number(req.params.id), {
    name,
    description,
    image,
    brand_id: brandId,
    category_id: categoryId
  });
  res.json({
    status: 'success',
    message: 'Model updated successfully',
    result
  });
};
export const deleteModel = async (req: Request, res: Response) => {
  const result = await stockModel.deleteModel(Number(req.params.id));
  res.json(result);
};

// ASSETS
export const getAssets = async (req: Request, res: Response) => {
  const rows = await stockModel.getAssets();
  res.json(rows);
};
export const getAssetById = async (req: Request, res: Response) => {
  const row = await stockModel.getAssetById(Number(req.params.id));
  res.json(row);
};
export const createAsset = async (req: Request, res: Response) => {
  const result = await stockModel.createAsset(req.body);
  res.json(result);
};
export const updateAsset = async (req: Request, res: Response) => {
  const result = await stockModel.updateAsset(Number(req.params.id), req.body);
  res.json(result);
};
export const deleteAsset = async (req: Request, res: Response) => {
  const result = await stockModel.deleteAsset(Number(req.params.id));
  res.json(result);
};

// DEPARTMENTS
export const getDepartments = async (req: Request, res: Response) => {
  const rows = await stockModel.getDepartments();
  res.json({
    status: 'success',
    message: 'Departments data retrieved successfully',
    data: rows
  });
};
export const getDepartmentById = async (req: Request, res: Response) => {
  const row = await stockModel.getDepartmentById(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Department data retrieved successfully',
    data: row
  });
};
export const createDepartment = async (req: Request, res: Response) => {
  const result = await stockModel.createDepartment(req.body);
  res.json({
    status: 'success',
    message: 'Department created successfully',
    result
  });
};
export const updateDepartment = async (req: Request, res: Response) => {
  const result = await stockModel.updateDepartment(Number(req.params.id), req.body);
  res.json({
    status: 'success',
    message: 'Department updated successfully',
    result
  });
};
export const deleteDepartment = async (req: Request, res: Response) => {
  const result = await stockModel.deleteDepartment(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Department deleted successfully',
    result
  });
};

// POSITIONS
export const getPositions = async (req: Request, res: Response) => {
  const rows = await stockModel.getPositions();
  res.json({
    status: 'success',
    message: 'Positions data retrieved successfully',
    data: rows
  });
};
export const getPositionById = async (req: Request, res: Response) => {
  const row = await stockModel.getPositionById(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Position data retrieved successfully',
    data: row
  });
};
export const createPosition = async (req: Request, res: Response) => {
  const result = await stockModel.createPosition(req.body);
  res.json({
    status: 'success',
    message: 'Position created successfully',
    result
  });
};
export const updatePosition = async (req: Request, res: Response) => {
  const result = await stockModel.updatePosition(Number(req.params.id), req.body);
  res.json({
    status: 'success',
    message: 'Position updated successfully',
    result
  });
};
export const deletePosition = async (req: Request, res: Response) => {
  const result = await stockModel.deletePosition(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Position deleted successfully',
    result
  });
};

// SECTIONS
export const getSections = async (req: Request, res: Response) => {
  const sections = await stockModel.getSections();
  const departments = await stockModel.getDepartments();
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
  const section = await stockModel.getSectionById(Number(req.params.id));
  if (!section) {
    return res.status(404).json({ status: 'error', message: 'Section not found' });
  }
  let department = null;
  if (section.department_id) {
    const dep = await stockModel.getDepartmentById(section.department_id);
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
  const result = await stockModel.createSection({
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
  const result = await stockModel.updateSection(Number(req.params.id), {
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
  const result = await stockModel.deleteSection(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Section deleted successfully',
    result
  });
};

// COSTCENTERS
export const getCostcenters = async (req: Request, res: Response) => {
  const rows = await stockModel.getCostcenters();
  res.json({
    status: 'success',
    message: 'Costcenters data retrieved successfully',
    data: rows
  });
};
export const getCostcenterById = async (req: Request, res: Response) => {
  const row = await stockModel.getCostcenterById(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Costcenter data retrieved successfully',
    data: row
  });
};
export const createCostcenter = async (req: Request, res: Response) => {
  const result = await stockModel.createCostcenter(req.body);
  res.json({
    status: 'success',
    message: 'Costcenter created successfully',
    result
  });
};
export const updateCostcenter = async (req: Request, res: Response) => {
  const result = await stockModel.updateCostcenter(Number(req.params.id), req.body);
  res.json({
    status: 'success',
    message: 'Costcenter updated successfully',
    result
  });
};
export const deleteCostcenter = async (req: Request, res: Response) => {
  const result = await stockModel.deleteCostcenter(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Costcenter deleted successfully',
    result
  });
};

// EMPLOYEES
export const getEmployees = async (req: Request, res: Response) => {
  const employees = await stockModel.getUsers();
  const departments = await stockModel.getDepartments();
  const positions = await stockModel.getPositions();
  const districts = await stockModel.getDistricts(); // renamed from locations
  const sections = await stockModel.getSections();

  // Build lookup maps
  const departmentMap = new Map<number, { id: number; name: string }>();
  for (const d of departments as any[]) {
    departmentMap.set(d.id, { id: d.id, name: d.name });
  }
  const sectionMap = new Map<number, { id: number; name: string }>();
  for (const s of sections as any[]) {
    sectionMap.set(s.id, { id: s.id, name: s.name });
  }
  const positionMap = new Map<number, { id: number; name: string }>();
  for (const p of positions as any[]) {
    positionMap.set(p.id, { id: p.id, name: p.name });
  }
  const districtMap = new Map<number, { id: number; name: string }>();
  for (const l of districts as any[]) {
    districtMap.set(l.id, { id: l.id, name: l.code });
  }

  const data = (employees as any[]).map(emp => ({
    id: emp.id,
    name: emp.name,
    email: emp.email,
    phone: emp.phone,
    department: departmentMap.get(emp.department_id) || null,
    section: emp.section_id ? sectionMap.get(emp.section_id) || null : null,
    position: positionMap.get(emp.position_id) || null,
    district: districtMap.get(emp.location_id) || null,
    image: emp.image
  }));

  res.json({
    status: 'success',
    message: 'Employees data retrieved successfully',
    data
  });
};

export const getEmployeeById = async (req: Request, res: Response) => {
  const emp = await stockModel.getUserById(Number(req.params.id));
  if (!emp) {
    return res.status(404).json({ status: 'error', message: 'Employee not found' });
  }
  const department = emp.department_id ? await stockModel.getDepartmentById(emp.department_id) : null;
  const section = emp.section_id ? await stockModel.getSectionById(emp.section_id) : null;
  const position = emp.position_id ? await stockModel.getPositionById(emp.position_id) : null;
  const district = emp.location_id ? await stockModel.getDistrictById(emp.location_id) : null;

  res.json({
    status: 'success',
    message: 'Employee data retrieved successfully',
    data: {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department: department ? { id: department.id, name: department.name } : null,
      section: section ? { id: section.id, name: section.name } : null,
      position: position ? { id: position.id, name: position.name } : null,
      district: district ? { id: district.id, name: district.code } : null,
      image: emp.image
    }
  });
};

export const createEmployee = async (req: Request, res: Response) => {
  const { name, email, phone, image, departmentId, positionId, districtId, sectionId } = req.body;
  const result = await stockModel.createEmp({
    name,
    email,
    phone,
    image,
    department_id: departmentId,
    position_id: positionId,
    location_id: districtId,
    section_id: sectionId
  });
  res.json({
    status: 'success',
    message: 'Employee created successfully',
    result
  });
};
export const updateEmployee = async (req: Request, res: Response) => {
  const { name, email, phone, image, departmentId, positionId, districtId, sectionId } = req.body;
  const result = await stockModel.updateEmp(Number(req.params.id), {
    name,
    email,
    phone,
    image,
    department_id: departmentId,
    position_id: positionId,
    location_id: districtId,
    section_id: sectionId
  });
  res.json({
    status: 'success',
    message: 'Employee updated successfully',
    result
  });
};
export const deleteEmployee = async (req: Request, res: Response) => {
  const result = await stockModel.deleteUser(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Employee deleted successfully',
    result
  });
};

// DISTRICTS
export const getDistricts = async (req: Request, res: Response) => {
  const districts = await stockModel.getDistricts();
  const zoneDistricts = await stockModel.getAllZoneDistricts();
  const zones = await stockModel.getZones();
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
  const row = await stockModel.getDistrictById(Number(req.params.id));
  res.json({ status: 'success', message: 'District data retrieved successfully', data: row });
};
export const createDistrict = async (req: Request, res: Response) => {
  const { name, code, zone_id } = req.body;
  // Create the district
  const result = await stockModel.createDistrict({ name, code });
  // Get the new district's id
  const districtId = (result as any).insertId;
  // If zone_id is provided, create the join
  if (zone_id) {
    await stockModel.addDistrictToZone(zone_id, districtId);
  }
  res.json({ status: 'success', message: 'District created successfully', result });
};
export const updateDistrict = async (req: Request, res: Response) => {
  const { name, code, zone_id } = req.body;
  const districtId = Number(req.params.id);
  // Update the district
  const result = await stockModel.updateDistrict(districtId, { name, code });
  // Remove all previous zone links for this district
  await stockModel.removeAllZonesFromDistrict(districtId);
  // Add new zone link if provided
  if (zone_id) {
    await stockModel.addDistrictToZone(zone_id, districtId);
  }
  res.json({ status: 'success', message: 'District updated successfully', result });
};
export const deleteDistrict = async (req: Request, res: Response) => {
  const districtId = Number(req.params.id);
  // Remove all zone links for this district
  await stockModel.removeAllZonesFromDistrict(districtId);
  // Delete the district
  const result = await stockModel.deleteDistrict(districtId);
  res.json({ status: 'success', message: 'District deleted successfully', result });
};

// ZONES
export const getZones = async (req: Request, res: Response) => {
  const zones = await stockModel.getZones();
  const zoneDistricts = await stockModel.getAllZoneDistricts();
  const districts = await stockModel.getDistricts();
  const employees = await stockModel.getUsers();
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
  const row = await stockModel.getZoneById(Number(req.params.id));
  res.json({ status: 'success', message: 'Zone data retrieved successfully', data: row });
};
export const createZone = async (req: Request, res: Response) => {
  const { name, code, employee_id, districts } = req.body;
  // Create the zone
  const result = await stockModel.createZone({ name, code, employee_id });
  const zoneId = (result as any).insertId;
  // Add districts to zone if provided
  if (Array.isArray(districts)) {
    for (const districtId of districts) {
      await stockModel.addDistrictToZone(zoneId, districtId);
    }
  }
  res.json({ status: 'success', message: 'Zone created successfully', result });
};
export const updateZone = async (req: Request, res: Response) => {
  const { name, code, employee_id, districts } = req.body;
  const zoneId = Number(req.params.id);
  // Update the zone
  const result = await stockModel.updateZone(zoneId, { name, code, employee_id });
  // Remove all previous district links for this zone
  await stockModel.removeAllDistrictsFromZone(zoneId);
  // Add new district links if provided
  if (Array.isArray(districts)) {
    for (const districtId of districts) {
      await stockModel.addDistrictToZone(zoneId, districtId);
    }
  }
  res.json({ status: 'success', message: 'Zone updated successfully', result });
};
export const deleteZone = async (req: Request, res: Response) => {
  const result = await stockModel.deleteZone(Number(req.params.id));
  res.json({ status: 'success', message: 'Zone deleted successfully', result });
};

// MODULES
export const getModules = async (req: Request, res: Response) => {
  const rows = await stockModel.getModules();
  res.json({
    status: 'success',
    message: 'Modules data retrieved successfully',
    data: rows
  });
};
export const getModuleById = async (req: Request, res: Response) => {
  const row = await stockModel.getModuleById(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Module data retrieved successfully',
    data: row
  });
};
export const createModule = async (req: Request, res: Response) => {
  const { name, code } = req.body;
  const result = await stockModel.createModule({ name, code });
  res.json({
    status: 'success',
    message: 'Module created successfully',
    result
  });
};
export const updateModule = async (req: Request, res: Response) => {
  const { name, code } = req.body;
  const result = await stockModel.updateModule(Number(req.params.id), { name, code });
  res.json({
    status: 'success',
    message: 'Module updated successfully',
    result
  });
};
export const deleteModule = async (req: Request, res: Response) => {
  const result = await stockModel.deleteModule(Number(req.params.id));
  res.json({
    status: 'success',
    message: 'Module deleted successfully',
    result
  });
};
