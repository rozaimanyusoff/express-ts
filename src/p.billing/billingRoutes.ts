
// src/p.billing/billingRoutes.ts
import { Router } from 'express';

import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';
import * as billingController from './billingController';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Billing Temp Vehicle
 *     description: Temporary vehicle record management
 *   - name: Billing Mtn Options
 *     description: Vehicle maintenance service options
 *   - name: Billing Mtn Parts
 *     description: Vehicle maintenance auto parts
 *   - name: Billing Mtn
 *     description: Vehicle maintenance billing records
 *   - name: Billing Workshops
 *     description: Workshop management
 *   - name: Billing Fuel Vendor
 *     description: Fuel vendor management
 *   - name: Billing Fuel
 *     description: Fuel billing records
 *   - name: Billing Fleet Cards
 *     description: Fleet card management
 *   - name: Billing Accounts
 *     description: Billing account management
 *   - name: Billing Beneficiaries
 *     description: Billing provider / beneficiary management
 *   - name: Billing Utilities
 *     description: Utility billing records
 */

const logoUploader = createUploader('images/logo');
const utilUploader = createUploader('billings/utilities');
const mtnUploader = createUploader('billings/maintenance');

// ========== TEMP VEHICLE RECORD TABLE (assets.vehicle) CRUD ==========

/**
 * @swagger
 * /bills/temp-vehicle:
 *   get:
 *     summary: Get all temporary vehicle records
 *     tags: [Billing Temp Vehicle]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of temp vehicle records
 */
router.get('/temp-vehicle', asyncHandler(billingController.getTempVehicleRecords));

/**
 * @swagger
 * /bills/temp-vehicle/{id}:
 *   get:
 *     summary: Get temp vehicle record by ID
 *     tags: [Billing Temp Vehicle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Temp vehicle record object
 */
router.get('/temp-vehicle/:id', asyncHandler(billingController.getTempVehicleRecordById));

/**
 * @swagger
 * /bills/temp-vehicle:
 *   post:
 *     summary: Create a temp vehicle record
 *     tags: [Billing Temp Vehicle]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Temp vehicle record created
 */
router.post('/temp-vehicle', asyncHandler(billingController.createTempVehicleRecord));

/**
 * @swagger
 * /bills/temp-vehicle/{id}:
 *   put:
 *     summary: Update a temp vehicle record
 *     tags: [Billing Temp Vehicle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Temp vehicle record updated
 */
router.put('/temp-vehicle/:id', asyncHandler(billingController.updateTempVehicleRecord));

/**
 * @swagger
 * /bills/temp-vehicle/{id}:
 *   delete:
 *     summary: Delete a temp vehicle record
 *     tags: [Billing Temp Vehicle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Temp vehicle record deleted
 */
router.delete('/temp-vehicle/:id', asyncHandler(billingController.deleteTempVehicleRecord));

/* =================== SERVICE OPTION TABLE ========================== */

/**
 * @swagger
 * /bills/mtn/options:
 *   get:
 *     summary: Get all vehicle maintenance service options
 *     tags: [Billing Mtn Options]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of service options
 */
router.get('/mtn/options', asyncHandler(billingController.getServiceOptions)); // /api/bills/service/options

/**
 * @swagger
 * /bills/mtn/options/{id}:
 *   get:
 *     summary: Get service option by ID
 *     tags: [Billing Mtn Options]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Service option object
 */
router.get('/mtn/options/:id', asyncHandler(billingController.getServiceOptionById));

/**
 * @swagger
 * /bills/mtn/options:
 *   post:
 *     summary: Create a service option
 *     tags: [Billing Mtn Options]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Service option created
 */
router.post('/mtn/options', asyncHandler(billingController.createServiceOption));

/**
 * @swagger
 * /bills/mtn/options/{id}:
 *   put:
 *     summary: Update a service option
 *     tags: [Billing Mtn Options]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Service option updated
 */
