import { Router } from 'express';
import * as locationType from './webstockController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// Location Type CRUD
router.get('/location-types/:id', asyncHandler(locationType.getById));
router.get('/location-types', asyncHandler(locationType.list));
router.post('/location-types', asyncHandler(locationType.create));
router.put('/location-types/:id', asyncHandler(locationType.update));
router.delete('/location-types/:id', asyncHandler(locationType.remove));

// Locations CRUD
router.get('/locations/:id', asyncHandler(locationType.getLocation));
router.get('/locations', asyncHandler(locationType.listLocations));
router.post('/locations', asyncHandler(locationType.createLocation));
router.put('/locations/:id', asyncHandler(locationType.updateLocation));
router.delete('/locations/:id', asyncHandler(locationType.deleteLocation));

export default router;

// Fixed Asset CRUD
router.get('/fixed-assets/:id', asyncHandler(locationType.getFixedAsset));
router.get('/fixed-assets', asyncHandler(locationType.listFixedAssets));
router.post('/fixed-assets', asyncHandler(locationType.createFixedAsset));
router.put('/fixed-assets/:id', asyncHandler(locationType.updateFixedAsset));
router.delete('/fixed-assets/:id', asyncHandler(locationType.deleteFixedAsset));

