// filepath: /src/routes/authRoutes.ts
import { Router } from 'express';

import rateLimiter, { clearClientBlockByKey, clearClientBlockByParams, getAttemptInfo, getClientBlockInfo, listActiveBlocks } from '../../middlewares/rateLimiter.js';
//import { rsaDecryptMiddleware } from '../middlewares/rsaDecrypt.js';
import tokenValidator from '../../middlewares/tokenValidator.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { activateAccount, approvePendingUser, deletePendingUser, inviteUsers, login, logout, refreshToken, register, resetPassword, resetPasswordMulti, sendAdminPincode, updatePassword, validateActivationDetails, verifyRegisterUser, verifyResetToken } from './authController.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication, registration, and account management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user account
 *     description: Register with email, contact, and user type. Employees are auto-approved, others await admin approval.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@company.com"
 *               contact:
 *                 type: string
 *                 example: "60123456789"
 *               userType:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 example: 1
 *               username:
 *                 type: string
 *                 example: "ramco_12345"
 *             required:
 *               - name
 *               - email
 *               - contact
 *               - userType
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/register', rateLimiter[0], rateLimiter[1], asyncHandler(register));

/**
 * @swagger
 * /auth/register/verifyme:
 *   post:
 *     summary: Verify user before registration
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Verification successful
 *       400:
 *         description: Verification failed
 */
router.post('/register/verifyme', asyncHandler(verifyRegisterUser));

/**
 * @swagger
 * /auth/validate-activation:
 *   post:
 *     summary: Validate activation code
 *     description: Verify activation code before user sets password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               contact:
 *                 type: string
 *               activationCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation successful
 *       401:
 *         description: Invalid activation details
 */
router.post('/validate-activation', asyncHandler(validateActivationDetails));

/**
 * @swagger
 * /auth/activate:
 *   post:
 *     summary: Activate account
 *     description: Activate user account with password and username
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               contact:
 *                 type: string
 *               activationCode:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account activated successfully
 *       401:
 *         description: Invalid or expired activation code
 */
router.post('/activate', asyncHandler(activateAccount));
//router.post('/login-rsa', rsaDecryptMiddleware, asyncHandler(login)); //login with RSA decryption
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email/username and password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailOrUsername:
 *                 type: string
 *                 example: "john@company.com"
 *               password:
 *                 type: string
 *                 example: "SecurePassword123"
 *             required:
 *               - emailOrUsername
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many failed attempts
 */
router.post('/login', rateLimiter[0], rateLimiter[1], asyncHandler(login)); //login without RSA decryption

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset link to email
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent
 *       404:
 *         description: Email not found
 */
router.post('/reset-password', rateLimiter[0], rateLimiter[1], asyncHandler(resetPassword));

/**
 * @swagger
 * /auth/reset-password-multi:
 *   post:
 *     summary: Reset multiple users passwords
 *     description: Admin endpoint to reset multiple users' passwords
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Passwords reset
 */
router.post('/reset-password-multi', rateLimiter[0], rateLimiter[1], asyncHandler(resetPasswordMulti));

/**
 * @swagger
 * /auth/verifytoken:
 *   post:
 *     summary: Verify reset token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Token is invalid or expired
 */
router.post('/verifytoken', rateLimiter[0], rateLimiter[1], asyncHandler(verifyResetToken));

/**
 * @swagger
 * /auth/update-password:
 *   post:
 *     summary: Update password with reset token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Password updated
 *       401:
 *         description: Invalid token
 */
router.post('/update-password', rateLimiter[0], rateLimiter[1], asyncHandler(updatePassword));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', tokenValidator, asyncHandler(logout));

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     description: Get new JWT token using current token
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New token issued
 *       401:
 *         description: Unauthorized
 */
router.post('/refresh-token', tokenValidator, asyncHandler(refreshToken));

/**
 * @swagger
 * /auth/approve-pending-user:
 *   post:
 *     summary: Admin approve pending user registrations
 *     description: Approve multiple pending user registrations and send activation codes
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *             required:
 *               - user_ids
 *     responses:
 *       200:
 *         description: Approval processed
 */
router.post('/approve-pending-user', asyncHandler(approvePendingUser));

/**
 * @swagger
 * /auth/invite-users:
 *   post:
 *     summary: Invite multiple users
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Invitations sent
 */
router.post('/invite-users', asyncHandler(inviteUsers));

/**
 * @swagger
 * /auth/delete-pending-user:
 *   post:
 *     summary: Delete pending user registration
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Pending user deleted
 */
router.post('/delete-pending-user', asyncHandler(deletePendingUser));

/**
 * @swagger
 * /auth/admin/pincode:
 *   post:
 *     summary: Send admin pincode for maintenance mode
 *     description: Generate and send 6-digit pincode for special admin access
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Pincode sent
 */
router.post('/admin/pincode', rateLimiter[0], rateLimiter[1], asyncHandler(sendAdminPincode));

/**
 * @swagger
 * /auth/rate-limit-status:
 *   get:
 *     summary: Get rate limit status
 *     description: Check if client is rate limited and remaining attempts
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: route
 *         schema:
 *           type: string
 *         default: "/api/auth/login"
 *     responses:
 *       200:
 *         description: Rate limit status retrieved
 */
router.get('/rate-limit-status', asyncHandler(async (req, res) => {
	const route = String((req.query.route ?? '/api/auth/login'));
	const info = getClientBlockInfo(req, route);
	const attempts = getAttemptInfo(req, route);
	return res.json({ data: { ...info, attempts }, status: 'success' });
}));

/**
 * @swagger
 * /auth/admin/rate-limit/blocks:
 *   get:
 *     summary: List active rate limit blocks
 *     description: Admin endpoint to view all active rate limit blocks
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active blocks
 *       401:
 *         description: Unauthorized
 */
router.get('/admin/rate-limit/blocks', tokenValidator, asyncHandler(async (req, res) => {
	const blocks = listActiveBlocks();
	return res.json({ data: blocks, status: 'success' });
}));

/**
 * @swagger
 * /auth/admin/rate-limit/unblock:
 *   post:
 *     summary: Unblock rate limited client
 *     description: Remove rate limit block for a specific client
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   key:
 *                     type: string
 *               - type: object
 *                 properties:
 *                   ip:
 *                     type: string
 *                   userAgent:
 *                     type: string
 *                   route:
 *                     type: string
 *     responses:
 *       200:
 *         description: Client unblocked
 *       404:
 *         description: No block found
 */
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