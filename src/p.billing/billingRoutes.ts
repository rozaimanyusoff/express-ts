// src/p.billing/billingRoutes.ts
import { Router } from 'express';
import * as billingController from './billingController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

/* ================== VEHICLE MAINTENANCE ================== */

router.get('/vehicle/summary', asyncHandler(billingController.getVehicleMaintenanceSummaryByDate)); // /api/bills/vehicle/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/vehicle/filter', asyncHandler(billingController.getVehicleMaintenanceByDate)); /* /api/bills/vehicle/filter?from=2024-01-01&to=2024-12-31 */
router.get('/vehicle/:id', asyncHandler(billingController.getVehicleMaintenanceById));
router.get('/vehicle', asyncHandler(billingController.getVehicleMaintenance));

router.post('/vehicle', asyncHandler(billingController.createVehicleMaintenance));
router.put('/vehicle/:id', asyncHandler(billingController.updateVehicleMaintenance));
router.delete('/vehicle/:id', asyncHandler(billingController.deleteVehicleMaintenance));

/* =================== WORKSHOP ======================= */
router.get('/workshops', asyncHandler(billingController.getWorkshops));
router.get('/workshops/:id', asyncHandler(billingController.getWorkshopById));
router.post('/workshops', asyncHandler(billingController.createWorkshop));
router.put('/workshops/:id', asyncHandler(billingController.updateWorkshop));
router.delete('/workshops/:id', asyncHandler(billingController.deleteWorkshop));

/* =================== FUEL ISSUER ======================== */

router.get('/fuel/issuer', asyncHandler(billingController.getFuelIssuers)); // /api/bills/fuel/issuer
router.get('/fuel/issuer/:id', asyncHandler(billingController.getFuelIssuerById));
router.post('/fuel/issuer', asyncHandler(billingController.createFuelIssuer));
router.put('/fuel/issuer/:id', asyncHandler(billingController.updateFuelIssuer));

/* =================== FUEL BILLING ======================== */

router.get('/fuel/summary', asyncHandler(billingController.getFuelBillingSummaryByDate)); // /api/bills/fuel/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/fuel/filter', asyncHandler(billingController.getFuelBillingByDate)); /* /api/bills/fuel/filter?from=2024-01-01&to=2024-12-31 */
router.get('/fuel/:id', asyncHandler(billingController.getFuelBillingById));
router.get('/fuel', asyncHandler(billingController.getFuelBillings));

/* =================== FLEET CARD TABLE ========================== */

router.get('/fleet', asyncHandler(billingController.getFleetCards)); // /api/bills/fleet/card
router.get('/fleet/:id', asyncHandler(billingController.getFleetCardById));
router.post('/fleet', asyncHandler(billingController.createFleetCard));
router.put('/fleet/:id', asyncHandler(billingController.updateFleetCard));

/* =================== SERVICE OPTION TABLE ========================== */
router.get('/service/options', asyncHandler(billingController.getServiceOptions)); // /api/bills/service/options
router.get('/service/options/:id', asyncHandler(billingController.getServiceOptionById));
router.post('/service/options', asyncHandler(billingController.createServiceOption));
router.put('/service/options/:id', asyncHandler(billingController.updateServiceOption));

export default router;