router.put('/mtn/options/:id', asyncHandler(billingController.updateServiceOption));

/* =================== SERVICE PARTS (autoparts) ROUTES =================== */

/**
 * @swagger
 * /bills/mtn/parts:
 *   get:
 *     summary: Get all service parts (auto parts)
 *     tags: [Billing Mtn Parts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of service parts
 */
router.get('/mtn/parts', asyncHandler(billingController.getServiceParts));

/**
 * @swagger
 * /bills/mtn/parts/search:
 *   get:
 *     summary: Search service parts
 *     tags: [Billing Mtn Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Matching service parts
 */
router.get('/mtn/parts/search', asyncHandler(billingController.searchServiceParts));

/**
 * @swagger
 * /bills/mtn/parts/{id}:
 *   get:
 *     summary: Get service part by ID
 *     tags: [Billing Mtn Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Service part object
 */
router.get('/mtn/parts/:id', asyncHandler(billingController.getServicePartById));

/**
 * @swagger
 * /bills/mtn/parts:
 *   post:
 *     summary: Create a service part
 *     tags: [Billing Mtn Parts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Service part created
 */
router.post('/mtn/parts', asyncHandler(billingController.createServicePart));

/**
 * @swagger
 * /bills/mtn/parts/{id}:
 *   put:
 *     summary: Update a service part
 *     tags: [Billing Mtn Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Service part updated
 */
router.put('/mtn/parts/:id', asyncHandler(billingController.updateServicePart));

/**
 * @swagger
 * /bills/mtn/parts/{id}:
 *   delete:
 *     summary: Delete a service part
 *     tags: [Billing Mtn Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Service part deleted
 */
router.delete('/mtn/parts/:id', asyncHandler(billingController.deleteServicePart));

/* ================== VEHICLE MAINTENANCE BILLINGS ================== */

/**
 * @swagger
 * /bills/mtn/inv:
 *   get:
 *     summary: Get vehicle maintenance billings filtered by inv_date
 *     tags: [Billing Mtn]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of maintenance billings
 */
// Same list endpoint but filters by inv_date instead of entry_date
router.get('/mtn/inv', asyncHandler(billingController.getVehicleMtnBillingsInv));

/**
 * @swagger
 * /bills/mtn/summary/vehicle:
 *   get:
 *     summary: Vehicle maintenance billing summary by vehicle (Excel report)
 *     tags: [Billing Mtn]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: cc
 *         schema:
 *           type: integer
 *         description: Cost center ID
 *     responses:
 *       200:
 *         description: Vehicle maintenance summary
 */
router.get('/mtn/summary/vehicle', asyncHandler(billingController.getVehicleMtnBillingByVehicleSummary)); // /api/bills/vehicle/summary/vehicle?from=YYYY-MM-DD&to=YYYY-MM-DD&cc={costcenter_id} -- EXCEL GENERATED REPORT

/**
 * @swagger
 * /bills/mtn/summary/filter:
 *   get:
 *     summary: Vehicle maintenance billing summary by date range (Excel report)
 *     tags: [Billing Mtn]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Maintenance billing filter report
 */
router.get('/mtn/summary/filter', asyncHandler(billingController.getVehicleMtnBillingByDate)); // /api/bills/vehicle/filter?from=2024-01-01&to=2024-12-31 -- EXCEL GENERATED REPORT

/**
 * @swagger
 * /bills/mtn/request/{svc_order}:
 *   get:
 *     summary: Find maintenance billings by service order (request ID)
 *     tags: [Billing Mtn]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: svc_order
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Maintenance billings for the service order
 */
// Find maintenance billings by request id (svc_order)
router.get('/mtn/request/:svc_order', asyncHandler(billingController.getVehicleMtnBillingByRequestId));

/**
 * @swagger
 * /bills/mtn/{id}:
 *   get:
 *     summary: Get vehicle maintenance billing by ID
 *     tags: [Billing Mtn]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Maintenance billing object
 */
