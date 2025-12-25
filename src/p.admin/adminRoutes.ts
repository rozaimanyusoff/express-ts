import { Router } from 'express';
import * as importerController from '../p.admin/importerController';
import * as adminController from '../p.admin/adminController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// ==================== IMPORTER ROUTES ====================

// TEMP TABLE IMPORTER
router.post('/import-temp-table', asyncHandler(importerController.importTempTable));

// TEMP TABLE METADATA
router.get('/tables', asyncHandler(importerController.getTempTables));

// ==================== NAVIGATION ROUTES ====================

router.get('/nav/access/:id', asyncHandler(adminController.getNavigationByUserIdHandler));
router.get('/nav/access', asyncHandler(adminController.getNavigationPermissionsHandler));
router.put('/nav/track-route', asyncHandler(adminController.trackRoute));
router.get('/nav', asyncHandler(adminController.getNavigations));
router.post('/nav', asyncHandler(adminController.createNavigationHandler));
router.put('/nav/reorder', asyncHandler(adminController.reorderNavigationHandler));
router.put('/nav/:id/status', asyncHandler(adminController.toggleStatusHandler));
router.put('/nav/:id', asyncHandler(adminController.updateNavigationHandler));
router.put('/nav/permissions/assign', asyncHandler(adminController.updateNavigationPermissionsHandler));
router.delete('/nav/permissions/remove', asyncHandler(adminController.removeNavigationPermissionsHandler));
router.delete('/nav/:id', asyncHandler(adminController.deleteNavigationHandler));

// ==================== ROLE ROUTES ====================

router.get('/roles', asyncHandler(adminController.getAllRole));
router.get('/roles/:id', asyncHandler(adminController.getRole));
router.post('/roles', asyncHandler(adminController.createNewRole));
router.put('/roles/:id', asyncHandler(adminController.updateRoleById));

// ==================== GROUP ROUTES ====================

router.get('/groups', asyncHandler(adminController.getAllGroupsStructured));
router.get('/groups/:id', asyncHandler(adminController.getGroupById1));
router.post('/groups', asyncHandler(adminController.createGroup1));
router.put('/groups/:id', asyncHandler(adminController.updateGroup1));

export default router;
