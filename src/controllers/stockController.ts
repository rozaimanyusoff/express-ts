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
  const rows = await stockModel.getBrands();
  res.json(rows);
};
export const getBrandById = async (req: Request, res: Response) => {
  const row = await stockModel.getBrandById(Number(req.params.id));
  res.json(row);
};
export const createBrand = async (req: Request, res: Response) => {
  const result = await stockModel.createBrand(req.body);
  res.json(result);
};
export const updateBrand = async (req: Request, res: Response) => {
  const result = await stockModel.updateBrand(Number(req.params.id), req.body);
  res.json(result);
};
export const deleteBrand = async (req: Request, res: Response) => {
  const result = await stockModel.deleteBrand(Number(req.params.id));
  res.json(result);
};

// MODELS
export const getModels = async (req: Request, res: Response) => {
  const rows = await stockModel.getModels();
  res.json(rows);
};
export const getModelById = async (req: Request, res: Response) => {
  const row = await stockModel.getModelById(Number(req.params.id));
  res.json(row);
};
export const createModel = async (req: Request, res: Response) => {
  const result = await stockModel.createModel(req.body);
  res.json(result);
};
export const updateModel = async (req: Request, res: Response) => {
  const result = await stockModel.updateModel(Number(req.params.id), req.body);
  res.json(result);
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
