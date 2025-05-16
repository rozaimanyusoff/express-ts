import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { findUserByEmailOrContact, registerUser, validateActivation, activateUser, verifyLoginCredentials, updateLastLogin, updateUserPassword, findUserByResetToken, updateUserResetTokenAndStatus, reactivateUser, getUserByEmailAndPassword, updateUserLoginDetails, logAuthActivity } from '../models/userModel';
import { getNavigationByUserId } from '../models/navModel';
import { getGroupsByUserId, assignGroupByUserId } from '../models/groupModel';
import { createNotification, createAdminNotification } from '../models/notificationModel';
import logger from '../utils/logger';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendMail } from '../utils/mailer';
import os from 'os';
import { URL } from 'url';
import buildNavigationTree from '../utils/navBuilder';
import { accountActivationTemplate } from '../utils/emailTemplates/accountActivation';
import { accountActivatedTemplate } from '../utils/emailTemplates/accountActivated';
import { resetPasswordTemplate } from '../utils/emailTemplates/resetPassword';
import { passwordChangedTemplate } from '../utils/emailTemplates/passwordChanged';

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

    const activationCode = crypto.randomBytes(32).toString('hex');
    const activationLink = `${sanitizedFrontendUrl}/auth/activate?code=${activationCode}`;

    try {
        const existingAccounts = await findUserByEmailOrContact(email, contact);

        if (existingAccounts.length > 0) {
            await logAuthActivity(0, 'register', 'fail', { reason: 'duplicate' }, req);
            return res.status(400).json({ status: 'error', code: 400, message: 'The requested credentials already exist' });
        }

        // Send activation email first
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Account Activation',
            html: accountActivationTemplate(name, activationLink),
        };

        try {
            await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);
        } catch (mailError) {
            logger.error('Activation email send error:', mailError);
            await logAuthActivity(0, 'register', 'fail', { reason: 'email_failed' }, req);
            return res.status(500).json({ status: 'error', code: 500, message: 'Failed to send activation email. Registration aborted.' });
        }

        // Only register user if email sent successfully
        const newUserId = (await registerUser(name, email, contact, userType, activationCode)).insertId;
        // Only assign group on activation, not during registration
        // await assignGroupByUserId(newUserId); // REMOVE this line to prevent duplicate group assignment
        await logAuthActivity(newUserId, 'register', 'success', {}, req);

        // Notify admin of new registration (in-app notification)

        await createNotification({
            userId: newUserId,
            type: 'registration',
            message: `New user registered: ${name} (${email})`,
        });

        return res.status(201).json({
            status: 'success',
            message: 'Registration successful. Please check your email to activate your account.',
        });
    } catch (error: unknown) {
        logger.error('Registration error:', error);
        await logAuthActivity(0, 'register', 'fail', { reason: 'exception', error: String(error) }, req);
        return res.status(500).json({ status: 'error', code: 500, message: 'Internal server error' });
    }
};

// Validate user prior to registration
export const validateActivationDetails = async (req: Request, res: Response): Promise<Response> => {
    const { email, contact, activationCode } = req.body;

    try {
        const validation: any = await validateActivation(email, contact, activationCode);
        if (validation.valid) {
            return res.status(200).json({ status: 'success', message: 'Validation successful' });
        } else {
            return res.status(401).json({ status: 'error', code: 401, message: 'Invalid activation details' });
        }
    } catch (error) {
        logger.error('Validation error:', error);
        return res.status(500).json({ status: 'error', code: 500, message: 'Internal server error' });
    }
}

