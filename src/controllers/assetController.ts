import { Request, Response, NextFunction } from "express";
import * as assetModel from "../models/assetModel";
import asyncHandler from "../utils/asyncHandler";

// Get all assets
export const getAssets = asyncHandler(async (req: Request, res: Response) => {
    const assets = await assetModel.getAssets();
    res.json(assets);
});

// Get asset by ID
export const getAssetsById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const asset = await assetModel.getAssetsById(Number(id));
    res.json(asset);
});

// Get assets by serial
export const getAssetsBySerial = asyncHandler(async (req: Request, res: Response) => {
    const { serial } = req.params;
    const assets = await assetModel.getAssetsBySerial(serial);
    res.json(assets);
});

// Create a new asset
export const createAsset = asyncHandler(async (req: Request, res: Response) => {
    const assetData = req.body;
    const result = await assetModel.createAsset(assetData);
    res.status(201).json({ id: result.insertId });
});

// Update an asset
export const updateAsset = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const assetData = req.body;
    await assetModel.updateAsset(Number(id), assetData);
    res.status(204).send();
});

// Delete an asset
export const deleteAsset = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await assetModel.deleteAsset(Number(id));
    res.status(204).send();
});

// Get asset records
export const getAssetRecords = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const records = await assetModel.getAssetRecords(Number(id));
    res.json(records);
});

// Get all asset types
export const getTypes = asyncHandler(async (req: Request, res: Response) => {
    const types = await assetModel.getTypes();
    res.json(types);
});

// Get asset type by ID
export const getAssetTypeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const type = await assetModel.getAssetTypeById(Number(id));
    res.json(type);
});

// Create a new asset type
export const createAssetType = asyncHandler(async (req: Request, res: Response) => {
    const typeData = req.body;
    const result = await assetModel.createAssetType(typeData);
    res.status(201).json({ id: result.insertId });
});

// Update an asset type
export const updateAssetType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const typeData = req.body;
    await assetModel.updateAssetType(Number(id), typeData);
    res.status(204).send();
});

// Delete an asset type
export const deleteAssetType = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await assetModel.deleteAssetType(Number(id));
    res.status(204).send();
});

// Get all brands
export const getBrands = asyncHandler(async (req: Request, res: Response) => {
    const brands = await assetModel.getBrands();
    res.json(brands);
});

// Get brand by ID
export const getBrandById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const brand = await assetModel.getBrandById(Number(id));
    res.json(brand);
});

// Create a new brand
export const createBrand = asyncHandler(async (req: Request, res: Response) => {
    const brandData = req.body;
    const result = await assetModel.createBrand(brandData);
    res.status(201).json({ id: result.insertId });
});

// Update a brand
export const updateBrand = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const brandData = req.body;
    await assetModel.updateBrand(Number(id), brandData);
    res.status(204).send();
});

// Delete a brand
export const deleteBrand = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await assetModel.deleteBrand(Number(id));
    res.status(204).send();
});

// Get category-brand associations
export const getCategoryBrandAssociations = asyncHandler(async (req: Request, res: Response) => {
    const associations = await assetModel.getCategoryBrandAssociations();
    res.json(associations);
});

// Get categories for a brand
export const getCategoriesForBrand = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = req.params;
    const categories = await assetModel.getCategoriesForBrand(Number(brandId));
    res.json(categories);
});

// Add categories to a brand
export const addCategoriesToBrand = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = req.params;
    const { categoryIds } = req.body;
    await assetModel.addCategoriesToBrand(Number(brandId), categoryIds);
    res.status(204).send();
});

// Add a single category to a brand
export const addCategoryToBrand = asyncHandler(async (req: Request, res: Response) => {
    const { brandId, categoryId } = req.body;
    await assetModel.addCategoryToBrand(Number(brandId), Number(categoryId));
    res.status(204).send();
});

// Remove a category from a brand
export const removeCategoryFromBrand = asyncHandler(async (req: Request, res: Response) => {
    const { brandId, categoryId } = req.body;
    await assetModel.removeCategoryFromBrand(Number(brandId), Number(categoryId));
    res.status(204).send();
});

// Get all categories
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await assetModel.getCategories();
    res.json(categories);
});

// Get category by ID
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await assetModel.getCategoryById(Number(id));
    res.json(category);
});

// Create a new category
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
    const categoryData = req.body;
    const result = await assetModel.createCategory(categoryData);
    res.status(201).json({ id: result.insertId });
});

// Update a category
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const categoryData = req.body;
    await assetModel.updateCategory(Number(id), categoryData);
    res.status(204).send();
});

// Delete a category
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await assetModel.deleteCategory(Number(id));
    res.status(204).send();
});

// Get category-brand mapping
export const getCategoryBrandMapping = asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const mapping = await assetModel.getCategoryBrandMapping(Number(categoryId));
    res.json(mapping);
});

