// filepath: /src/routes/authRoutes.ts
import { Router } from 'express';
import { register, validateActivationDetails, activateAccount, login, resetPassword, verifyResetToken, updatePassword, logout, refreshToken, resetPasswordMulti, approvePendingUser, inviteUsers, deletePendingUser, verifyRegisterUser } from './authController.js';
import asyncHandler from '../../utils/asyncHandler.js';
//import { rsaDecryptMiddleware } from '../middlewares/rsaDecrypt.js';
import tokenValidator from '../../middlewares/tokenValidator.js';
import rateLimiter, { getClientBlockInfo, getAttemptInfo, clearClientBlockByKey, clearClientBlockByParams, listActiveBlocks } from '../../middlewares/rateLimiter.js';

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
	return res.json({ status: 'success', data: { ...info, attempts } });
}));

// Admin: list active rate-limit blocks (in-memory)
router.get('/admin/rate-limit/blocks', tokenValidator, asyncHandler(async (req, res) => {
	const blocks = listActiveBlocks();
	return res.json({ status: 'success', data: blocks });
}));

// Admin: unblock a specific client key or ip+ua+route
router.post('/admin/rate-limit/unblock', tokenValidator, asyncHandler(async (req, res) => {
	const { key, ip, userAgent, route } = req.body || {};
	let ok = false;
	if (typeof key === 'string' && key.trim()) {
		ok = clearClientBlockByKey(key.trim());
	} else if (ip && userAgent && route) {
		ok = clearClientBlockByParams(String(ip), String(userAgent), String(route));
	} else {
		return res.status(400).json({ status: 'error', message: 'Provide either { key } or { ip, userAgent, route }' });
	}
	if (ok) return res.json({ status: 'success', message: 'Unblocked' });
	return res.status(404).json({ status: 'error', message: 'No matching block found' });
}));

export default router;