router.get('/mtn/:id', asyncHandler(billingController.getVehicleMtnBillingById)); // use on invoicing memo

/**
 * @swagger
 * /bills/mtn:
 *   get:
 *     summary: Get all vehicle maintenance billings
 *     tags: [Billing Mtn]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of maintenance billings
 */
router.get('/mtn', asyncHandler(billingController.getVehicleMtnBillings));

/**
 * @swagger
 * /bills/mtn:
 *   post:
 *     summary: Get multiple maintenance billings by IDs (bulk, without parts)
 *     tags: [Billing Mtn]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: List of maintenance billings for given IDs
 */
// POST /api/bills/mtn/ - Get multiple maintenance billings by IDs without parts - use on invoicing memo (bulk)
router.post('/mtn', asyncHandler(billingController.getVehicleMtnBillingsByIds));


/**
 * @swagger
 * /bills/mtn/check-invno:
 *   get:
 *     summary: Check if an invoice number exists for maintenance billings
 *     tags: [Billing Mtn]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: inv_no
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Existence check result
 */
// Check invoice number existence for maintenance billings
router.get('/mtn/check-invno', asyncHandler(billingController.checkVehicleMtnInvNo));

/**
 * @swagger
 * /bills/mtn/{id}:
 *   put:
 *     summary: Update a vehicle maintenance billing (with optional file attachment)
 *     tags: [Billing Mtn]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               attachment:
 *                 type: string
 *                 format: binary
 *               upload:
 *                 type: string
 *                 format: binary
 *                 description: Legacy field name (alias for attachment)
 *     responses:
 *       200:
 *         description: Maintenance billing updated
 */
// Accept file under either 'attachment' (preferred) or 'upload' (legacy/frontend variant)
router.put(
	'/mtn/:id',
	mtnUploader.fields([
		{ maxCount: 1, name: 'attachment' },
		{ maxCount: 1, name: 'upload' }
	]),
	asyncHandler(billingController.updateVehicleMtnBilling)
);
//router.delete('/vehicle/:id', asyncHandler(billingController.deleteVehicleMtnBilling)); //NO DATA DELETE ALLOWED

/**
 * @swagger
 * /bills/mtn/vehicle/{asset_id}:
 *   get:
 *     summary: Get vehicle maintenance records by asset ID
 *     tags: [Billing Mtn]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: asset_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Maintenance records for the asset
 */
// Maintenance lookup by asset id
router.get('/mtn/vehicle/:asset_id', asyncHandler(billingController.getVehicleMaintenanceByAsset));


/* =================== WORKSHOP ======================= */

/**
 * @swagger
 * /bills/workshops:
 *   get:
 *     summary: Get all workshops
 *     tags: [Billing Workshops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workshops
 */
router.get('/workshops', asyncHandler(billingController.getWorkshops));

/**
 * @swagger
 * /bills/workshops/{id}:
 *   get:
 *     summary: Get workshop by ID
 *     tags: [Billing Workshops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workshop object
 */
router.get('/workshops/:id', asyncHandler(billingController.getWorkshopById));

/**
 * @swagger
 * /bills/workshops:
 *   post:
 *     summary: Create a workshop
 *     tags: [Billing Workshops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Workshop created
 */
router.post('/workshops', asyncHandler(billingController.createWorkshop));

/**
 * @swagger
 * /bills/workshops/{id}:
 *   put:
 *     summary: Update a workshop
 *     tags: [Billing Workshops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Workshop updated
 */
router.put('/workshops/:id', asyncHandler(billingController.updateWorkshop));

/**
 * @swagger
 * /bills/workshops/{id}:
 *   delete:
 *     summary: Delete a workshop
 *     tags: [Billing Workshops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workshop deleted
 */
router.delete('/workshops/:id', asyncHandler(billingController.deleteWorkshop));

/* =================== FUEL VENDOR ======================== */

