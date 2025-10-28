// src/p.maintenance/maintenanceRoutes.ts
import { Router } from 'express';
import * as maintenanceController from './maintenanceController';
import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';

const router = Router();
const mtnUploader = createUploader('admin/vehiclemtn2');

// ========== MAINTENANCE RECORDS CRUD ==========
router.get('/request/record/:asset_id', asyncHandler(maintenanceController.getVehicleMtnRequestByAssetId)); // Get maintenance records by vehicle ID including invoice details
router.get('/request/:id', asyncHandler(maintenanceController.getVehicleMtnRequestById));

router.get('/request', asyncHandler(maintenanceController.getVehicleMtnRequests)); // ?status={pending|verified|recommended|approved}
router.post('/request', mtnUploader.single('req_upload'), asyncHandler(maintenanceController.createVehicleMtnRequest));
// General update (no file upload middleware)
router.put('/request/:id', asyncHandler(maintenanceController.updateVehicleMtnRequest));
// Dedicated endpoint to upload maintenance form
router.put('/request/:id/form-upload', mtnUploader.single('form_upload'), asyncHandler(maintenanceController.uploadVehicleMtnForm));
router.put('/request/:id/admin', asyncHandler(maintenanceController.adminUpdateVehicleMtnRequest));
// Recommend / Approve single endpoints (actor ramco from ?authorize or body)
router.put('/request/:id/recommend', asyncHandler(maintenanceController.recommendVehicleMtnRequestSingle));
router.put('/request/:id/approve', asyncHandler(maintenanceController.approveVehicleMtnRequestSingle));
// Bulk endpoints
router.put('/request/bulk/recommend', asyncHandler(maintenanceController.recommendVehicleMtnRequestBulk));
router.put('/request/bulk/approve', asyncHandler(maintenanceController.approveVehicleMtnRequestBulk));
router.put('/request/:id/cancel', asyncHandler(maintenanceController.cancelVehicleMtnRequest));
router.delete('/request/:id', asyncHandler(maintenanceController.deleteVehicleMtnRequest));
router.put('/request/:id/authorize', asyncHandler(maintenanceController.authorizeVehicleMtnRequest));
// Authorize via secure email link (GET)
router.get('/request/:id/authorize-link', asyncHandler(maintenanceController.authorizeViaEmailLink));
// Force invoice creation for approved maintenance record
router.post('/request/:requestId/forceinvoice', asyncHandler(maintenanceController.pushVehicleMtnToBilling));

// Resend portal link to requester
router.post('/request/:requestId/resendmail', asyncHandler(maintenanceController.resendMaintenancePortalLink));
// Resend to recommender/approver (use ?level=recommend|approval)
router.post('/request/:requestId/resendWorkflowMail', asyncHandler(maintenanceController.resendWorkflowMail));
// Convenience routes for frontend: explicit resend endpoints
router.post('/request/:requestId/resend/recommend', (req, res, next) => {
	// inject level=recommend and delegate
	(req.query as any).level = 'recommend';
	return (asyncHandler(maintenanceController.resendWorkflowMail) as any)(req, res, next);
});
router.post('/request/:requestId/resend/approval', (req, res, next) => {
	// inject level=approval and delegate
	(req.query as any).level = 'approval';
	return (asyncHandler(maintenanceController.resendWorkflowMail) as any)(req, res, next);
});


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


// legacy recommend/approve routes removed; use PUT /request/:id/authorize?action={recommend|approve}

/* ============= POOL CARS ============== */
router.get('/poolcars/available', asyncHandler(maintenanceController.getAvailablePoolCars)); // New route to get available pool cars
router.put('/poolcars/:id/verify', asyncHandler(maintenanceController.verifyPoolCar));
router.get('/poolcars/:id/verify', asyncHandler(maintenanceController.verifyPoolCarGet));
router.get('/poolcars/:id', asyncHandler(maintenanceController.getPoolCarById));

router.get('/poolcars', asyncHandler(maintenanceController.getPoolCars));
router.post('/poolcars', asyncHandler(maintenanceController.createPoolCar));
router.put('/poolcars/:id', asyncHandler(maintenanceController.updatePoolCar));
router.put('/poolcars/:id/returned', asyncHandler(maintenanceController.returnPoolCar));
router.put('/poolcars/:id/cancellation', asyncHandler(maintenanceController.cancelPoolCar));
router.put('/poolcars/:id/admin', asyncHandler(maintenanceController.updateAdminPoolCar));
router.post('/poolcars/:id/resendmail', asyncHandler(maintenanceController.resendPoolCarMail));
router.delete('/poolcars/:id', asyncHandler(maintenanceController.deletePoolCar));


/* ============== TOUCH N GO CARDS ============== */
router.get('/tng/:id', asyncHandler(maintenanceController.getTouchNGoCardById));
router.get('/tng', asyncHandler(maintenanceController.getTouchNGoCards));
router.post('/tng', asyncHandler(maintenanceController.createTouchNGoCard));
router.put('/tng/:id', asyncHandler(maintenanceController.updateTouchNGoCard));
router.delete('/tng/:id', asyncHandler(maintenanceController.deleteTouchNGoCard));

export default router;