// Activate user account
export const activateAccount = async (req: Request, res: Response): Promise<Response> => {
    const { email, contact, activationCode, username, password } = req.body;

    try {
        // 1. Validate activation details (simulate what activateUser would do, but do not activate yet)
        const validation: any = await validateActivation(email, contact, activationCode);
        if (!validation.valid || !validation.user) {
            // Check if user exists and is already activated
            const existingUsers = await findUserByEmailOrContact(email, contact);
            if (existingUsers.length > 0 && existingUsers[0].activated_at) {
                logger.info('Activation attempt for already activated account', { email, contact });
                await logAuthActivity(existingUsers[0].id, 'activate', 'fail', { reason: 'already_activated', email, contact }, req);
                return res.status(409).json({ status: 'error', code: 409, message: 'Account already activated. Please log in.' });
            }
            logger.error('Activation failed: invalid activation details', { email, contact, activationCode });
            await logAuthActivity(0, 'activate', 'fail', { reason: 'invalid_activation_details', email, contact }, req);
            return res.status(401).json({ status: 'error', code: 401, message: 'Activation failed. Please check your details.' });
        }
        const userId = validation.user.id;
        if (!userId || !Number.isInteger(userId) || userId <= 0) {
            logger.error('Activation failed: invalid or missing userId', { validation });
            await logAuthActivity(0, 'activate', 'fail', { reason: 'invalid_userid', email, contact, validation }, req);
            return res.status(401).json({ status: 'error', code: 401, message: 'Activation failed. Please check your details.' });
        }

        // 2. Assign group
        await assignGroupByUserId(userId, 5);
        // Fetch group names instead of just IDs
        const groupModel = require('../models/groupModel');
        const groupIds = await getGroupsByUserId(userId);
        const groupNames = await Promise.all(
            groupIds.map(async (groupId: number) => {
                const group = await groupModel.getGroupById(groupId);
                return group ? group.name : null;
            })
        );

        // 3. Send activation email
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
            await logAuthActivity(userId, 'activate', 'fail', { reason: 'email_failed', email, contact }, req);
            return res.status(500).json({ status: 'error', code: 500, message: 'Failed to send activation email. Activation aborted.' });
        }

        // Notify all admins about the new user activation
        await createAdminNotification({
            type: 'activation',
            message: `User ${username} (${email}) has activated their account.`
        });

        // 4. Only now, activate the user in DB
        const activation: any = await activateUser(email, contact, activationCode, username, password);
        if (activation.affectedRows > 0) {
            await logAuthActivity(userId, 'activate', 'success', {}, req);
            return res.status(200).json({ status: 'success', message: 'Account activated successfully.' });
        } else {
            logger.error('Activation failed at DB update', { activation });
            await logAuthActivity(userId, 'activate', 'fail', { reason: 'activation_failed_db', email, contact, activation }, req);
            return res.status(401).json({ status: 'error', code: 401, message: 'Activation failed. Please check your details.' });
        }
    } catch (error) {
        logger.error('Activation error:', error);
        await logAuthActivity(0, 'activate', 'fail', { reason: 'exception', error: String(error), email, contact }, req);
        return res.status(500).json({ status: 'error', code: 500, message: 'Internal server error' });
    }
}

