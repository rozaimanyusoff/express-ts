import { Request, Response } from 'express';
import dotenv from 'dotenv';
import * as userModel from '../../p.user/userModel';
import * as navModel from '../../p.nav/navModel';
import * as groupModel from '../../p.group/groupModel';
import * as pendingUserModel from '../../p.user/pendingUserModel';
import * as logModel from '../../p.admin/logModel';
import * as notificationModel from '../../p.admin/notificationModel';
import logger from '../../utils/logger';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendMail } from '../../utils/mailer';
import os from 'os';
import { URL } from 'url';
import buildNavigationTree from '../../utils/navBuilder';
import { accountActivationTemplate } from '../../utils/emailTemplates/accountActivation';
import { accountActivatedTemplate } from '../../utils/emailTemplates/accountActivated';
import { resetPasswordTemplate } from '../../utils/emailTemplates/resetPassword';
import { passwordChangedTemplate } from '../../utils/emailTemplates/passwordChanged';
import { v4 as uuidv4 } from 'uuid';
import * as assetModel from '../../p.asset/assetModel';
import {pool} from '../../utils/db';

dotenv.config();

// Sanitize FRONTEND_URL using regex to remove redundant slashes
let sanitizedFrontendUrl;
try {
    sanitizedFrontendUrl = (process.env.FRONTEND_URL ?? '').replace(/([^:]\/\/)+/g, '$1');
    new URL(sanitizedFrontendUrl); // Validate the URL
} catch (error) {
    logger.error('Invalid FRONTEND_URL in environment variables:', error);
    throw new Error('Invalid FRONTEND_URL in environment variables');
}

// Register a new user
export const register = async (req: Request, res: Response): Promise<Response> => {
    const { name, email, contact, userType } = req.body;

    if (!name || !email || !contact || !userType) {
        return res.status(400).json({ status: 'error', code: 400, message: 'Missing required fields' });
    }

    try {
        // Check for duplicates in both users and pending_users
        const existingAccounts = await userModel.findUserByEmailOrContact(email, contact);
        const pendingAccounts = await pendingUserModel.findPendingUserByEmailOrContact(email, contact);
        if (existingAccounts.length > 0 || pendingAccounts.length > 0) {
            await logModel.logAuthActivity(0, 'register', 'fail', { reason: 'duplicate' }, req);
            return res.status(400).json({ status: 'error', code: 400, message: 'The requested credentials already exist or are pending activation' });
        }

        // Only create pending user, do not send activation email
        await pendingUserModel.createPendingUser({
            fname: name,
            email,
            contact,
            user_type: userType,
            status: 2, // Will be set on approval
            ip: req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || null,
            user_agent: req.headers['user-agent'] || null,
        });

        // Notify admin of new registration (in-app notification)
        await notificationModel.createNotification({
            userId: 0,
            type: 'registration',
            message: `New user registration pending admin approval: ${name} (${email})`,
        });

        // Send email to user: registration received, pending admin approval
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Registration Received - Pending Approval',
            html: `<p>Hi ${name},</p><p>Your registration has been received and is pending admin approval. You will receive an activation link via email once your account is approved.</p>`,
        };
        await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

        return res.status(201).json({
            status: 'success',
            message: 'Registration successful. Awaiting admin approval.',
        });
    } catch (error: unknown) {
        logger.error('Registration error:', error);
        await logModel.logAuthActivity(0, 'register', 'fail', { reason: 'exception', error: String(error) }, req);
        return res.status(500).json({ status: 'error', code: 500, message: 'Internal server error' });
    }
};

// Admin approves individual registered pending users -- Bulk invites will skipped this step
export const approvePendingUser = async (req: Request, res: Response): Promise<Response> => {
    const { user_ids } = req.body;
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({ status: 'error', message: 'user_ids must be a non-empty array' });
    }
    const results = [];
    for (const pendingUserId of user_ids) {
        try {
            // Fetch pending user
            const [pendingUsers]: any[] = await pool.query('SELECT * FROM pending_users WHERE id = ?', [pendingUserId]);
            const pendingUser = pendingUsers && pendingUsers[0];
            if (!pendingUser) {
                results.push({ user_id: pendingUserId, status: 'not_found' });
                continue;
            }
            // Generate activation code and link
            const activationCode = crypto.randomBytes(32).toString('hex');
            const activationLink = `${sanitizedFrontendUrl}/auth/activate?code=${activationCode}`;
            // Update pending user with activation code
            await pool.query('UPDATE pending_users SET activation_code = ? WHERE id = ?', [activationCode, pendingUserId]);
            // Send activation email
            const mailOptions = {
                from: process.env.EMAIL_FROM,
                to: pendingUser.email,
                subject: 'Account Activation',
                html: accountActivationTemplate(pendingUser.fname, activationLink),
            };
            await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);
            await logModel.logAuthActivity(0, 'register', 'success', { pendingUserId }, req);
            results.push({ user_id: pendingUserId, status: 'sent' });
        } catch (error) {
            logger.error('Admin approval error:', error);
            results.push({ user_id: pendingUserId, status: 'error', error: String(error) });
        }
    }
    return res.status(200).json({ status: 'success', results });
};

