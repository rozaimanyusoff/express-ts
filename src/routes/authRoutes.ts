// filepath: /src/routes/authRoutes.ts
import { Router } from 'express';
import { register, login } from '../controllers/authController';
import accountValidator from '../middlewares/accountValidator';
import asyncHandler from '../utils/asyncHandler';

const router = Router();
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));

export default router;