/**
 * @swagger
 * /bills/fuel/vendor:
 *   get:
 *     summary: Get all fuel vendors
 *     tags: [Billing Fuel Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of fuel vendors
 */
router.get('/fuel/vendor', asyncHandler(billingController.getFuelVendors)); // /api/bills/fuel/issuer

/**
 * @swagger
 * /bills/fuel/vendor/{id}:
 *   get:
 *     summary: Get fuel vendor by ID
 *     tags: [Billing Fuel Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fuel vendor object
 */
router.get('/fuel/vendor/:id', asyncHandler(billingController.getFuelVendorById));

/**
 * @swagger
 * /bills/fuel/vendor:
 *   post:
 *     summary: Create a fuel vendor
 *     tags: [Billing Fuel Vendor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Fuel vendor created
 */
router.post('/fuel/vendor', asyncHandler(billingController.createFuelVendor));

/**
 * @swagger
 * /bills/fuel/vendor/{id}:
 *   put:
 *     summary: Update a fuel vendor
 *     tags: [Billing Fuel Vendor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Fuel vendor updated
 */
router.put('/fuel/vendor/:id', asyncHandler(billingController.updateFuelVendor));

/* =================== FUEL BILLING ======================== */

/**
 * @swagger
 * /bills/fuel/summary/vehicle:
 *   get:
 *     summary: Fuel billing summary by vehicle
 *     tags: [Billing Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: cc
 *         schema:
 *           type: integer
 *         description: Cost center ID
 *     responses:
 *       200:
 *         description: Fuel billing vehicle summary
 */
router.get('/fuel/summary/vehicle', asyncHandler(billingController.getFuelBillingVehicleSummary)); // /api/bills/fuel/summary/vehicle?from=YYYY-MM-DD&to=YYYY-MM-DD&cc={costcenter_id}

/**
 * @swagger
 * /bills/fuel/summary/costcenter:
 *   get:
 *     summary: Fuel billing summary by cost center
 *     tags: [Billing Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Fuel billing cost center summary
 */
router.get('/fuel/summary/costcenter', asyncHandler(billingController.getFuelBillingCostcenterSummary)); /* /api/bills/fuel/summary/costcenter?from=2024-01-01&to=2024-12-31 */

/**
 * @swagger
 * /bills/fuel/{id}:
 *   get:
 *     summary: Get fuel billing by ID
 *     tags: [Billing Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fuel billing object
 */
router.get('/fuel/:id', asyncHandler(billingController.getFuelBillingById));

/**
 * @swagger
 * /bills/fuel/vehicle/{asset_id}:
 *   get:
 *     summary: Get fuel consumption records by vehicle (asset ID)
 *     tags: [Billing Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: asset_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fuel consumption records for the vehicle
 */
// Remove a single bill entry from fuel statement detail by s_id
router.get('/fuel/vehicle/:asset_id', asyncHandler(billingController.getFuelConsumptionByVehicle));

/**
 * @swagger
 * /bills/fuel:
 *   get:
 *     summary: Get all fuel billings
 *     tags: [Billing Fuel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of fuel billings
 */
router.get('/fuel', asyncHandler(billingController.getFuelBillings));

/**
 * @swagger
 * /bills/fuel/{id}/new-bill-entry:
 *   post:
 *     summary: Insert a new bill entry into fuel consumer details
 *     tags: [Billing Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Bill entry added
 */
// Insert a new bill entry into consumer details
router.post('/fuel/:id/new-bill-entry', asyncHandler(billingController.createFuelNewBillEntry));

/**
 * @swagger
 * /bills/fuel:
 *   post:
 *     summary: Create a new fuel billing record
 *     tags: [Billing Fuel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Fuel billing created
 */
router.post('/fuel', asyncHandler(billingController.createFuelBilling));

/**
 * @swagger
 * /bills/fuel/{id}:
 *   put:
 *     summary: Update a fuel billing record
 *     tags: [Billing Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Fuel billing updated
 */
