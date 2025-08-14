// src/p.maintenance/maintenanceRoutes.ts
import { Router } from 'express';
import * as maintenanceController from './maintenanceController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// ========== MAINTENANCE RECORDS CRUD ==========
router.get('/vehicle/:id', asyncHandler(maintenanceController.getMaintenanceRecordById));
router.get('/vehicle', asyncHandler(maintenanceController.getMaintenanceRecords)); // ?status={pending|verified|recommended|approved}
router.post('/vehicle', asyncHandler(maintenanceController.createMaintenanceRecord));
router.put('/vehicle/:id', asyncHandler(maintenanceController.updateMaintenanceRecord));
router.delete('/vehicle/:id', asyncHandler(maintenanceController.deleteMaintenanceRecord));

// ========== MAINTENANCE TYPES CRUD ==========
router.get('/types', asyncHandler(maintenanceController.getMaintenanceTypes));
router.get('/types/:id', asyncHandler(maintenanceController.getMaintenanceTypeById));
router.post('/types', asyncHandler(maintenanceController.createMaintenanceType));
router.put('/types/:id', asyncHandler(maintenanceController.updateMaintenanceType));
router.delete('/types/:id', asyncHandler(maintenanceController.deleteMaintenanceType));

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
