import { Router } from 'express';

import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';
import * as complianceController from './complianceController';

const router = Router();

/* ====== SUMMON TYPES ====== */
router.get('/summon/type', asyncHandler(complianceController.getSummonTypes));
router.get('/summon/type/:id', asyncHandler(complianceController.getSummonTypeById));
router.post('/summon/type', asyncHandler(complianceController.createSummonType));
router.put('/summon/type/:id', asyncHandler(complianceController.updateSummonType));
router.delete('/summon/type/:id', asyncHandler(complianceController.deleteSummonType));

/* ====== SUMMON AGENCIES ====== */
// mappings are managed via POST/PUT on /summon/type with agency_ids; no separate mapping endpoints

// Chainable selects: get agencies by type and types with agencies
router.get('/summon-type/:typeId/agencies', asyncHandler(complianceController.getAgenciesByType));
router.get('/summon-types-with-agencies', asyncHandler(complianceController.getSummonTypesWithAgencies));
router.get('/summon/agency', asyncHandler(complianceController.getSummonAgencies));
router.get('/summon/agency/:id', asyncHandler(complianceController.getSummonAgencyById));
router.post('/summon/agency', asyncHandler(complianceController.createSummonAgency));
router.put('/summon/agency/:id', asyncHandler(complianceController.updateSummonAgency));
router.delete('/summon/agency/:id', asyncHandler(complianceController.deleteSummonAgency));

/* ====== SUMMONS ====== */
// Use canonical module_directory for summons uploads
const uploader = createUploader('compliance/summon');
router.get('/summon/:id', asyncHandler(complianceController.getSummonById));
router.get('/summon', asyncHandler(complianceController.getSummons));
router.post('/summon', uploader.single('summon_upl'), asyncHandler(complianceController.createSummon));
router.put('/summon/:id', uploader.single('summon_upl'), asyncHandler(complianceController.updateSummon));
router.put('/summon/:id/payment', uploader.single('summon_receipt'), asyncHandler(complianceController.uploadSummonPayment));
router.post('/summon/notify', asyncHandler(complianceController.resendSummonNotification));
router.delete('/summon/:id', asyncHandler(complianceController.deleteSummon));


/* ========== ASSESSMENT CRITERIA ROUTES ========== */
// Ownership routes
router.get('/assessments/criteria/ownership/:id', asyncHandler(complianceController.getAssessmentCriteriaOwnershipById));
router.get('/assessments/criteria/ownership', asyncHandler(complianceController.getAssessmentCriteriaOwnerships));
router.post('/assessments/criteria/ownership', asyncHandler(complianceController.createAssessmentCriteriaOwnership));
router.put('/assessments/criteria/ownership/:id', asyncHandler(complianceController.updateAssessmentCriteriaOwnership));
router.delete('/assessments/criteria/ownership/:id', asyncHandler(complianceController.deleteAssessmentCriteriaOwnership));


router.get('/assessments/criteria/:id', asyncHandler(complianceController.getAssessmentCriteriaById));
router.get('/assessments/criteria', asyncHandler(complianceController.getAssessmentCriteria));
router.post('/assessments/criteria', asyncHandler(complianceController.createAssessmentCriteria));
router.put('/assessments/criteria/:id', asyncHandler(complianceController.updateAssessmentCriteria));
router.delete('/assessments/criteria/:id', asyncHandler(complianceController.deleteAssessmentCriteria));
router.put('/assessments/criteria/:id/reorder', asyncHandler(complianceController.reorderAssessmentCriteria));


/* ========== ASSESSMENT DETAILS (child) ROUTES ========== */
// Query NCR assessment details (adt_ncr=1) by asset and optional year
router.get('/assessments/details/ncr', asyncHandler(complianceController.getAssessmentNCRDetailsByAsset));
// Query assessment details by asset and year (must be before :id routes to avoid collision)
router.get('/assessments/details', asyncHandler(complianceController.getAssessmentDetailsByAssetAndYear));
// Get details for a specific assessment by assessId
router.get('/assessments/:assessId/details', asyncHandler(complianceController.getAssessmentDetails));
// Get single detail by adt_id
router.get('/assessments/details/:id', asyncHandler(complianceController.getAssessmentDetailById));
router.post('/assessments/details', asyncHandler(complianceController.createAssessmentDetail));
router.put('/assessments/details/:id', asyncHandler(complianceController.updateAssessmentDetail));
router.delete('/assessments/details/:id', asyncHandler(complianceController.deleteAssessmentDetail));


/* ========== ASSESSMENTS (parent) ROUTES ========== */
const uploadAssessment = createUploader('compliance/assessment');

router.get('/assessments', asyncHandler(complianceController.getAssessments));
router.get('/assessments/:id', asyncHandler(complianceController.getAssessmentById));
// Accept multiple files: vehicle_images[] and per-detail images (adt_image, adt_image_N, etc.)
router.post('/assessments', uploadAssessment.any(), asyncHandler(complianceController.createAssessment));
// Driver acceptance endpoint
router.put('/assessments/:id/acceptance', asyncHandler(complianceController.acceptAssessment));
router.put('/assessments/:id', asyncHandler(complianceController.updateAssessment));
// Send a test Vehicle Assessment email (no attachments)
router.post('/assessments/test-email', asyncHandler(complianceController.sendAssessmentTestEmail));

router.delete('/assessments/:id', asyncHandler(complianceController.deleteAssessment));


export default router;