// Validate user prior to registration
export const validateActivationDetails = async (req: Request, res: Response): Promise<Response> => {
    const { email, contact, activationCode } = req.body;

    try {
        const pendingUser = await pendingUserModel.findPendingUserByActivation(email, contact, activationCode);
        if (pendingUser) {
            return res.status(200).json({ status: 'success', message: 'Validation successful', user_type: pendingUser.user_type });
        } else {
            return res.status(401).json({ status: 'error', code: 401, message: 'Invalid activation details' });
        }
    } catch (error) {
        logger.error('Validation error:', error);
        return res.status(500).json({ status: 'error', code: 500, message: 'Internal server error' });
    }
}

// Activate user account from bulk invite or individual registration
export const activateAccount = async (req: Request, res: Response): Promise<Response> => {
    const { email, contact, activationCode, username, password } = req.body;

    try {
        // 1. Validate activation details in pending_users
        const pendingUser = await pendingUserModel.findPendingUserByActivation(email, contact, activationCode);
        if (!pendingUser) {
            // Check if user exists and is already activated
            const existingUsers = await userModel.findUserByEmailOrContact(email, contact);
            if (existingUsers.length > 0 && existingUsers[0].activated_at) {
                logger.info('Activation attempt for already activated account', { email, contact });
                await logModel.logAuthActivity(existingUsers[0].id, 'activate', 'fail', { reason: 'already_activated', email, contact }, req);
                return res.status(409).json({ status: 'error', code: 409, message: 'Account already activated. Please log in.' });
            }
            logger.error('Activation failed: invalid activation details', { email, contact, activationCode });
            await logModel.logAuthActivity(0, 'activate', 'fail', { reason: 'invalid_activation_details', email, contact }, req);
            return res.status(401).json({ status: 'error', code: 401, message: 'Activation failed. Please check your details.' });
        }

        // 2. Move user from pending_users to users table
        const newUserResult = await userModel.registerUser(
            pendingUser.fname,
            pendingUser.email,
            pendingUser.contact,
            pendingUser.user_type,
            activationCode
        );
        const newUserId = newUserResult.insertId;

        // 3. Set username and password, activate user
        await userModel.activateUser(email, contact, activationCode, username, password);

        // 4. Delete from pending_users
        await pendingUserModel.deletePendingUser(pendingUser.id!);

        // 5. Assign group
        await groupModel.assignGroupByUserId(newUserId, 5);
        // Fetch group names instead of just IDs
        const groupIds = await groupModel.getGroupsByUserId(newUserId);
        const groupNames = await Promise.all(
            groupIds.map(async (groupId: number) => {
                const group = await groupModel.getGroupById(groupId);
                return group ? group.name : null;
            })
        );

        // 6. Send activation email
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Account Activation',
            html: accountActivatedTemplate(
                username,
                email,
                contact,
                groupNames.filter(Boolean).join(', '),
                `${sanitizedFrontendUrl}/auth/login`
            ),
        };
        try {
            await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);
        } catch (mailError) {
            logger.error('Activation email send error:', mailError);
            await logModel.logAuthActivity(newUserId, 'activate', 'fail', { reason: 'email_failed', email, contact }, req);
            return res.status(500).json({ status: 'error', code: 500, message: 'Failed to send activation email. Activation aborted.' });
        }

        // Notify all admins about the new user activation
        await notificationModel.createAdminNotification({
            type: 'activation',
            message: `User ${username} (${email}) has activated their account.`
        });

        await logModel.logAuthActivity(newUserId, 'activate', 'success', {}, req);
        return res.status(200).json({ status: 'success', message: 'Account activated successfully.' });
    } catch (error) {
        logger.error('Activation error:', error);
        await logModel.logAuthActivity(0, 'activate', 'fail', { reason: 'exception', error: String(error), email, contact }, req);
        return res.status(500).json({ status: 'error', code: 500, message: 'Internal server error' });
    }
}

