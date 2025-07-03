// src/p.billing/billingRoutes.ts
import { Router } from 'express';
import * as billingController from './billingController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

/* ===== VEHICLE MAINTENANCE ====== */
router.get('/vehicle/summary', asyncHandler(billingController.getVehicleMaintenanceSummaryByDate)); // /api/bills/vehicle/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/vehicle/filter', asyncHandler(billingController.getVehicleMaintenanceByDate)); /* /api/bills/vehicle/filter?from=2024-01-01&to=2024-12-31 */
router.get('/vehicle/:id', asyncHandler(billingController.getVehicleMaintenanceById));
router.get('/vehicle', asyncHandler(billingController.getVehicleMaintenance));

router.post('/vehicle', asyncHandler(billingController.createVehicleMaintenance));
router.put('/vehicle/:id', asyncHandler(billingController.updateVehicleMaintenance));
router.delete('/vehicle/:id', asyncHandler(billingController.deleteVehicleMaintenance));



export default router;
