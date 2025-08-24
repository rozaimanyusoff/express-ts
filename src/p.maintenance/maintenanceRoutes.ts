// src/p.maintenance/maintenanceRoutes.ts
import { Router } from 'express';
import * as maintenanceController from './maintenanceController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// ========== MAINTENANCE RECORDS CRUD ==========
router.get('/request/record/:asset_id', asyncHandler(maintenanceController.getVehicleMtnRequestByAssetId)); // Get maintenance records by vehicle ID including invoice details
router.get('/request/:id', asyncHandler(maintenanceController.getVehicleMtnRequestById));

router.get('/request', asyncHandler(maintenanceController.getVehicleMtnRequests)); // ?status={pending|verified|recommended|approved}
router.post('/request', asyncHandler(maintenanceController.createVehicleMtnRequest));
router.put('/request/:id', asyncHandler(maintenanceController.updateVehicleMtnRequest));
router.delete('/request/:id', asyncHandler(maintenanceController.deleteVehicleMtnRequest));
router.put('/request/:id/authorize', asyncHandler(maintenanceController.authorizeVehicleMtnRequest));
// ========== MAINTENANCE TYPES CRUD ==========
router.get('/types', asyncHandler(maintenanceController.getServiceTypes));
router.get('/types/:id', asyncHandler(maintenanceController.getServiceTypeById));
router.post('/types', asyncHandler(maintenanceController.createServiceType));
router.put('/types/:id', asyncHandler(maintenanceController.updateServiceType));
router.delete('/types/:id', asyncHandler(maintenanceController.deleteServiceType));

/* ========== ADDITIONAL MAINTENANCE ROUTES ========== */

// Force invoice creation for approved maintenance record
router.post('/request/:requestId/forceinvoice', asyncHandler(maintenanceController.pushVehicleMtnToBilling));

// Resend portal link to requester
router.post('/request/:requestId/resendmail', asyncHandler(maintenanceController.resendMaintenancePortalLink));

// legacy recommend/approve routes removed; use PUT /request/:id/authorize?action={recommend|approve}

/* ========== ADD MORE ROUTES HERE ========== */

// Placeholder routes - will be implemented based on your database structure
// Examples:
// router.get('/schedules', asyncHandler(maintenanceController.getMaintenanceSchedules));
// router.get('/schedules/:id', asyncHandler(maintenanceController.getMaintenanceScheduleById));
// router.post('/schedules', asyncHandler(maintenanceController.createMaintenanceSchedule));
// router.put('/schedules/:id', asyncHandler(maintenanceController.updateMaintenanceSchedule));
// router.delete('/schedules/:id', asyncHandler(maintenanceController.deleteMaintenanceSchedule));

// router.get('/technicians', asyncHandler(maintenanceController.getTechnicians));
// router.get('/technicians/:id', asyncHandler(maintenanceController.getTechnicianById));
// router.post('/technicians', asyncHandler(maintenanceController.createTechnician));

// router.get('/assets/:assetId/maintenance', asyncHandler(maintenanceController.getMaintenanceByAsset));
// router.get('/reports/summary', asyncHandler(maintenanceController.getMaintenanceSummary));
// router.get('/reports/filter', asyncHandler(maintenanceController.getMaintenanceByDateRange));

// router.get('/search', asyncHandler(maintenanceController.searchMaintenance));
// router.get('/filter', asyncHandler(maintenanceController.filterMaintenance));

export default router;
