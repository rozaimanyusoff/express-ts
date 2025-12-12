import { Router } from 'express';

import asyncHandler from "../../utils/asyncHandler";
import * as districtController from './districtController';

const router = Router();

router.get('/', asyncHandler(districtController.getAllDistrict));
router.post('/create', asyncHandler(districtController.saveDistrict));
router.post('/bulk-create', asyncHandler(districtController.bulkCreateDistricts));
router.put('/update/:id', asyncHandler(districtController.updateDistrict));
router.put('/toggle/:id', asyncHandler(districtController.toggleDistrict));

export default router;