router.put('/fuel/:id', asyncHandler(billingController.updateFuelBilling));

/**
 * @swagger
 * /bills/fuel/{id}/remove-bill-entry:
 *   delete:
 *     summary: Remove a bill entry from consumer details
 *     tags: [Billing Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bill entry removed
 */
// Remove a bill entry from consumer details
router.delete('/fuel/:id/remove-bill-entry', asyncHandler(billingController.removeFuelBillEntry));

/**
 * @swagger
 * /bills/fuel/{id}:
 *   delete:
 *     summary: Delete a fuel billing record
 *     tags: [Billing Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fuel billing deleted
 */
router.delete('/fuel/:id', asyncHandler(billingController.deleteFuelBilling));

/* =================== FLEET CARD TABLE ========================== */

/**
 * @swagger
 * /bills/fleet/asset/{asset_id}:
 *   get:
 *     summary: Get fleet cards by asset ID
 *     tags: [Billing Fleet Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: asset_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fleet cards for the asset
 */
router.get('/fleet/asset/:asset_id', asyncHandler(billingController.getFleetCardsByAssetId));

/**
 * @swagger
 * /bills/fleet/asset:
 *   get:
 *     summary: Get fleet cards grouped by assets
 *     tags: [Billing Fleet Cards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fleet cards by assets
 */
router.get('/fleet/asset', asyncHandler(billingController.getFleetCardsByAssets));

/**
 * @swagger
 * /bills/fleet:
 *   get:
 *     summary: Get all fleet cards
 *     tags: [Billing Fleet Cards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of fleet cards
 */
router.get('/fleet', asyncHandler(billingController.getFleetCards)); // /api/bills/fleet/card

/**
 * @swagger
 * /bills/fleet/{id}:
 *   get:
 *     summary: Get fleet card by ID
 *     tags: [Billing Fleet Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fleet card object
 */
router.get('/fleet/:id', asyncHandler(billingController.getFleetCardById));

/**
 * @swagger
 * /bills/fleet/{id}/issuer:
 *   get:
 *     summary: Get fleet card data by issuer
 *     tags: [Billing Fleet Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Issuer ID (e.g. Petronas, Shell)
 *     responses:
 *       200:
 *         description: Fleet card by issuer
 */
router.get('/fleet/:id/issuer', asyncHandler(billingController.getFleetCardByIssuer)); // /api/bills/fleet/:id/issuer - obtain data by issuer [Petronas, Shell, etc.]

/**
 * @swagger
 * /bills/fleet/card/{card_no}:
 *   get:
 *     summary: Get fleet card by card number
 *     tags: [Billing Fleet Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: card_no
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fleet card object
 */
router.get('/fleet/card/:card_no', asyncHandler(billingController.getFleetCardByCardNo)); // /api/bills/fleet/card/:card_no - obtain data by card number

/**
 * @swagger
 * /bills/fleet/register/{register_number}:
 *   get:
 *     summary: Get fleet card by register number
 *     tags: [Billing Fleet Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: register_number
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fleet card object
 */
router.get('/fleet/register/:register_number', asyncHandler(billingController.getFleetCardByRegisterNumber)); // /api/bills/fleet/register/:register_number - obtain data by register number

/**
 * @swagger
 * /bills/fleet:
 *   post:
 *     summary: Create a fleet card
 *     tags: [Billing Fleet Cards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Fleet card created
 */
router.post('/fleet', asyncHandler(billingController.createFleetCard));

/**
 * @swagger
 * /bills/fleet/{id}:
 *   put:
 *     summary: Update a fleet card
 *     tags: [Billing Fleet Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Fleet card updated
 */
router.put('/fleet/:id', asyncHandler(billingController.updateFleetCard));

/**
 * @swagger
 * /bills/fleet/{id}/billing:
 *   put:
 *     summary: Update fleet card details from billing
 *     tags: [Billing Fleet Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Fleet card billing details updated
 */
