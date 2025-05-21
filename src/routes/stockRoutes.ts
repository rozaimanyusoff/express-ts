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

// DEPARTMENTS
router.get('/departments', asyncHandler(stockController.getDepartments));
router.get('/departments/:id', asyncHandler(stockController.getDepartmentById));
router.post('/departments', asyncHandler(stockController.createDepartment));
router.put('/departments/:id', asyncHandler(stockController.updateDepartment));
router.delete('/departments/:id', asyncHandler(stockController.deleteDepartment));

// POSITIONS
router.get('/positions', asyncHandler(stockController.getPositions));
router.get('/positions/:id', asyncHandler(stockController.getPositionById));
router.post('/positions', asyncHandler(stockController.createPosition));
router.put('/positions/:id', asyncHandler(stockController.updatePosition));
router.delete('/positions/:id', asyncHandler(stockController.deletePosition));

// SECTIONS
router.get('/sections', asyncHandler(stockController.getSections));
router.get('/sections/:id', asyncHandler(stockController.getSectionById));
router.post('/sections', asyncHandler(stockController.createSection));
router.put('/sections/:id', asyncHandler(stockController.updateSection));
router.delete('/sections/:id', asyncHandler(stockController.deleteSection));

// COSTCENTERS
router.get('/costcenters', asyncHandler(stockController.getCostcenters));
router.get('/costcenters/:id', asyncHandler(stockController.getCostcenterById));
router.post('/costcenters', asyncHandler(stockController.createCostcenter));
router.put('/costcenters/:id', asyncHandler(stockController.updateCostcenter));
router.delete('/costcenters/:id', asyncHandler(stockController.deleteCostcenter));

// EMPLOYEES
router.get('/employees', asyncHandler(stockController.getEmployees));
router.get('/employees/:id', asyncHandler(stockController.getEmployeeById));
router.post('/employees', asyncHandler(stockController.createEmployee));
router.put('/employees/:id', asyncHandler(stockController.updateEmployee));
router.delete('/employees/:id', asyncHandler(stockController.deleteEmployee));

export default router;
