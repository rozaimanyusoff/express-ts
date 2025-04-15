import { Router } from 'express';
import * as assetController from '../controllers/assetController.js';
import { getAllEmployees, getEmployee, addEmployee, editEmployee, removeEmployee } from '../controllers/assetController.js';

const router = Router();

// Define routes for assets

// Employee routes
router.get('/employees', getAllEmployees);
router.get('/employees/:id', getEmployee);
router.post('/employees', addEmployee);
router.put('/employees/:id', editEmployee);
router.delete('/employees/:id', removeEmployee);

// Asset type routes
router.get('/type', assetController.getTypes);
router.get('/type/:id', assetController.getAssetTypeById);
router.post('/type', assetController.createAssetType);
router.put('/type/:id', assetController.updateAssetType);
router.delete('/type/:id', assetController.deleteAssetType);

// Brand routes
router.get('/brand', assetController.getBrands);
router.get('/brand/:id', assetController.getBrandById);
router.post('/brand', assetController.createBrand);
router.put('/brand/:id', assetController.updateBrand);
router.delete('/brand/:id', assetController.deleteBrand);

// Category-brand association routes
router.get('/category-brand', assetController.getCategoryBrandAssociations);
router.get('/brand/:id/categories', assetController.getCategoriesForBrand);
router.post('/category-brand', assetController.addCategoriesToBrand);
router.post('/category-brand/single', assetController.addCategoryToBrand);
router.delete('/category-brand', assetController.removeCategoryFromBrand);
// Category-brand mapping route
router.get('/category/:categoryId/brands', assetController.getCategoryBrandMapping);
// Category routes
router.get('/category', assetController.getCategories);
router.get('/category/:id', assetController.getCategoryById);
router.post('/category', assetController.createCategory);
router.put('/category/:id', assetController.updateCategory);
router.delete('/category/:id', assetController.deleteCategory);

// Model routes
router.get('/model', assetController.getModels);
router.get('/model/:id', assetController.getModelById);
router.post('/model', assetController.createModel);
router.put('/model/:id', assetController.updateModel);
router.delete('/model/:id', assetController.deleteModel);

// Department routes
router.get('/dept', assetController.getDepartments);
router.get('/dept/:id', assetController.getDepartmentById);
router.post('/dept', assetController.createDepartment);
router.put('/dept/:id', assetController.updateDepartment);
router.delete('/dept/:id', assetController.deleteDepartment);

// Section routes
router.get('/section', assetController.getSections);
router.get('/section/:id', assetController.getSectionById);
router.post('/section', assetController.createSection);
router.put('/section/:id', assetController.updateSection);
router.delete('/section/:id', assetController.deleteSection);

// Unit routes
router.get('/unit', assetController.getUnits);
router.get('/unit/:id', assetController.getUnitById);
router.post('/unit', assetController.createUnit);
router.put('/unit/:id', assetController.updateUnit);
router.delete('/unit/:id', assetController.deleteUnit);

// Cost center routes
router.get('/costcenter', assetController.getCostCenters);
router.get('/costcenter/:id', assetController.getCostCenterById);
router.post('/costcenter', assetController.createCostCenter);
router.put('/costcenter/:id', assetController.updateCostCenter);
router.delete('/costcenter/:id', assetController.deleteCostCenter);

// District routes
router.get('/district', assetController.getDistricts);
router.get('/district/:id', assetController.getDistrictById);
router.post('/district', assetController.createDistrict);
router.put('/district/:id', assetController.updateDistrict);
router.delete('/district/:id', assetController.deleteDistrict);

// Asset routes
router.get('/:id/types', assetController.getAssetsByType);
router.get('/:id/records', assetController.getAssetRecords);
router.get('/:serial/sn', assetController.getAssetsBySerial);
router.get('/:id', assetController.getAssetsById);
router.get('/', assetController.getAssets);
router.post('/', assetController.createAsset);
router.put('/:id', assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);


export default router;
