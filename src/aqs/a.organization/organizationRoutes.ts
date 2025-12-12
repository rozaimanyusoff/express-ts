import { Router } from 'express';

import asyncHandler from "../../utils/asyncHandler";
import * as organizationController from './organizationController';

const router = Router();

router.get('/', asyncHandler(organizationController.getAllOrganizations));
router.post('/create', asyncHandler(organizationController.saveOrganization));
router.put('/update/:id', asyncHandler(organizationController.updateOrganization));
router.put('/toggle/:id', asyncHandler(organizationController.toggleOrganization));

export default router;