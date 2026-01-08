// src/p.maintenance/maintenanceRoutes.ts
import { Router } from 'express';

import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';
import * as maintenanceController from './maintenanceController';

const router = Router();
const mtnUploader = createUploader('admin/vehiclemtn2');
// Restricted uploader for maintenance forms: images (JPEG, PNG, WebP) and PDF only
const mtnFormUploader = createUploader('admin/vehiclemtn2', [
	'image/jpeg',
	'image/png',
	'image/webp',
	'application/pdf'
]);

// ========== MAINTENANCE RECORDS CRUD ==========
router.get('/bills/unseen-count', asyncHandler(maintenanceController.getUnseenBillsCount)); // Get badge count for unseen/unprocessed bills
router.get('/request/record/:asset_id', asyncHandler(maintenanceController.getVehicleMtnRequestByAssetId)); // Get maintenance records by vehicle ID including invoice details
router.get('/request/:id', asyncHandler(maintenanceController.getVehicleMtnRequestById));

router.get('/request', asyncHandler(maintenanceController.getVehicleMtnRequests)); // ?status={pending|verified|recommended|approved}
router.post('/request', mtnUploader.single('req_upload'), asyncHandler(maintenanceController.createVehicleMtnRequest));
// General update (no file upload middleware)
router.put('/request/:id', asyncHandler(maintenanceController.updateVehicleMtnRequest));
// Dedicated endpoint to upload maintenance form
router.put('/request/:id/form-upload', mtnFormUploader.single('form_upload'), asyncHandler(maintenanceController.uploadVehicleMtnForm));
router.put('/request/:id/admin', asyncHandler(maintenanceController.adminUpdateVehicleMtnRequest)); // Admin verify/update & for recommender

// Recommend / Approve single endpoints (actor ramco from ?authorize or body)
router.put('/request/:id/recommend', asyncHandler(maintenanceController.recommendVehicleMtnRequestSingle)); // Recommmend single application
router.put('/request/:id/approve', asyncHandler(maintenanceController.approveVehicleMtnRequestSingle)); // Approve single application

router.put('/request/bulk/recommend', asyncHandler(maintenanceController.recommendVehicleMtnRequestBulk)); // Recommend bulk applications
router.put('/request/bulk/approve', asyncHandler(maintenanceController.approveVehicleMtnRequestBulk)); // Approve bulk applications

router.put('/request/:id/cancel', asyncHandler(maintenanceController.cancelVehicleMtnRequest));
router.delete('/request/:id', asyncHandler(maintenanceController.deleteVehicleMtnRequest));
router.put('/request/:id/authorize', asyncHandler(maintenanceController.authorizeVehicleMtnRequest));
// Authorize via secure email link (GET)
router.get('/request/:id/authorize-link', asyncHandler(maintenanceController.authorizeViaEmailLink));
// Force invoice creation for approved maintenance record
router.post('/request/:id/forceinvoice', asyncHandler(maintenanceController.pushVehicleMtnToBilling));

// Resend portal link to requester
router.post('/request/:id/resendmail', asyncHandler(maintenanceController.resendMaintenancePortalLink));
// Resend to recommender/approver (use ?level=recommend|approval)
router.post('/request/:id/resendWorkflowMail', asyncHandler(maintenanceController.resendWorkflowMail));
// Convenience routes for frontend: explicit resend endpoints
router.post('/request/:id/resend/recommend', (req, res, next) => {
	// inject level=recommend and delegate
	(req.query as any).level = 'recommend';
	return (asyncHandler(maintenanceController.resendWorkflowMail) as any)(req, res, next);
});
router.post('/request/:id/resend/approval', (req, res, next) => {
	// inject level=approval and delegate
	(req.query as any).level = 'approval';
	return (asyncHandler(maintenanceController.resendWorkflowMail) as any)(req, res, next);
});


// ========== INSURANCE + ROADTAX ==========
router.get('/insurance/:id', asyncHandler(maintenanceController.getInsuranceById));
router.get('/insurance', asyncHandler(maintenanceController.getInsurances));
router.post('/insurance', asyncHandler(maintenanceController.createInsurance));
router.put('/insurance/:id', asyncHandler(maintenanceController.updateInsurance));
router.delete('/insurance/:id', asyncHandler(maintenanceController.deleteInsurance));

/* ============= ROAD TAX ============== */
router.get('/roadtax/:id', asyncHandler(maintenanceController.getRoadTaxById));
router.get('/roadtax', asyncHandler(maintenanceController.getRoadTaxes));
router.post('/roadtax', asyncHandler(maintenanceController.createRoadTax));
router.put('/roadtax/:id', asyncHandler(maintenanceController.updateRoadTax));
router.delete('/roadtax/:id', asyncHandler(maintenanceController.deleteRoadTax));

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
