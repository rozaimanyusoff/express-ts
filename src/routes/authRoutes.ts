// filepath: /src/routes/authRoutes.ts
import { Router } from 'express';
import { register, validateActivationDetails, activateAccount, login, resetPassword, verifyResetToken, updatePassword, logout, refreshToken } from '../controllers/authController';
import asyncHandler from '../utils/asyncHandler';
import { rsaDecryptMiddleware } from '../middlewares/rsaDecrypt';
import tokenValidator from '../middlewares/tokenValidator';

const router = Router();
router.post('/register', asyncHandler(register));
router.post('/validate-activation', asyncHandler(validateActivationDetails));
router.post('/activate', asyncHandler(activateAccount));
router.post('/login', rsaDecryptMiddleware, asyncHandler(login));
router.post('/reset-password', asyncHandler(resetPassword));
router.post('/verifytoken', asyncHandler(verifyResetToken));
router.post('/update-password', asyncHandler(updatePassword));
router.post('/logout', asyncHandler(logout));
router.post('/refresh-token', tokenValidator, asyncHandler(refreshToken));

export default router;