// Login user
export const login = async (req: Request, res: Response): Promise<Response> => {
    const { emailOrUsername, password } = req.body;
    try {
        const result: any = await userModel.verifyLoginCredentials(emailOrUsername, password);

        if (!result.success) {
            return res.status(401).json({ status: 'error', code: 401, message: result.message });
        }

        if (result.user.status === 0) {
            return res.status(403).json({ status: 'error', code: 403, message: 'Account not activated. Please check your email for the activation link.' });
        }

        if (result.user.status === 3) {
            return res.status(403).json({ status: 'error', code: 403, message: 'Password reset required. Please check your email for the reset link.' });
        }

        // Single-session enforcement (configurable, allow same browser/IP re-login)
        const singleSessionEnforcement = process.env.SINGLE_SESSION_ENFORCEMENT === 'true';
        if (singleSessionEnforcement) {
            const existingSession = await userModel.getUserSessionToken(result.user.id);
            if (existingSession) {
                // Block login if session exists (optionally, could check user-agent/IP here if desired)
                await logModel.logAuthActivity(result.user.id, 'login', 'fail', { reason: 'already_logged_in' }, req);
                return res.status(403).json({ status: 'error', code: 403, message: 'This account is already logged in elsewhere. Only one session is allowed.' });
            }
        }

        // Set new session token
        const sessionToken = uuidv4();
        await userModel.setUserSessionToken(result.user.id, sessionToken);

        await userModel.updateLastLogin(result.user.id);
        await logModel.logAuthActivity(result.user.id, 'login', 'success', {}, req);

        const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;
        await userModel.updateUserLoginDetails(result.user.id, {
            ip: userIp,
            host: req.hostname || null,
            os: userAgent || os.platform()
        });

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }

        const token = jwt.sign({ userId: result.user.id, email: result.user.email, contact: result.user.contact, session: sessionToken }, process.env.JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });

        const navigation = await navModel.getNavigationByUserId(result.user.id); // Fetch navigation tree based on user ID

        // Remove duplicate nav items by navId at the flat level
        const uniqueFlatNavItems = Array.from(
            new Map(
                navigation.map((nav: any) => [nav.navId ?? nav.id, { ...nav, navId: nav.navId ?? nav.id }])
            ).values()
        );

        const flatNavItems = uniqueFlatNavItems.map((nav: any) => ({
            navId: nav.navId,
            title: nav.title,
            type: nav.type,
            position: nav.position,
            status: nav.status,
            path: nav.path,
            parent_nav_id: nav.parent_nav_id,
            section_id: nav.section_id,
        }));

        const structuredNavTree = buildNavigationTree(flatNavItems); // Build the navigation tree structure

        // Fetch role details
        const userRole = await require('../../p.role/roleModel').getRoleById(result.user.role);
        const roleObj = userRole ? { id: userRole.id, name: userRole.name } : null;

        // Fetch user groups as objects
        const groupIds = await groupModel.getGroupsByUserId(result.user.id);
        const usergroups = await Promise.all(
            groupIds.map(async (groupId: number) => {
                const group = await groupModel.getGroupById(groupId);
                return group ? { id: group.id, name: group.name } : null;
            })
        );

        // Fetch user profile
        const userProfile = await userModel.getUserProfile(result.user.id);
        return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token,
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    username: result.user.username,
                    contact: result.user.contact,
                    name: result.user.fname,
                    userType: result.user.user_type,
                    status: result.user.status,
                    lastNav: result.user.last_nav,
                    role: roleObj,
                    profile: userProfile || {},
                },
                usergroups: usergroups.filter(Boolean),
                navTree: structuredNavTree,
            },
        });
    } catch (error) {
        logger.error('Login error:', error);
        return res.status(500).json({ status: 'error', code: 500, message: 'Internal server error' });
    }
};

