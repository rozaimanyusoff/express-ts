// filepath: /src/routes/authRoutes.ts
import { Router } from 'express';

import rateLimiter, { clearClientBlockByKey, clearClientBlockByParams, getAttemptInfo, getClientBlockInfo, listActiveBlocks } from '../../middlewares/rateLimiter.js';
//import { rsaDecryptMiddleware } from '../middlewares/rsaDecrypt.js';
import tokenValidator from '../../middlewares/tokenValidator.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { activateAccount, approvePendingUser, deletePendingUser, inviteUsers, login, logout, refreshToken, register, resetPassword, resetPasswordMulti, sendAdminPincode, updatePassword, validateActivationDetails, verifyRegisterUser, verifyResetToken } from './authController.js';

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
router.post('/refresh-token', tokenValidator,asyncHandler(refreshToken)); // not apply tokenValidator as it is used for refreshing token
router.post('/approve-pending-user', asyncHandler(approvePendingUser));
router.post('/invite-users', asyncHandler(inviteUsers));
router.post('/delete-pending-user', asyncHandler(deletePendingUser));

// Admin: send 6-digit pincode for special admin access during maintenance mode
router.post('/admin/pincode', rateLimiter[0], rateLimiter[1], asyncHandler(sendAdminPincode));

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
// Point 22 FIX: Proper input validation to prevent injection attacks
router.post('/admin/rate-limit/unblock', tokenValidator, asyncHandler(async (req, res) => {
	const { ip, key, route, userAgent } = req.body || {};
	let ok = false;
	
	// Validate input types and formats
	if (typeof key === 'string' && key.trim()) {
		// Key should be alphanumeric with hyphens (safe format)
		if (!/^[a-zA-Z0-9\-|]+$/.test(key)) {
			return res.status(400).json({ message: 'Invalid key format', status: 'error' });
		}
		ok = clearClientBlockByKey(key.trim());
	} else if (ip && userAgent && route) {
		// Point 22 FIX: Validate each parameter type strictly
		if (typeof ip !== 'string' || typeof userAgent !== 'string' || typeof route !== 'string') {
			return res.status(400).json({ message: 'Invalid parameter types: ip, userAgent, route must be strings', status: 'error' });
		}
		// Basic validation: route should start with /
		if (!route.startsWith('/')) {
			return res.status(400).json({ message: 'Invalid route format: must start with /', status: 'error' });
		}
		ok = clearClientBlockByParams(String(ip).trim(), String(userAgent).trim(), String(route).trim());
	} else {
		return res.status(400).json({ message: 'Provide either { key } or { ip, userAgent, route }', status: 'error' });
	}
	if (ok) return res.json({ message: 'Unblocked', status: 'success' });
	return res.status(404).json({ message: 'No matching block found', status: 'error' });
}));

export default router;