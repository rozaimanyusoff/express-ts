// filepath: /src/routes/authRoutes.ts
import { Router } from 'express';
import { register, validateActivationDetails, activateAccount, login, resetPassword, verifyResetToken, updatePassword, logout, refreshToken } from '../controllers/authController.js';
import asyncHandler from '../utils/asyncHandler.js';
//import { rsaDecryptMiddleware } from '../middlewares/rsaDecrypt.js';
import tokenValidator from '../middlewares/tokenValidator.js';
import rateLimiter from '../middlewares/rateLimiter.js';

const router = Router();
router.post('/register', asyncHandler(register));
router.post('/validate-activation', asyncHandler(validateActivationDetails));
router.post('/activate', asyncHandler(activateAccount));
//router.post('/login-rsa', rsaDecryptMiddleware, asyncHandler(login)); //login with RSA decryption
router.post('/login',  asyncHandler(login)); //login without RSA decryption
router.post('/reset-password', asyncHandler(resetPassword));
router.post('/verifytoken', asyncHandler(verifyResetToken));
router.post('/update-password', asyncHandler(updatePassword));
router.post('/logout', asyncHandler(logout));
router.post('/refresh-token', tokenValidator, asyncHandler(refreshToken));

export default router;