// Reset password controller
export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
    const { email, contact } = req.body;

    try {
        const users = await userModel.findUserByEmailOrContact(email, contact);
        const user = users[0];
        if (!user) {
            await logModel.logAuthActivity(0, 'reset_password', 'fail', { reason: 'user_not_found', email, contact }, req);
            return res.status(404).json({ status: 'error', code: 404, message: 'User not found' });
        }

        const payload = {
            e: email.split('@')[0],
            c: contact.slice(-4),
            x: Date.now() + (60 * 60 * 1000)
        };

        const tokenString = Buffer.from(JSON.stringify(payload)).toString('base64');
        const randomBytes = crypto.randomBytes(4).toString('hex');
        const resetToken = `${tokenString}-${randomBytes}`;

        await userModel.updateUserResetTokenAndStatus(user.id, resetToken, 3);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Reset Password',
            html: resetPasswordTemplate(user.fname || user.username, `${sanitizedFrontendUrl}/auth/reset-password?token=${resetToken}`),
        };

        await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

        await logModel.logAuthActivity(user.id, 'reset_password', 'success', {}, req);
        return res.status(200).json({ status: 'success', message: 'Reset password email sent successfully' });
    } catch (error) {
        logger.error('Reset password error:', error);
        await logModel.logAuthActivity(0, 'reset_password', 'fail', { reason: 'exception', error: String(error), email, contact }, req);
        return res.status(500).json({ status: 'error', code: 500, message: 'Error processing reset password request' });
    }
};

// Validate reset password token
export const verifyResetToken = async (req: Request, res: Response): Promise<Response> => {
    const { token } = req.body;

    try {
        const user = await userModel.findUserByResetToken(token);
        if (!user) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                valid: false,
                message: 'Invalid reset link'
            });
        }

        const [payloadBase64] = token.split('-');
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

        if (Date.now() > payload.x) {
            await userModel.reactivateUser(user.id);

            return res.status(400).json({
                status: 'error',
                code: 400,
                valid: false,
                message: 'Reset link has expired. Your account has been reactivated. Please login with your previous credentials or request a new reset link.'
            });
        }

        return res.json({
            status: 'success',
            valid: true,
            email: user.email,
            contact: user.contact
        });
    } catch (error) {
        logger.error('Token verification error:', error);
        return res.status(400).json({
            status: 'error',
            code: 400,
            valid: false,
            message: 'Invalid reset link'
        });
    }
};

// Update password function to match new token format
export const updatePassword = async (req: Request, res: Response): Promise<Response> => {
    const { token, email, contact, newPassword } = req.body;

    try {
        const user = await userModel.findUserByResetToken(token);
        if (!user) {
            await logModel.logAuthActivity(0, 'reset_password', 'fail', { reason: 'invalid_token', email, contact }, req);
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Invalid or expired reset token'
            });
        }

        if (user.email !== email || user.contact !== contact) {
            await logModel.logAuthActivity(user.id, 'reset_password', 'fail', { reason: 'invalid_credentials', email, contact }, req);
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Invalid credentials'
            });
        }

        const [payloadBase64] = token.split('-');
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

        if (Date.now() > payload.x) {
            await userModel.reactivateUser(user.id);
            await logModel.logAuthActivity(user.id, 'reset_password', 'fail', { reason: 'expired_token', email, contact }, req);
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Reset token has expired'
            });
        }

        await userModel.updateUserPassword(email, contact, newPassword);
        await userModel.reactivateUser(user.id);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Password Changed Successfully',
            html: passwordChangedTemplate(user.fname || user.username, `${sanitizedFrontendUrl}/auth/login`),
        };

        await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

        await logModel.logAuthActivity(user.id, 'reset_password', 'success', {}, req);
        return res.json({
            status: 'success',
            message: 'Password updated successfully'
        });
    } catch (error) {
        logger.error('Update password error:', error);
        await logModel.logAuthActivity(0, 'reset_password', 'fail', { reason: 'exception', error: String(error), email, contact }, req);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: 'Error updating password'
        });
    }
};

// Logout controller
export const logout = async (req: Request, res: Response): Promise<Response> => {
    try {
        // Clear session token on logout
        if ((req as any).user?.id) {
            await userModel.setUserSessionToken((req as any).user.id, null);
        }
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        await logModel.logAuthActivity((req as any).user?.id || 0, 'logout', 'success', {}, req);

        return res.status(200).json({
            status: 'success',
            message: 'Logged out successfully'
        });
    } catch (error) {
        logger.error('Logout error:', error);
        return res.status(500).json({
            status: 'error',
            code: 500,
            message: 'Error logging out'
        });
    }
};

