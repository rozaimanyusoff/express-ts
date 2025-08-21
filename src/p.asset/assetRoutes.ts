import { Router } from 'express';
import * as assetController from './assetController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// TYPES
router.get('/types', asyncHandler(assetController.getTypes));
router.get('/types/:id', asyncHandler(assetController.getTypeById));
router.post('/types', asyncHandler(assetController.createType));
router.put('/types/:id', asyncHandler(assetController.updateType));
router.delete('/types/:id', asyncHandler(assetController.deleteType));

// CATEGORIES
router.get('/categories', asyncHandler(assetController.getCategories)); // ?type={type_id1,type_id2}
router.get('/categories/:id', asyncHandler(assetController.getCategoryById));
router.post('/categories', asyncHandler(assetController.createCategory));
router.put('/categories/:id', asyncHandler(assetController.updateCategory));
router.delete('/categories/:id', asyncHandler(assetController.deleteCategory));

// BRANDS
router.get('/brands', asyncHandler(assetController.getBrands)); // ?type={type_id}&categories={category_id1,category_id2}
router.get('/brands/:id', asyncHandler(assetController.getBrandById));
router.post('/brands', asyncHandler(assetController.createBrand));
router.put('/brands/:id', asyncHandler(assetController.updateBrand));
router.delete('/brands/:id', asyncHandler(assetController.deleteBrand));

// MODELS
router.get('/models', asyncHandler(assetController.getModels)); // ?type={type_id}&brand={brand_id1,brand_id2}
router.get('/models/:id', asyncHandler(assetController.getModelById));
router.post('/models', asyncHandler(assetController.createModel));
router.put('/models/:id', asyncHandler(assetController.updateModel));
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
router.get('/employees/search', asyncHandler(assetController.searchEmployees));
router.get('/employees/:id', asyncHandler(assetController.getEmployeeById));
router.get('/employees', asyncHandler(assetController.getEmployees));
router.post('/employees', asyncHandler(assetController.createEmployee));
router.put('/employees/:id', asyncHandler(assetController.updateEmployee));
router.delete('/employees/:id', asyncHandler(assetController.deleteEmployee));
router.get('/employees/ramco/:ramco_id', asyncHandler(assetController.getEmployeeByRamco));
router.get('/employees/email/:email', asyncHandler(assetController.getEmployeeByEmail));
router.get('/employees/contact/:contact', asyncHandler(assetController.getEmployeeByContact));
router.get('/employees/lookup/:username', asyncHandler(assetController.getEmployeeByUsername));

/* LOCATIONS */
router.get('/locations', asyncHandler(assetController.getLocations));


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

// BY EMPLOYEE, SUPERVISOR, HOD
router.get('/by-employee', asyncHandler(assetController.getAssetsByEmployee));
router.get('/by-supervisor', asyncHandler(assetController.getAssetsBySupervisor));
router.get('/by-hod', asyncHandler(assetController.getAssetsByHOD));


// ASSET TRANSFER REQUESTS
router.get('/transfer-requests', asyncHandler(assetController.getAssetTransferRequests));
router.get('/transfer-requests/:id', asyncHandler(assetController.getAssetTransferRequestById));
router.post('/transfer-requests', asyncHandler(assetController.createAssetTransfer));
router.put('/transfer-requests/:id', asyncHandler(assetController.updateAssetTransfer));
router.delete('/transfer-requests/:id', asyncHandler(assetController.deleteAssetTransfer));

// ASSET TRANSFER APPROVAL (for supervisor approve/reject buttons)
router.post('/transfer-requests/:id/approval', asyncHandler(assetController.updateAssetTransferApprovalStatusById));

// EMAIL APPROVAL/REJECTION LINKS
router.get('/asset-transfer/approve', asyncHandler(assetController.approveAssetTransferByEmail));
router.get('/asset-transfer/reject', asyncHandler(assetController.rejectAssetTransferByEmail));

// TRANSFER CHECKLIST
router.get('/transfer-checklist', asyncHandler(assetController.getTransferChecklist));
router.get('/transfer-checklist/:id', asyncHandler(assetController.getTransferChecklistById));
router.post('/transfer-checklist', asyncHandler(assetController.createTransferChecklist));
router.put('/transfer-checklist/:id', asyncHandler(assetController.updateTransferChecklist));
router.delete('/transfer-checklist/:id', asyncHandler(assetController.deleteTransferChecklist));


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