router.put('/fleet/:id/billing', asyncHandler(billingController.updateFleetCardFromBilling)); // update fleet card details from billing


// =================== BILLING ACCOUNT TABLE ROUTES ===================

/**
 * @swagger
 * /bills/util/accounts/{id}:
 *   get:
 *     summary: Get billing account by ID
 *     tags: [Billing Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Billing account object
 */
router.get('/util/accounts/:id', asyncHandler(billingController.getBillingAccountById));

/**
 * @swagger
 * /bills/util/accounts:
 *   get:
 *     summary: Get all billing accounts
 *     tags: [Billing Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of billing accounts
 */
router.get('/util/accounts', asyncHandler(billingController.getBillingAccounts));

/**
 * @swagger
 * /bills/util/accounts:
 *   post:
 *     summary: Create a billing account
 *     tags: [Billing Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Billing account created
 */
router.post('/util/accounts', asyncHandler(billingController.createBillingAccount));

/**
 * @swagger
 * /bills/util/accounts/{id}:
 *   put:
 *     summary: Update a billing account
 *     tags: [Billing Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Billing account updated
 */
router.put('/util/accounts/:id', asyncHandler(billingController.updateBillingAccount));

/**
 * @swagger
 * /bills/util/accounts/{id}:
 *   delete:
 *     summary: Delete a billing account
 *     tags: [Billing Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Billing account deleted
 */
router.delete('/util/accounts/:id', asyncHandler(billingController.deleteBillingAccount));

// =================== BENEFICIARY (BILLING PROVIDERS) ROUTES ===================

/**
 * @swagger
 * /bills/util/beneficiaries/{id}:
 *   get:
 *     summary: Get beneficiary by ID
 *     tags: [Billing Beneficiaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Beneficiary object
 */
router.get('/util/beneficiaries/:id', asyncHandler(billingController.getBeneficiaryById));

/**
 * @swagger
 * /bills/util/beneficiaries:
 *   get:
 *     summary: Get all beneficiaries (billing providers)
 *     tags: [Billing Beneficiaries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of beneficiaries
 */
router.get('/util/beneficiaries', asyncHandler(billingController.getBeneficiaries));

/**
 * @swagger
 * /bills/util/beneficiaries:
 *   post:
 *     summary: Create a beneficiary with optional logo upload
 *     tags: [Billing Beneficiaries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Beneficiary created
 */
// store vendor logos under /uploads/vendor_logo by default
router.post('/util/beneficiaries', logoUploader.single('logo'), asyncHandler(billingController.createBeneficiary));

/**
 * @swagger
 * /bills/util/beneficiaries/{id}:
 *   put:
 *     summary: Update a beneficiary with optional logo upload
 *     tags: [Billing Beneficiaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Beneficiary updated
 */
router.put('/util/beneficiaries/:id', logoUploader.single('logo'), asyncHandler(billingController.updateBeneficiary));

/**
 * @swagger
 * /bills/util/beneficiaries/{id}:
 *   delete:
 *     summary: Delete a beneficiary
 *     tags: [Billing Beneficiaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Beneficiary deleted
 */
router.delete('/util/beneficiaries/:id', asyncHandler(billingController.deleteBeneficiary));

// =================== UTILITIES TABLE ROUTES ===================

/**
 * @swagger
 * /bills/util/summary/costcenter:
 *   get:
 *     summary: Get utility billing summary by cost center
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: cc
 *         schema:
 *           type: integer
 *         description: Cost center ID
 *     responses:
 *       200:
 *         description: Utility billing cost center summary
 */
router.get('/util/summary/costcenter', asyncHandler(billingController.getUtilityBillingCostcenterSummary)); // /api/bills/util/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&cc={costcenter_id}

/**
 * @swagger
 * /bills/util/summary/service:
 *   get:
 *     summary: Get utility billing service summary
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: costcenter
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Utility billing service summary
 */
