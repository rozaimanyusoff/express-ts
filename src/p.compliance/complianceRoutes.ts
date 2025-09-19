import { Router } from 'express';
import * as summonController from './complianceController';
import asyncHandler from '../utils/asyncHandler';
import { createUploader } from '../utils/fileUploader';

const router = Router();

/* ====== SUMMON TYPES ====== */
router.get('/summon/type', asyncHandler(summonController.getSummonTypes));
router.get('/summon/type/:id', asyncHandler(summonController.getSummonTypeById));
router.post('/summon/type', asyncHandler(summonController.createSummonType));
router.put('/summon/type/:id', asyncHandler(summonController.updateSummonType));
router.delete('/summon/type/:id', asyncHandler(summonController.deleteSummonType));

/* ====== SUMMON AGENCIES ====== */
// mappings are managed via POST/PUT on /summon/type with agency_ids; no separate mapping endpoints

// Chainable selects: get agencies by type and types with agencies
router.get('/summon-type/:typeId/agencies', asyncHandler(summonController.getAgenciesByType));
router.get('/summon-types-with-agencies', asyncHandler(summonController.getSummonTypesWithAgencies));
router.get('/summon/agency', asyncHandler(summonController.getSummonAgencies));
router.get('/summon/agency/:id', asyncHandler(summonController.getSummonAgencyById));
router.post('/summon/agency', asyncHandler(summonController.createSummonAgency));
router.put('/summon/agency/:id', asyncHandler(summonController.updateSummonAgency));
router.delete('/summon/agency/:id', asyncHandler(summonController.deleteSummonAgency));

/* ====== SUMMONS ====== */
// Use canonical module_directory for summons uploads
const uploader = createUploader('compliance/summon');
router.get('/summon/:id', asyncHandler(summonController.getSummonById));
router.get('/summon', asyncHandler(summonController.getSummons));
router.post('/summon', uploader.single('summon_upl'), asyncHandler(summonController.createSummon));
router.put('/summon/:id', uploader.single('summon_upl'), asyncHandler(summonController.updateSummon));
router.put('/summon/:id/payment', uploader.single('summon_receipt'), asyncHandler(summonController.uploadSummonPayment));
router.post('/summon/notify', asyncHandler(summonController.resendSummonNotification));
router.delete('/summon/:id', asyncHandler(summonController.deleteSummon));


/* ========== ASSESSMENTS (parent) ROUTES ========== */
router.get('/assessments', asyncHandler(summonController.getAssessments));
router.get('/assessments/:id', asyncHandler(summonController.getAssessmentById));
router.post('/assessments', asyncHandler(summonController.createAssessment));
router.put('/assessments/:id', asyncHandler(summonController.updateAssessment));
router.delete('/assessments/:id', asyncHandler(summonController.deleteAssessment));

/* ========== ASSESSMENT DETAILS (child) ROUTES ========== */
router.get('/assessments/:assessId/details', asyncHandler(summonController.getAssessmentDetails));
router.get('/assessments/details/:id', asyncHandler(summonController.getAssessmentDetailById));
router.post('/assessments/details', asyncHandler(summonController.createAssessmentDetail));
router.put('/assessments/details/:id', asyncHandler(summonController.updateAssessmentDetail));
router.delete('/assessments/details/:id', asyncHandler(summonController.deleteAssessmentDetail));

/* ========== ASSESSMENT CRITERIA ROUTES ========== */
router.get('/assessment-criteria/:id', asyncHandler(summonController.getAssessmentCriteriaById));
router.get('/assessment-criteria', asyncHandler(summonController.getAssessmentCriteria));
router.post('/assessment-criteria', asyncHandler(summonController.createAssessmentCriteria));
router.put('/assessment-criteria/:id', asyncHandler(summonController.updateAssessmentCriteria));
router.delete('/assessment-criteria/:id', asyncHandler(summonController.deleteAssessmentCriteria));
router.put('/assessment-criteria/:id/reorder', asyncHandler(summonController.reorderAssessmentCriteria));


export default router;
