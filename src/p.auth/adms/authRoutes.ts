// filepath: /src/routes/authRoutes.ts
import { Router } from 'express';

import rateLimiter, { clearClientBlockByKey, clearClientBlockByParams, getAttemptInfo, getClientBlockInfo, listActiveBlocks } from '../../middlewares/rateLimiter.js';
//import { rsaDecryptMiddleware } from '../middlewares/rsaDecrypt.js';
import tokenValidator from '../../middlewares/tokenValidator.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { activateAccount, approvePendingUser, deletePendingUser, inviteUsers, login, logout, refreshToken, register, resetPassword, resetPasswordMulti, updatePassword, validateActivationDetails, verifyRegisterUser, verifyResetToken } from './authController.js';

const router = Router();
router.post('/register/verifyme', asyncHandler(verifyRegisterUser));
router.post('/register', rateLimiter[0], rateLimiter[1], asyncHandler(register));
router.post('/validate-activation', asyncHandler(validateActivationDetails));
router.post('/activate', asyncHandler(activateAccount));
//router.post('/login-rsa', rsaDecryptMiddleware, asyncHandler(login)); //login with RSA decryption
router.post('/login', rateLimiter[0], rateLimiter[1], asyncHandler(login)); //login without RSA decryption
router.post('/reset-password', rateLimiter[0], rateLimiter[1], asyncHandler(resetPassword));
router.post('/reset-password-multi', rateLimiter[0], rateLimiter[1], asyncHandler(resetPasswordMulti));
router.post('/verifytoken', rateLimiter[0], rateLimiter[1], asyncHandler(verifyResetToken));
router.post('/update-password', rateLimiter[0], rateLimiter[1], asyncHandler(updatePassword));
router.post('/logout', tokenValidator, asyncHandler(logout));
router.post('/refresh-token', asyncHandler(refreshToken)); // not apply tokenValidator as it is used for refreshing token
router.post('/approve-pending-user', asyncHandler(approvePendingUser));
router.post('/invite-users', asyncHandler(inviteUsers));
router.post('/delete-pending-user', asyncHandler(deletePendingUser));

// Read-only status endpoint to help frontend show countdown timers
// Query param `route` allows checking a specific route's block status (default: /api/auth/login)
router.get('/rate-limit-status', asyncHandler(async (req, res) => {
	const route = String((req.query.route ?? '/api/auth/login'));
	const info = getClientBlockInfo(req, route);
	const attempts = getAttemptInfo(req, route);
	return res.json({ data: { ...info, attempts }, status: 'success' });
}));

// Admin: list active rate-limit blocks (in-memory)
router.get('/admin/rate-limit/blocks', tokenValidator, asyncHandler(async (req, res) => {
	const blocks = listActiveBlocks();
	return res.json({ data: blocks, status: 'success' });
}));

// Admin: unblock a specific client key or ip+ua+route
router.post('/admin/rate-limit/unblock', tokenValidator, asyncHandler(async (req, res) => {
	const { ip, key, route, userAgent } = req.body || {};
	let ok = false;
	if (typeof key === 'string' && key.trim()) {
		ok = clearClientBlockByKey(key.trim());
	} else if (ip && userAgent && route) {
		ok = clearClientBlockByParams(String(ip), String(userAgent), String(route));
	} else {
		return res.status(400).json({ message: 'Provide either { key } or { ip, userAgent, route }', status: 'error' });
	}
	if (ok) return res.json({ message: 'Unblocked', status: 'success' });
	return res.status(404).json({ message: 'No matching block found', status: 'error' });
}));

export default router;