// Refresh token controller
export const refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        await logModel.logAuthActivity(0, 'other', 'fail', { reason: 'no_token' }, req);
        return res.status(401).json({ status: 'error', code: 401, message: 'No token provided' });
    }

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }

        // Allow verification of expired tokens for refresh (ignoreExpiration: true)
        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        } catch (err: any) {
            if (err.name === 'TokenExpiredError') {
                // Allow expired tokens for refresh, but verify signature
                decoded = jwt.verify(token, process.env.JWT_SECRET, { 
                    algorithms: ['HS256'], 
                    ignoreExpiration: true 
                });
            } else {
                throw err;
            }
        }

        if (typeof decoded !== 'object' || !('userId' in decoded)) {
            await logModel.logAuthActivity(0, 'other', 'fail', { reason: 'invalid_token' }, req);
            return res.status(401).json({ status: 'error', code: 401, message: 'Invalid token' });
        }

        // Verify user still exists and is active
        const user = await userModel.getUserById(decoded.userId);
        if (!user || user.status !== 1) {
            await logModel.logAuthActivity(decoded.userId, 'other', 'fail', { reason: 'user_inactive' }, req);
            return res.status(401).json({ status: 'error', code: 401, message: 'User account is inactive' });
        }

        // Validate session token if present (for single-session enforcement)
        if (decoded.session) {
            const currentSession = await userModel.getUserSessionToken(decoded.userId);
            if (currentSession !== decoded.session) {
                await logModel.logAuthActivity(decoded.userId, 'other', 'fail', { reason: 'session_mismatch' }, req);
                return res.status(401).json({ status: 'error', code: 401, message: 'Session expired elsewhere' });
            }
        }

        // Generate new session token for enhanced security
        const newSessionToken = uuidv4();
        await userModel.setUserSessionToken(decoded.userId, newSessionToken);

        const newToken = jwt.sign(
            { 
                userId: decoded.userId, 
                email: decoded.email, 
                contact: decoded.contact,
                session: newSessionToken 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h', algorithm: 'HS256' }
        );

        await logModel.logAuthActivity(decoded.userId, 'other', 'success', {}, req);
        return res.status(200).json({
            status: 'success',
            token: newToken,
        });
    } catch (error) {
        logger.error('Refresh token error:', error);
        await logModel.logAuthActivity(0, 'other', 'fail', { reason: 'exception', error: String(error) }, req);
        return res.status(401).json({ status: 'error', code: 401, message: 'Invalid or expired refresh token' });
    }
};

// Batch reset password for multiple users
export const resetPasswordMulti = async (req: Request, res: Response): Promise<Response> => {
    const { user_ids } = req.body;
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({ status: 'error', message: 'user_ids must be a non-empty array' });
    }

    try {
        // Fetch user info for all user_ids using pool directly
        const [users]: any[] = await pool.query('SELECT * FROM users WHERE id IN (?)', [user_ids]);
        if (!users || users.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No users found for the provided IDs' });
        }

        const results = [];
        for (const user of users) {
            try {
                const email = user.email;
                const contact = user.contact;
                const name = user.fname || user.name || user.username || 'User';
                const payload = {
                    e: email.split('@')[0],
                    c: contact ? contact.slice(-4) : '',
                    x: Date.now() + (60 * 60 * 1000)
                };
                const tokenString = Buffer.from(JSON.stringify(payload)).toString('base64');
                const randomBytes = crypto.randomBytes(4).toString('hex');
                const resetToken = `${tokenString}-${randomBytes}`;
                await userModel.updateUserResetTokenAndStatus(user.id, resetToken, 3);

                // Sanitize frontend URL
                let sanitizedFrontendUrl = (process.env.FRONTEND_URL ?? '').replace(/([^:]\/\/)+/g, '$1');
                try { new URL(sanitizedFrontendUrl); } catch (e) { sanitizedFrontendUrl = ''; }

                // Send reset email
                const mailOptions = {
                    from: process.env.EMAIL_FROM,
                    to: email,
                    subject: 'Reset Password',
                    html: resetPasswordTemplate(name, `${sanitizedFrontendUrl}/auth/reset-password?token=${resetToken}`),
                };
                await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);
                results.push({ user_id: user.id, email, status: 'sent' });
            } catch (err) {
                logger.error('Error sending reset email for user', user.id, err);
                results.push({ user_id: user.id, email: user.email, status: 'error', error: (err instanceof Error ? err.message : JSON.stringify(err)) });
            }
        }
        return res.status(200).json({ status: 'success', message: 'Reset password emails processed', results });
    } catch (error) {
        logger.error('Batch reset password error:', error);
        return res.status(500).json({ status: 'error', message: 'Error processing batch reset password request' });
    }
};

