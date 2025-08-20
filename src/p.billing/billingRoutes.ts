
// src/p.billing/billingRoutes.ts
import { Router } from 'express';
import * as billingController from './billingController';
import uploadModelImage from '../utils/uploadModelImage';
import { getUploader, validateUploadedFile } from '../utils/fileUploader';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// ========== TEMP VEHICLE RECORD TABLE (assets.vehicle) CRUD ==========
router.get('/temp-vehicle', asyncHandler(billingController.getTempVehicleRecords));
router.get('/temp-vehicle/:id', asyncHandler(billingController.getTempVehicleRecordById));
router.post('/temp-vehicle', asyncHandler(billingController.createTempVehicleRecord));
router.put('/temp-vehicle/:id', asyncHandler(billingController.updateTempVehicleRecord));
router.delete('/temp-vehicle/:id', asyncHandler(billingController.deleteTempVehicleRecord));

/* ================== VEHICLE MAINTENANCE BILLINGS ================== */

router.get('/mtn/summary/vehicle', asyncHandler(billingController.getVehicleMtnBillingByVehicleSummary)); // /api/bills/vehicle/summary/vehicle?from=YYYY-MM-DD&to=YYYY-MM-DD&cc={costcenter_id} -- EXCEL GENERATED REPORT
router.get('/mtn/summary/filter', asyncHandler(billingController.getVehicleMtnBillingByDate)); // /api/bills/vehicle/filter?from=2024-01-01&to=2024-12-31 -- EXCEL GENERATED REPORT
router.get('/mtn/:id', asyncHandler(billingController.getVehicleMtnBillingById));
router.get('/mtn', asyncHandler(billingController.getVehicleMtnBillings));

//router.post('/vehicle', asyncHandler(billingController.createVehicleMtnBilling)); //UNUSED
router.put('/mtn/vehicle/:id', asyncHandler(billingController.updateVehicleMtnBilling));
//router.delete('/vehicle/:id', asyncHandler(billingController.deleteVehicleMtnBilling)); //NO DATA DELETE ALLOWED
// Maintenance lookup by asset id
router.get('/mtn/vehicle/:asset_id', asyncHandler(billingController.getVehicleMaintenanceByAsset));

/* =================== WORKSHOP ======================= */
router.get('/workshops', asyncHandler(billingController.getWorkshops));
router.get('/workshops/:id', asyncHandler(billingController.getWorkshopById));
router.post('/workshops', asyncHandler(billingController.createWorkshop));
router.put('/workshops/:id', asyncHandler(billingController.updateWorkshop));
router.delete('/workshops/:id', asyncHandler(billingController.deleteWorkshop));

/* =================== FUEL VENDOR ======================== */

router.get('/fuel/vendor', asyncHandler(billingController.getFuelVendors)); // /api/bills/fuel/issuer
router.get('/fuel/vendor/:id', asyncHandler(billingController.getFuelVendorById));
router.post('/fuel/vendor', asyncHandler(billingController.createFuelVendor));
router.put('/fuel/vendor/:id', asyncHandler(billingController.updateFuelVendor));

/* =================== FUEL BILLING ======================== */

router.get('/fuel/summary/vehicle', asyncHandler(billingController.getFuelBillingVehicleSummary)); // /api/bills/fuel/summary/vehicle?from=YYYY-MM-DD&to=YYYY-MM-DD&cc={costcenter_id}
router.get('/fuel/summary/costcenter', asyncHandler(billingController.getFuelBillingCostcenterSummary)); /* /api/bills/fuel/summary/costcenter?from=2024-01-01&to=2024-12-31 */
router.get('/fuel/:id', asyncHandler(billingController.getFuelBillingById));
router.get('/fuel/vehicle/:asset_id', asyncHandler(billingController.getFuelConsumptionByVehicle));
router.get('/fuel', asyncHandler(billingController.getFuelBillings));
router.post('/fuel', asyncHandler(billingController.createFuelBilling));
router.put('/fuel/:id', asyncHandler(billingController.updateFuelBilling));

/* =================== FLEET CARD TABLE ========================== */
router.get('/fleet/asset/:asset_id', asyncHandler(billingController.getFleetCardsByAssetId));
router.get('/fleet/asset', asyncHandler(billingController.getFleetCardsByAssets));
router.get('/fleet', asyncHandler(billingController.getFleetCards)); // /api/bills/fleet/card
router.get('/fleet/:id', asyncHandler(billingController.getFleetCardById));
router.get('/fleet/:id/issuer', asyncHandler(billingController.getFleetCardByIssuer)); // /api/bills/fleet/:id/issuer - obtain data by issuer [Petronas, Shell, etc.]

router.post('/fleet', asyncHandler(billingController.createFleetCard));
router.put('/fleet/:id', asyncHandler(billingController.updateFleetCard));
router.put('/fleet/:id/billing', asyncHandler(billingController.updateFleetCardFromBilling)); // update fleet card from billing

/* =================== SERVICE OPTION TABLE ========================== */
router.get('/service/options', asyncHandler(billingController.getServiceOptions)); // /api/bills/service/options
router.get('/service/options/:id', asyncHandler(billingController.getServiceOptionById));
router.post('/service/options', asyncHandler(billingController.createServiceOption));
router.put('/service/options/:id', asyncHandler(billingController.updateServiceOption));

// =================== BILLING ACCOUNT TABLE ROUTES ===================
router.get('/util/accounts/:id', asyncHandler(billingController.getBillingAccountById));
router.get('/util/accounts', asyncHandler(billingController.getBillingAccounts));
router.post('/util/accounts', asyncHandler(billingController.createBillingAccount));
router.put('/util/accounts/:id', asyncHandler(billingController.updateBillingAccount));
router.delete('/util/accounts/:id', asyncHandler(billingController.deleteBillingAccount));

// =================== BENEFICIARY (BILLING PROVIDERS) ROUTES ===================
router.get('/util/beneficiaries/:id', asyncHandler(billingController.getBeneficiaryById));
router.get('/util/beneficiaries', asyncHandler(billingController.getBeneficiaries));
const vendorUploader = getUploader('logo', { maxSize: 3 * 1024 * 1024 });
router.post('/util/beneficiaries', vendorUploader.single('bfcy_logo'), validateUploadedFile(), asyncHandler(billingController.createBeneficiary));
router.put('/util/beneficiaries/:id', vendorUploader.single('bfcy_logo'), validateUploadedFile(), asyncHandler(billingController.updateBeneficiary));
router.delete('/util/beneficiaries/:id', asyncHandler(billingController.deleteBeneficiary));

// =================== UTILITIES TABLE ROUTES ===================
router.get('/util/summary/costcenter', asyncHandler(billingController.getUtilityBillingCostcenterSummary)); // /api/bills/util/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&cc={costcenter_id}
// Utility billing service summary
router.get('/util/summary/service', asyncHandler(billingController.getUtilityBillingServiceSummary)); // /api/bills/util/summary/service?costcenter=ID&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/util/:id', asyncHandler(billingController.getUtilityBillById));
router.get('/util', asyncHandler(billingController.getUtilityBills));
router.post('/util', asyncHandler(billingController.createUtilityBill));
router.put('/util/:id', asyncHandler(billingController.updateUtilityBill));
router.delete('/util/:id', asyncHandler(billingController.deleteUtilityBill));


export default router;
