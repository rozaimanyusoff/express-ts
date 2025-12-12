import { Router } from 'express';

import asyncHandler from "../../utils/asyncHandler";
import * as authController from './authController';

const router = Router();

router.post('/login', asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.post('/signup', asyncHandler(authController.signup));

export default router;