// Admin invites multiple users (bypasses approval, sends activation email directly)
export const inviteUsers = async (req: Request, res: Response): Promise<Response> => {
    let { users } = req.body; // users: [{ name, email, contact, userType }]
    // Accept single user object for flexibility
    if (!Array.isArray(users)) {
        if (req.body.fullname || req.body.name) {
            users = [req.body];
        } else {
            return res.status(400).json({ status: 'error', message: 'users must be a non-empty array' });
        }
    }
    if (!users.length) {
        return res.status(400).json({ status: 'error', message: 'users must be a non-empty array' });
    }
    const results = [];
    for (const user of users) {
        // Accept both 'name' and 'fullname' for compatibility
        const name = user.name || user.fullname;
        const email = user.email;
        const contact = user.contact;
        const userType = user.userType || user.user_type;
        // Only require email and contact for duplicate check
        if (!email || !contact) {
            results.push({ email, status: 'error', message: 'Missing required fields' });
            continue;
        }
        try {
            // Normalize email/contact for duplicate check
            const normalizedEmail = email.toLowerCase();
            const normalizedContact = typeof contact === 'string' ? contact.toLowerCase() : contact;
            const existingAccounts = await userModel.findUserByEmailOrContact(normalizedEmail, normalizedContact);
            const pendingAccounts = await pendingUserModel.findPendingUserByEmailOrContact(normalizedEmail, normalizedContact);
            if ((Array.isArray(existingAccounts) && existingAccounts.length > 0) || (Array.isArray(pendingAccounts) && pendingAccounts.length > 0)) {
                results.push({ email, status: 'duplicate' });
                continue;
            }
            // Now require name and userType for invitation
            const name = user.name || user.fullname;
            const userType = user.userType || user.user_type;
            if (!name || !userType) {
                results.push({ email, status: 'error', message: 'Missing required fields' });
                continue;
            }
            // Create pending user with status approved (2)
            const activationCode = crypto.randomBytes(32).toString('hex');
            await pendingUserModel.createPendingUser({
                fname: name,
                email: normalizedEmail,
                contact: normalizedContact,
                user_type: userType,
                status: 2, // approved
                activation_code: activationCode,
                ip: null,
                user_agent: null,
            });
            // Send activation email
            const activationLink = `${sanitizedFrontendUrl}/auth/activate?code=${activationCode}`;
            const mailOptions = {
                from: process.env.EMAIL_FROM,
                to: email,
                subject: 'Account Activation',
                html: accountActivationTemplate(name, activationLink),
            };
            await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);
            results.push({ email, status: 'invited' });
        } catch (error) {
            logger.error('Invite user error:', error);
            results.push({ email, status: 'error', message: String(error) });
        }
    }
    return res.status(200).json({ status: 'success', results });
};

// Delete pending user (admin)
export const deletePendingUser = async (req: Request, res: Response): Promise<Response> => {
    // Accept only `user_ids` in the body. It may be a single id or an array of ids.
    const body: any = req.body || {};
    const raw = body.user_ids;

    if (raw === undefined || raw === null) {
        return res.status(400).json({ status: 'error', message: 'user_ids is required' });
    }

    let userIds: number[] = [];
    if (Array.isArray(raw)) {
        userIds = raw.map((v: any) => Number(v)).filter((n: number) => !Number.isNaN(n));
    } else {
        const n = Number(raw);
        if (Number.isNaN(n)) return res.status(400).json({ status: 'error', message: 'user_ids must contain valid numeric ids' });
        userIds = [n];
    }

    if (!userIds.length) {
        return res.status(400).json({ status: 'error', message: 'user_ids must contain at least one valid id' });
    }

    const results: Array<{ user_id: number; status: string; error?: string }> = [];
    for (const uid of userIds) {
        try {
            const pendingUser = await pendingUserModel.getPendingUserById(uid);
            if (!pendingUser) {
                results.push({ user_id: uid, status: 'not_found' });
                continue;
            }
            await pendingUserModel.deletePendingUser(uid);
            await logModel.logAuthActivity(0, 'other', 'success', { pendingUserId: uid, action: 'delete_pending_user' }, req);
            results.push({ user_id: uid, status: 'deleted' });
        } catch (error) {
            logger.error('Delete pending user error for id ' + uid + ':', error);
            await logModel.logAuthActivity(0, 'other', 'fail', { reason: 'exception', error: String(error), pendingUserId: uid, action: 'delete_pending_user' }, req);
            results.push({ user_id: uid, status: 'error', error: String(error instanceof Error ? error.message : error) });
        }
    }

    return res.status(200).json({ status: 'success', message: 'Pending users processed', results });
}