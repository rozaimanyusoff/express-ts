import { Router } from 'express';

import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';
import invalidateAssetCache from '../utils/cacheInvalidation';
import * as assetController from './assetController';

const router = Router();

// Middleware to invalidate cache on write operations (POST, PUT, DELETE)
const cacheInvalidationMiddleware = asyncHandler(async (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function (data: any) {
      // Invalidate cache after sending response
      invalidateAssetCache().catch(err => {
        console.error('Cache invalidation failed:', err);
      });
      return originalJson.call(this, data);
    };
  }
  next();
});

router.use(cacheInvalidationMiddleware);

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

// SPEC PROPERTIES (master table)
router.get('/spec-properties', asyncHandler(assetController.getSpecProperties)); // ?type={type_id}
router.post('/spec-properties', asyncHandler(assetController.createSpecProperty));
// Trigger applying metadata to the per-type spec table (ALTER TABLE)
router.post('/spec-properties/:id/apply', asyncHandler(assetController.applySpecProperty));
// Apply all pending spec properties (optionally filter by ?type=)
router.post('/spec-properties/apply-pending', asyncHandler(assetController.applyPendingSpecProperties));
router.put('/spec-properties/:id', asyncHandler(assetController.updateSpecProperty));
router.delete('/spec-properties/:id', asyncHandler(assetController.deleteSpecProperty));

// ASSET SPECS (per-asset type-specific specs)
router.put('/specs/:asset_id', asyncHandler(assetController.updateAssetBasicSpecs));


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
// Bulk update resignation by ramco_id list
router.put('/employees/update-resign', asyncHandler(assetController.updateEmployeeResignation));
router.put('/employees/:id', asyncHandler(assetController.updateEmployee));
router.delete('/employees/:id', asyncHandler(assetController.deleteEmployee));
router.get('/employees/ramco/:ramco_id', asyncHandler(assetController.getEmployeeByRamco));
router.get('/employees/email/:email', asyncHandler(assetController.getEmployeeByEmail));
router.get('/employees/contact/:contact', asyncHandler(assetController.getEmployeeByContact));
router.get('/employees/lookup/:username', asyncHandler(assetController.getEmployeeByUsername));


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


// ASSET TRANSFER ITEMS (direct access)
router.get('/transfers/items', asyncHandler(assetController.getAssetTransferItems)); // all items
router.get('/transfers/:id/items', asyncHandler(assetController.getAssetTransferItemsByTransfer)); // items for a specific transfer (?new_owner={ramco_id} to filter by new owner)
router.get('/transfers/:transferId/items/:itemId', asyncHandler(assetController.getAssetTransferItemByTransfer)); // enriched single item within transfer
router.post('/transfers/:id/items', asyncHandler(assetController.createAssetTransferItem));
router.get('/transfer-items/:itemId', asyncHandler(assetController.getAssetTransferItem));
router.put('/transfer-items/:itemId', asyncHandler(assetController.updateAssetTransferItem));
router.delete('/transfer-items/:itemId', asyncHandler(assetController.deleteAssetTransferItem));

// ASSET TRANSFER REQUESTS
const acceptanceUploader = createUploader('assets/transfers/acceptance');
router.get('/transfers/:id', asyncHandler(assetController.getAssetTransferById));
router.get('/transfers', asyncHandler(assetController.getAssetTransfers)); // ?status=&dept=&requester=&supervisor=&hod=&from_date=&to_date=
router.post('/transfers', asyncHandler(assetController.createAssetTransfer));
router.put('/transfers/approval', asyncHandler(assetController.updateAssetTransfersApproval)); // bulk/individual approval
router.put('/transfers/:id/acceptance', acceptanceUploader.fields([
	{ name: 'attachment1', maxCount: 1 },
	{ name: 'attachment2', maxCount: 1 },
	{ name: 'attachment3', maxCount: 1 }
]), asyncHandler(assetController.setAssetTransferAcceptance)); // implement in asset-transfer-acceptance-portal
router.put('/transfers/:id', asyncHandler(assetController.updateAssetTransfer));
router.delete('/transfers/:id', asyncHandler(assetController.deleteAssetTransfer));

// RESEND APPROVAL NOTIFICATION
router.post('/transfers/:id/resend-approval-notification', asyncHandler(assetController.resendApprovalNotification));

// RESEND ACCEPTANCE NOTIFICATION
router.post('/transfers/:id/resend-acceptance-notification', asyncHandler(assetController.resendAcceptanceNotification));


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

// ASSET MANAGERS
router.get('/managers', asyncHandler(assetController.getAssetManagers));
router.get('/managers/:id', asyncHandler(assetController.getAssetManagerById));
router.post('/managers', asyncHandler(assetController.createAssetManager));
router.put('/managers/:id', asyncHandler(assetController.updateAssetManager));
router.delete('/managers/:id', asyncHandler(assetController.deleteAssetManager));

// BRAND-CATEGORY RELATIONSHIP
router.post('/brands/:brand_code/categories/:category_code', asyncHandler(assetController.assignCategoryToBrand));
router.delete('/brands/:brand_code/categories/:category_code', asyncHandler(assetController.unassignCategoryFromBrand));
router.get('/brands/:brand_code/categories', asyncHandler(assetController.getCategoriesForBrand));
router.get('/categories/:category_code/brands', asyncHandler(assetController.getBrandsForCategory));

// Get all brand-category associations (for frontend mapping)
router.get('/brand-category-mappings', asyncHandler(assetController.getAllBrandCategoryMappings));

// LOCATIONS
router.get('/locations', asyncHandler(assetController.getLocations));
router.get('/locations/:id', asyncHandler(assetController.getLocationById));
router.post('/locations', asyncHandler(assetController.createLocation));
router.put('/locations/:id', asyncHandler(assetController.updateLocation));
router.delete('/locations/:id', asyncHandler(assetController.deleteLocation));

// BY EMPLOYEE, SUPERVISOR, HOD (deprecated; use unified /api/assets with query params)

// ASSETS
router.get('/', asyncHandler(assetController.getAssets));
router.get('/:id', asyncHandler(assetController.getAssetById));

router.post('/', asyncHandler(assetController.createAsset));
// Batch register purchased assets into registry table (purchases.purchase_asset_registry)
router.post('/register-batch', asyncHandler(assetController.registerAssetsBatch));
router.put('/:id', asyncHandler(assetController.updateAsset));
// Update asset status (classification, record_status, condition_status) with audit trail
router.put('/:id/update-status', asyncHandler(assetController.updateAssetStatus));
router.delete('/:id', asyncHandler(assetController.deleteAsset));


export default router;
