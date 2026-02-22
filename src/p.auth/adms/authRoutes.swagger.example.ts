/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and account management operations
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user account
 *     description: Allows users to register with email, contact, and user type. Employees are auto-approved, others await admin approval.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             name: "John Doe"
 *             email: "john@company.com"
 *             contact: "60123456789"
 *             userType: 1
 *             username: "ramco_12345"
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Registration successful. Please check your email to activate your account."
 *       400:
 *         description: Validation failed or duplicate account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: "error"
 *               message: "Validation failed"
 *               code: 400
 *               errors:
 *                 email: "Enter a valid email address."
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/validate-activation:
 *   post:
 *     summary: Validate activation code before password setup
 *     description: Pre-validates activation code without setting password
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
 *             required:
 *               - email
 *               - contact
 *               - activationCode
 *           example:
 *             email: "john@company.com"
 *             contact: "60123456789"
 *             activationCode: "a1b2c3d4e5f6..."
 *     responses:
 *       200:
 *         description: Validation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 user_type:
 *                   type: integer
 *       401:
 *         description: Invalid activation details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/activate:
 *   post:
 *     summary: Activate account with password and username
 *     description: Moves user from pending to active status and sets password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivateRequest'
 *           example:
 *             email: "john@company.com"
 *             contact: "60123456789"
 *             activationCode: "a1b2c3d4e5f6..."
 *             username: "ramco_12345"
 *             password: "SecurePassword123"
 *     responses:
 *       200:
 *         description: Account activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             example:
 *               status: "success"
 *               message: "Account activated successfully."
 *       401:
 *         description: Invalid or expired activation code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Account already activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email/username and password
 *     description: Authenticate user and get JWT token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             emailOrUsername: "john@company.com"
 *             password: "SecurePassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials or account not activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many failed attempts - rate limited
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user session
 *     description: Invalidate user's JWT session token
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset link to user's email
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
 *             required:
 *               - email
 *           example:
 *             email: "john@company.com"
 *     responses:
 *       200:
 *         description: Reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Email not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/update-password:
 *   post:
 *     summary: Update password with reset token
 *     description: Reset password using valid reset token
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
 *               resetToken:
 *                 type: string
 *               newPassword:
 *                 type: string
 *             required:
 *               - email
 *               - resetToken
 *               - newPassword
 *           example:
 *             email: "john@company.com"
 *             resetToken: "reset_token_from_email"
 *             newPassword: "NewSecurePassword123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     description: Get a new JWT token using current token
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/rate-limit-status:
 *   get:
 *     summary: Get rate limit status for a route
 *     description: Check if client is rate limited and remaining attempts
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: route
 *         schema:
 *           type: string
 *         default: "/api/auth/login"
 *         description: The route to check rate limit status for
 *     responses:
 *       200:
 *         description: Rate limit status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     isBlocked:
 *                       type: boolean
 *                     remainingTime:
 *                       type: integer
 *                       description: Seconds until unblocked
 *                     attempts:
 *                       type: object
 */

/**
 * @swagger
 * /auth/approve-pending-user:
 *   post:
 *     summary: Admin approve pending user registrations
 *     description: Admin endpoint to approve multiple pending user registrations and send activation codes
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
 *           example:
 *             user_ids: [1, 2, 3]
 *     responses:
 *       200:
 *         description: Approval results returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 */