// Login user
export const login = async (req: Request, res: Response): Promise<Response> => {
    const { emailOrUsername, password } = req.body;
    try {
        const result: any = await verifyLoginCredentials(emailOrUsername, password);

        if (!result.success) {
            return res.status(401).json({ status: 'error', code: 401, message: result.message });
        }

        if (result.user.status === 0) {
            return res.status(403).json({ status: 'error', code: 403, message: 'Account not activated. Please check your email for the activation link.' });
        }

        if (result.user.status === 3) {
            return res.status(403).json({ status: 'error', code: 403, message: 'Password reset required. Please check your email for the reset link.' });
        }

        await updateLastLogin(result.user.id);
        await logAuthActivity(result.user.id, 'login', 'success', {}, req);

        const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        const userHost = req.hostname || null;
        const userOs = req.headers['user-agent'] || os.platform();

        await updateUserLoginDetails(result.user.id, {
            ip: userIp,
            host: userHost,
            os: userOs
        });

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }

        const token = jwt.sign({ userId: result.user.id, email: result.user.email, contact: result.user.contact }, process.env.JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });

        const navigation = await getNavigationByUserId(result.user.id); // Fetch navigation tree based on user ID

        // Remove duplicate nav items by navId at the flat level
        const uniqueFlatNavItems = Array.from(
            new Map(
                navigation.map((nav) => [nav.navId ?? nav.id, { ...nav, navId: nav.navId ?? nav.id }])
            ).values()
        );

        const flatNavItems = uniqueFlatNavItems.map((nav) => ({
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
        const userRole = await require('../models/roleModel').getRoleById(result.user.role);
        const roleObj = userRole ? { id: userRole.id, name: userRole.name } : null;

        // Fetch user groups as objects
        const groupModel = require('../models/groupModel');
        const groupIds = await groupModel.getGroupsByUserId(result.user.id);
        const usergroups = await Promise.all(
            groupIds.map(async (groupId: number) => {
                const group = await groupModel.getGroupById(groupId);
                return group ? { id: group.id, name: group.name } : null;
            })
        );

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
        const users = await findUserByEmailOrContact(email, contact);
        const user = users[0];
        if (!user) {
            await logAuthActivity(0, 'reset_password', 'fail', { reason: 'user_not_found', email, contact }, req);
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

        await updateUserResetTokenAndStatus(user.id, resetToken, 3);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Reset Password',
            html: resetPasswordTemplate(user.fname || user.username, `${sanitizedFrontendUrl}/auth/reset-password?token=${resetToken}`),
        };

        await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

        await logAuthActivity(user.id, 'reset_password', 'success', {}, req);
        return res.status(200).json({ status: 'success', message: 'Reset password email sent successfully' });
    } catch (error) {
        logger.error('Reset password error:', error);
        await logAuthActivity(0, 'reset_password', 'fail', { reason: 'exception', error: String(error), email, contact }, req);
        return res.status(500).json({ status: 'error', code: 500, message: 'Error processing reset password request' });
    }
};

// Validate reset password token
export const verifyResetToken = async (req: Request, res: Response): Promise<Response> => {
    const { token } = req.body;

    try {
        const user = await findUserByResetToken(token);
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
            await reactivateUser(user.id);

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
        const user = await findUserByResetToken(token);
        if (!user) {
            await logAuthActivity(0, 'reset_password', 'fail', { reason: 'invalid_token', email, contact }, req);
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Invalid or expired reset token'
            });
        }

        if (user.email !== email || user.contact !== contact) {
            await logAuthActivity(user.id, 'reset_password', 'fail', { reason: 'invalid_credentials', email, contact }, req);
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Invalid credentials'
            });
        }

        const [payloadBase64] = token.split('-');
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

        if (Date.now() > payload.x) {
            await reactivateUser(user.id);
            await logAuthActivity(user.id, 'reset_password', 'fail', { reason: 'expired_token', email, contact }, req);
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Reset token has expired'
            });
        }

        await updateUserPassword(email, contact, newPassword);
        await reactivateUser(user.id);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Password Changed Successfully',
            html: passwordChangedTemplate(user.fname || user.username, `${sanitizedFrontendUrl}/auth/login`),
        };

        await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

        await logAuthActivity(user.id, 'reset_password', 'success', {}, req);
        return res.json({
            status: 'success',
            message: 'Password updated successfully'
        });
    } catch (error) {
        logger.error('Update password error:', error);
        await logAuthActivity(0, 'reset_password', 'fail', { reason: 'exception', error: String(error), email, contact }, req);
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
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        await logAuthActivity((req as any).user?.id || 0, 'logout', 'success', {}, req);

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
        await logAuthActivity(0, 'other', 'fail', { reason: 'no_token' }, req);
        return res.status(401).json({ status: 'error', code: 401, message: 'No token provided' });
    }

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (typeof decoded !== 'object' || !('userId' in decoded)) {
            await logAuthActivity(0, 'other', 'fail', { reason: 'invalid_token' }, req);
            return res.status(401).json({ status: 'error', code: 401, message: 'Invalid token' });
        }

        const newToken = jwt.sign(
            { userId: decoded.userId, email: decoded.email, contact: decoded.contact },
            process.env.JWT_SECRET,
            { expiresIn: '1h', algorithm: 'HS256' }
        );

        await logAuthActivity(decoded.userId, 'other', 'success', {}, req);
        return res.status(200).json({
            status: 'success',
            token: newToken,
        });
    } catch (error) {
        logger.error('Refresh token error:', error);
        await logAuthActivity(0, 'other', 'fail', { reason: 'exception', error: String(error) }, req);
        return res.status(401).json({ status: 'error', code: 401, message: 'Invalid or expired refresh token' });
    }
};