// filepath: /src/routes/authRoutes.ts
import { Router } from 'express';
import { register, validateActivationDetails, activateAccount, login, resetPassword, verifyResetToken, updatePassword, logout, refreshToken } from './authController.js';
import asyncHandler from '../../utils/asyncHandler.js';
//import { rsaDecryptMiddleware } from '../middlewares/rsaDecrypt.js';
import tokenValidator from '../../middlewares/tokenValidator.js';
import rateLimiter from '../../middlewares/rateLimiter.js';

const router = Router();
router.post('/register', rateLimiter[0], rateLimiter[1], asyncHandler(register));
router.post('/validate-activation', asyncHandler(validateActivationDetails));
router.post('/activate', asyncHandler(activateAccount));
//router.post('/login-rsa', rsaDecryptMiddleware, asyncHandler(login)); //login with RSA decryption
router.post('/login', rateLimiter[0], rateLimiter[1], asyncHandler(login)); //login without RSA decryption
router.post('/reset-password', rateLimiter[0], rateLimiter[1], asyncHandler(resetPassword));
router.post('/verifytoken', rateLimiter[0], rateLimiter[1], asyncHandler(verifyResetToken));
router.post('/update-password', rateLimiter[0], rateLimiter[1], asyncHandler(updatePassword));
router.post('/logout', tokenValidator, asyncHandler(logout));
router.post('/refresh-token', tokenValidator, asyncHandler(refreshToken));

export default router;