// Get all models
export const getModels = asyncHandler(async (req: Request, res: Response) => {
    const models = await assetModel.getModels();
    res.json(models);
});

// Get model by ID
export const getModelById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const model = await assetModel.getModelById(Number(id));
    res.json(model);
});

// Create a new model
export const createModel = asyncHandler(async (req: Request, res: Response) => {
    const modelData = req.body;
    const result = await assetModel.createModel(modelData);
    res.status(201).json({ id: result.insertId });
});

// Update a model
export const updateModel = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const modelData = req.body;
    await assetModel.updateModel(Number(id), modelData);
    res.status(204).send();
});

// Delete a model
export const deleteModel = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await assetModel.deleteModel(Number(id));
    res.status(204).send();
});

// Get all departments
export const getDepartments = asyncHandler(async (req: Request, res: Response) => {
    const departments = await assetModel.getDepartments();
    res.json(departments);
});

// Get department by ID
export const getDepartmentById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const department = await assetModel.getDepartmentById(Number(id));
    res.json(department);
});

// Create a new department
export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
    const departmentData = req.body;
    const result = await assetModel.createDepartment(departmentData);
    res.status(201).json({ id: result.insertId });
});

// Update a department
export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const departmentData = req.body;
    await assetModel.updateDepartment(Number(id), departmentData);
    res.status(204).send();
});

// Delete a department
export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await assetModel.deleteDepartment(Number(id));
    res.status(204).send();
});

// Get all sections
export const getSections = asyncHandler(async (req: Request, res: Response) => {
    const sections = await assetModel.getSections();
    res.json(sections);
});

// Get section by ID
export const getSectionById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const section = await assetModel.getSectionById(Number(id));
    res.json(section);
});

// Create a new section
export const createSection = asyncHandler(async (req: Request, res: Response) => {
    const sectionData = req.body;
    const result = await assetModel.createSection(sectionData);
    res.status(201).json({ id: result.insertId });
});

// Update a section
export const updateSection = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const sectionData = req.body;
    await assetModel.updateSection(Number(id), sectionData);
    res.status(204).send();
});

// Delete a section
export const deleteSection = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await assetModel.deleteSection(Number(id));
    res.status(204).send();
});

// Get all units
export const getUnits = asyncHandler(async (req: Request, res: Response) => {
    const units = await assetModel.getUnits();
    res.json(units);
});

// Get unit by ID
export const getUnitById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const unit = await assetModel.getUnitById(Number(id));
    res.json(unit);
});

// Create a new unit
export const createUnit = asyncHandler(async (req: Request, res: Response) => {
    const unitData = req.body;
    const result = await assetModel.createUnit(unitData);
    res.status(201).json({ id: result.insertId });
});

// Update a unit
export const updateUnit = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const unitData = req.body;
    await assetModel.updateUnit(Number(id), unitData);
    res.status(204).send();
});

// Delete a unit
export const deleteUnit = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await assetModel.deleteUnit(Number(id));
    res.status(204).send();
});

// Get all cost centers
export const getCostCenters = asyncHandler(async (req: Request, res: Response) => {
    const costCenters = await assetModel.getCostCenters();
    res.json(costCenters);
});

// Get cost center by ID
export const getCostCenterById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const costCenter = await assetModel.getCostCenterById(Number(id));
    res.json(costCenter);
});

// Create a new cost center
export const createCostCenter = asyncHandler(async (req: Request, res: Response) => {
    const costCenterData = req.body;
    const result = await assetModel.createCostCenter(costCenterData);
    res.status(201).json({ id: result.insertId });
});

// Update a cost center
export const updateCostCenter = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const costCenterData = req.body;
    await assetModel.updateCostCenter(Number(id), costCenterData);
    res.status(204).send();
});

// Delete a cost center
export const deleteCostCenter = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await assetModel.deleteCostCenter(Number(id));
    res.status(204).send();
});

// Get all districts
export const getDistricts = asyncHandler(async (req: Request, res: Response) => {
    const districts = await assetModel.getDistricts();
    res.json(districts);
});

// Get district by ID
export const getDistrictById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const district = await assetModel.getDistrictById(Number(id));
    res.json(district);
});

// Create a new district
export const createDistrict = asyncHandler(async (req: Request, res: Response) => {
    const districtData = req.body;
    const result = await assetModel.createDistrict(districtData);
    res.status(201).json({ id: result.insertId });
});

// Update a district
export const updateDistrict = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const districtData = req.body;
    await assetModel.updateDistrict(Number(id), districtData);
    res.status(204).send();
});

// Delete a district
export const deleteDistrict = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await assetModel.deleteDistrict(Number(id));
    res.status(204).send();
});