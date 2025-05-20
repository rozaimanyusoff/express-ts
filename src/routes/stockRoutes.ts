import { Router } from 'express';
import * as stockController from '../controllers/stockController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// TYPES
router.get('/types', asyncHandler(stockController.getTypes));
router.get('/types/:id', asyncHandler(stockController.getTypeById));
router.post('/types', asyncHandler(stockController.createType));
router.put('/types/:id', asyncHandler(stockController.updateType));
router.delete('/types/:id', asyncHandler(stockController.deleteType));

// CATEGORIES
router.get('/categories', asyncHandler(stockController.getCategories));
router.get('/categories/:id', asyncHandler(stockController.getCategoryById));
router.post('/categories', asyncHandler(stockController.createCategory));
router.put('/categories/:id', asyncHandler(stockController.updateCategory));
router.delete('/categories/:id', asyncHandler(stockController.deleteCategory));

// BRANDS
router.get('/brands', asyncHandler(stockController.getBrands));
router.get('/brands/:id', asyncHandler(stockController.getBrandById));
router.post('/brands', asyncHandler(stockController.createBrand));
router.put('/brands/:id', asyncHandler(stockController.updateBrand));
router.delete('/brands/:id', asyncHandler(stockController.deleteBrand));

// MODELS
router.get('/models', asyncHandler(stockController.getModels));
router.get('/models/:id', asyncHandler(stockController.getModelById));
router.post('/models', asyncHandler(stockController.createModel));
router.put('/models/:id', asyncHandler(stockController.updateModel));
router.delete('/models/:id', asyncHandler(stockController.deleteModel));

// ASSETS
router.get('/assets', asyncHandler(stockController.getAssets));
router.get('/assets/:id', asyncHandler(stockController.getAssetById));
router.post('/assets', asyncHandler(stockController.createAsset));
router.put('/assets/:id', asyncHandler(stockController.updateAsset));
router.delete('/assets/:id', asyncHandler(stockController.deleteAsset));

export default router;
