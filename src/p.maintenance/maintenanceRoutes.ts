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

// ========== FLEET INSURANCE + ROADTAX ==========
router.post('/insurance', asyncHandler(maintenanceController.createFleetInsurance));
router.put('/insurance/:id', asyncHandler(maintenanceController.updateFleetInsurance));
router.get('/insurance/:id', asyncHandler(maintenanceController.getFleetInsuranceById));
router.get('/insurance', asyncHandler(maintenanceController.listFleetInsurances));
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

/* ============= POOL CARS ============== */
router.get('/poolcars/available', asyncHandler(maintenanceController.getAvailablePoolCars)); // New route to get available pool cars
router.put('/poolcars/:id/verify', asyncHandler(maintenanceController.verifyPoolCar));
router.get('/poolcars/:id/verify', asyncHandler(maintenanceController.verifyPoolCarGet));
router.get('/poolcars/:id', asyncHandler(maintenanceController.getPoolCarById));

router.get('/poolcars', asyncHandler(maintenanceController.getPoolCars));
router.post('/poolcars', asyncHandler(maintenanceController.createPoolCar));
router.put('/poolcars/:id', asyncHandler(maintenanceController.updatePoolCar));
router.post('/poolcars/:id/resendmail', asyncHandler(maintenanceController.resendPoolCarMail));
router.delete('/poolcars/:id', asyncHandler(maintenanceController.deletePoolCar));


/* ============== TOUCH N GO CARDS ============== */
router.get('/tng/:id', asyncHandler(maintenanceController.getTouchNGoCardById));
router.post('/tng', asyncHandler(maintenanceController.createTouchNGoCard));
router.put('/tng/:id', asyncHandler(maintenanceController.updateTouchNGoCard));
router.delete('/tng/:id', asyncHandler(maintenanceController.deleteTouchNGoCard));
router.get('/tng', asyncHandler(maintenanceController.getTouchNGoCards));
export default router;
