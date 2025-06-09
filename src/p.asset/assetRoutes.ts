import { Router } from 'express';
import * as assetController from './assetController';
import asyncHandler from '../utils/asyncHandler';
import uploadModelImage from '../utils/uploadModelImage';

const router = Router();

// TYPES
router.get('/types', asyncHandler(assetController.getTypes));
router.get('/types/:id', asyncHandler(assetController.getTypeById));
router.post('/types', asyncHandler(assetController.createType));
router.put('/types/:id', asyncHandler(assetController.updateType));
router.delete('/types/:id', asyncHandler(assetController.deleteType));

// CATEGORIES
router.get('/categories', asyncHandler(assetController.getCategories));
router.get('/categories/:id', asyncHandler(assetController.getCategoryById));
router.post('/categories', asyncHandler(assetController.createCategory));
router.put('/categories/:id', asyncHandler(assetController.updateCategory));
router.delete('/categories/:id', asyncHandler(assetController.deleteCategory));

// BRANDS
router.get('/brands', asyncHandler(assetController.getBrands));
router.get('/brands/:id', asyncHandler(assetController.getBrandById));
router.post('/brands', asyncHandler(assetController.createBrand));
router.put('/brands/:id', asyncHandler(assetController.updateBrand));
router.delete('/brands/:id', asyncHandler(assetController.deleteBrand));

// MODELS
router.get('/models', asyncHandler(assetController.getModels));
router.get('/models/:id', asyncHandler(assetController.getModelById));
router.post('/models', uploadModelImage.single('image'), asyncHandler(assetController.createModel));
router.put('/models/:id', uploadModelImage.single('image'), asyncHandler(assetController.updateModel));
router.delete('/models/:id', asyncHandler(assetController.deleteModel));


// DEPARTMENTS
router.get('/departments', asyncHandler(assetController.getDepartments));
router.get('/departments/:id', asyncHandler(assetController.getDepartmentById));
router.post('/departments', asyncHandler(assetController.createDepartment));
router.put('/departments/:id', asyncHandler(assetController.updateDepartment));
router.delete('/departments/:id', asyncHandler(assetController.deleteDepartment));

// POSITIONS
router.get('/positions', asyncHandler(assetController.getPositions));
router.get('/positions/:id', asyncHandler(assetController.getPositionById));
router.post('/positions', asyncHandler(assetController.createPosition));
router.put('/positions/:id', asyncHandler(assetController.updatePosition));
router.delete('/positions/:id', asyncHandler(assetController.deletePosition));

// SECTIONS
router.get('/sections', asyncHandler(assetController.getSections));
router.get('/sections/:id', asyncHandler(assetController.getSectionById));
router.post('/sections', asyncHandler(assetController.createSection));
router.put('/sections/:id', asyncHandler(assetController.updateSection));
router.delete('/sections/:id', asyncHandler(assetController.deleteSection));

// COSTCENTERS
router.get('/costcenters', asyncHandler(assetController.getCostcenters));
router.get('/costcenters/:id', asyncHandler(assetController.getCostcenterById));
router.post('/costcenters', asyncHandler(assetController.createCostcenter));
router.put('/costcenters/:id', asyncHandler(assetController.updateCostcenter));
router.delete('/costcenters/:id', asyncHandler(assetController.deleteCostcenter));

// EMPLOYEES
router.get('/employees', asyncHandler(assetController.getEmployees));
router.get('/employees/:id', asyncHandler(assetController.getEmployeeById));
router.post('/employees', asyncHandler(assetController.createEmployee));
router.put('/employees/:id', asyncHandler(assetController.updateEmployee));
router.delete('/employees/:id', asyncHandler(assetController.deleteEmployee));

// DISTRICTS
router.get('/districts', asyncHandler(assetController.getDistricts));
router.get('/districts/:id', asyncHandler(assetController.getDistrictById));
router.post('/districts', asyncHandler(assetController.createDistrict));
router.put('/districts/:id', asyncHandler(assetController.updateDistrict));
router.delete('/districts/:id', asyncHandler(assetController.deleteDistrict));

// ZONES
router.get('/zones', asyncHandler(assetController.getZones));
router.get('/zones/:id', asyncHandler(assetController.getZoneById));
router.post('/zones', asyncHandler(assetController.createZone));
router.put('/zones/:id', asyncHandler(assetController.updateZone));
router.delete('/zones/:id', asyncHandler(assetController.deleteZone));

// MODULES
router.get('/modules', asyncHandler(assetController.getModules));
router.get('/modules/:id', asyncHandler(assetController.getModuleById));
router.post('/modules', asyncHandler(assetController.createModule));
router.put('/modules/:id', asyncHandler(assetController.updateModule));
router.delete('/modules/:id', asyncHandler(assetController.deleteModule));

// SITES
router.get('/sites', asyncHandler(assetController.getSites));
router.get('/sites/:id', asyncHandler(assetController.getSiteById));
router.post('/sites', asyncHandler(assetController.createSite));
router.put('/sites/:id', asyncHandler(assetController.updateSite));
router.delete('/sites/:id', asyncHandler(assetController.deleteSite));

// SOFTWARES
router.get('/softwares', asyncHandler(assetController.getSoftwares));
router.get('/softwares/:id', asyncHandler(assetController.getSoftwareById));
router.post('/softwares', asyncHandler(assetController.createSoftware));
router.put('/softwares/:id', asyncHandler(assetController.updateSoftware));
router.delete('/softwares/:id', asyncHandler(assetController.deleteSoftware));

// ASSETS
router.get('/', asyncHandler(assetController.getAssets));
router.get('/:id', asyncHandler(assetController.getAssetById));
router.post('/', asyncHandler(assetController.createAsset));
router.put('/:id', asyncHandler(assetController.updateAsset));
router.delete('/:id', asyncHandler(assetController.deleteAsset));


// BRAND-CATEGORY RELATIONSHIP
router.post('/brands/:brand_code/categories/:category_code', asyncHandler(assetController.assignCategoryToBrand));
router.delete('/brands/:brand_code/categories/:category_code', asyncHandler(assetController.unassignCategoryFromBrand));
router.get('/brands/:brand_code/categories', asyncHandler(assetController.getCategoriesForBrand));
router.get('/categories/:category_code/brands', asyncHandler(assetController.getBrandsForCategory));

// Get all brand-category associations (for frontend mapping)
router.get('/brand-category-mappings', asyncHandler(assetController.getAllBrandCategoryMappings));



export default router;