// Utility billing service summary
router.get('/util/summary/service', asyncHandler(billingController.getUtilityBillingServiceSummary)); // /api/bills/util/summary/service?costcenter=ID&from=YYYY-MM-DD&to=YYYY-MM-DD

/**
 * @swagger
 * /bills/util/by-ids:
 *   post:
 *     summary: Fetch utility bills by array of IDs with optional service filter
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *         description: Comma-separated service values
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Utility bills for given IDs
 */
// fetch select utility bills by array of util_id values: /api/bills/util/by-ids?util_id[]=1&util_id[]=2 or /api/bills/util/by-ids?ids=1,2
// POST variant with service filter (no beneficiary constraint): /api/bills/util/by-ids?service=a,b
router.post('/util/by-ids', asyncHandler(billingController.postUtilityBillsByIdsByService));

/**
 * @swagger
 * /bills/util/by-ids/{beneficiaryId}:
 *   post:
 *     summary: Fetch utility bills by IDs for a specific beneficiary
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: beneficiaryId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Utility bills for the beneficiary
 */
router.post('/util/by-ids/:beneficiaryId', asyncHandler(billingController.postUtilityBillsByIds));

/**
 * @swagger
 * /bills/util/printing:
 *   get:
 *     summary: Get printing utility bills (billing account category = printing)
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Printing bills
 */
// Utility printing bills (filter by billing account category = 'printing')
router.get('/util/printing', asyncHandler(billingController.getPrintingBills));

/**
 * @swagger
 * /bills/util/printing/by-ids/{beneficiaryId}:
 *   post:
 *     summary: Fetch printing bills by IDs for a beneficiary
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: beneficiaryId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Printing bills for the beneficiary
 */
router.post('/util/printing/by-ids/:beneficiaryId', asyncHandler(billingController.postPrintingBillsByIds));

/**
 * @swagger
 * /bills/util/printing/summary:
 *   get:
 *     summary: Get printing bills summary
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Printing summary
 */
router.get('/util/printing/summary', asyncHandler(billingController.getPrintingSummary));

/**
 * @swagger
 * /bills/util/{id}:
 *   get:
 *     summary: Get utility bill by ID
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Utility bill object
 */
router.get('/util/:id', asyncHandler(billingController.getUtilityBillById));

/**
 * @swagger
 * /bills/util:
 *   get:
 *     summary: Get all utility bills
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of utility bills
 */
router.get('/util', asyncHandler(billingController.getUtilityBills));

/**
 * @swagger
 * /bills/util/check-ubillno:
 *   get:
 *     summary: Check if a utility bill number exists
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ubill_no
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Existence check result
 */
// Check utility bill number existence
router.get('/util/check-ubillno', asyncHandler(billingController.checkUtilityUbillNo));

/**
 * @swagger
 * /bills/util:
 *   post:
 *     summary: Create a utility bill with optional reference file upload
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               ubill_ref:
 *                 type: string
 *                 format: binary
 *                 description: Reference file (preferred)
 *               ubill_file:
 *                 type: string
 *                 format: binary
 *                 description: Legacy file field
 *     responses:
 *       201:
 *         description: Utility bill created
 */
// Accept file under either 'ubill_ref' (preferred) or 'ubill_file' (legacy)
router.post('/util', utilUploader.fields([{ maxCount: 1, name: 'ubill_ref' }, { maxCount: 1, name: 'ubill_file' }]), asyncHandler(billingController.createUtilityBill));

/**
 * @swagger
 * /bills/util/{id}:
 *   put:
 *     summary: Update a utility bill
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Utility bill updated
 */
router.put('/util/:id', asyncHandler(billingController.updateUtilityBill));

/**
 * @swagger
 * /bills/util/{id}:
 *   delete:
 *     summary: Delete a utility bill
 *     tags: [Billing Utilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Utility bill deleted
 */
router.delete('/util/:id', asyncHandler(billingController.deleteUtilityBill));


export default router;
