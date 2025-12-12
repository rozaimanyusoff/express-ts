import { Router } from 'express';

import asyncHandler from '../../utils/asyncHandler';
import * as nrwEmployeeController from './nrwEmployeeController';

const router = Router();

// ---- EMPLOYEES ----
router.post('/employees', asyncHandler(nrwEmployeeController.createEmployee));
router.get('/employees', asyncHandler(nrwEmployeeController.getEmployees));
router.get('/employees/:id', asyncHandler(nrwEmployeeController.getEmployeeById));
router.put('/employees/:id', asyncHandler(nrwEmployeeController.updateEmployee));
router.delete('/employees/:id', asyncHandler(nrwEmployeeController.deleteEmployee));

// ---- LEVELS ----
router.post('/levels', asyncHandler(nrwEmployeeController.createLevel));
router.get('/levels', asyncHandler(nrwEmployeeController.getLevels));
router.get('/levels/:id', asyncHandler(nrwEmployeeController.getLevelById));
router.put('/levels/:id', asyncHandler(nrwEmployeeController.updateLevel));
router.delete('/levels/:id', asyncHandler(nrwEmployeeController.deleteLevel));

// ---- DEPARTMENTS ----
router.post('/departments', asyncHandler(nrwEmployeeController.createDepartment));
router.get('/departments', asyncHandler(nrwEmployeeController.getDepartments));
router.get('/departments/:id', asyncHandler(nrwEmployeeController.getDepartmentById));
router.put('/departments/:id', asyncHandler(nrwEmployeeController.updateDepartment));
router.delete('/departments/:id', asyncHandler(nrwEmployeeController.deleteDepartment));

// ---- COSTCENTERS ----
router.post('/costcenters', asyncHandler(nrwEmployeeController.createCostcenter));
router.get('/costcenters', asyncHandler(nrwEmployeeController.getCostcenters));
router.get('/costcenters/:id', asyncHandler(nrwEmployeeController.getCostcenterById));
router.put('/costcenters/:id', asyncHandler(nrwEmployeeController.updateCostcenter));
router.delete('/costcenters/:id', asyncHandler(nrwEmployeeController.deleteCostcenter));

// ---- LOCATIONS ----
router.post('/locations', asyncHandler(nrwEmployeeController.createLocation));
router.get('/locations', asyncHandler(nrwEmployeeController.getLocations));
router.get('/locations/:id', asyncHandler(nrwEmployeeController.getLocationById));
router.put('/locations/:id', asyncHandler(nrwEmployeeController.updateLocation));
router.delete('/locations/:id', asyncHandler(nrwEmployeeController.deleteLocation));

export default router;
