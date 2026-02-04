import crypto from 'crypto';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import os from 'os';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';

import { clearClientBlock, recordFailedAttempt, resetAttempts } from '../../middlewares/rateLimiter';
import * as logModel from '../../p.admin/logModel';
import * as notificationModel from '../../p.admin/notificationModel';
import * as assetModel from '../../p.asset/assetModel';
import * as adminModel from '../../p.admin/adminModel';
import * as pendingUserModel from '../../p.user/pendingUserModel';
import * as userModel from '../../p.user/userModel';
import {pool} from '../../utils/db';
import { accountActivatedTemplate } from '../../utils/emailTemplates/accountActivated';
import { accountActivationTemplate } from '../../utils/emailTemplates/accountActivation';
import { adminPincodeTemplate } from '../../utils/emailTemplates/adminPincode';
import { passwordChangedTemplate } from '../../utils/emailTemplates/passwordChanged';
import { resetPasswordTemplate } from '../../utils/emailTemplates/resetPassword';
import logger from '../../utils/logger';
import { sendMail } from '../../utils/mailer';
import buildNavigationTree from '../../utils/navBuilder';
import { toPublicUrl } from '../../utils/uploadUtil';

dotenv.config();

// Lazy-initialize sanitizedFrontendUrl to avoid throwing at module load time
let sanitizedFrontendUrl: string | null = null;

const getSanitizedFrontendUrl = (): string => {
    if (sanitizedFrontendUrl !== null) {
        return sanitizedFrontendUrl;
    }
    
    try {
        const rawUrl = (process.env.FRONTEND_URL ?? '').trim();
        if (!rawUrl) {
            logger.warn('FRONTEND_URL is not configured in environment variables');
            return 'http://localhost:3000'; // Safe fallback
        }
        
        // Use URL constructor to normalize and validate the URL properly
        const urlObj = new URL(rawUrl);
        sanitizedFrontendUrl = urlObj.toString().replace(/\/$/, ''); // Remove trailing slash for consistency
    } catch (error) {
        logger.error('Invalid FRONTEND_URL in environment variables:', error);
        // Use safe fallback instead of throwing
        sanitizedFrontendUrl = 'http://localhost:3000';
    }
    
    return sanitizedFrontendUrl;
};

// Register a new user (mirrors frontend handler validation)
export const register = async (req: Request, res: Response): Promise<Response> => {
    const { contact = '', email = '', name = '', username = '', userType } = req.body || {};

    // Helper: company email check (configurable via COMPANY_EMAIL_DOMAINS env, comma separated)
    const companyDomains = (process.env.COMPANY_EMAIL_DOMAINS || '')
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);
    const isCompanyEmail = (em: string) => {
        if (!companyDomains.length) return true; // If not configured, allow any
        const domain = em.split('@')[1]?.toLowerCase();
        return !!domain && companyDomains.includes(domain);
    };

    const errors: Record<string, string> = {};

    // Name validations
    if (!name.trim()) {
        errors.name = 'Please enter your full name.';
    } else if (!/^[a-zA-Z\s'.-]+$/.test(name)) {
        errors.name = 'Use a valid full name.';
    }

    // Email validations
    if (!email.trim()) {
        errors.email = 'Please enter your email.';
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        errors.email = 'Enter a valid email address.';
    } else if (String(userType) === '1' && !isCompanyEmail(email)) {
        // Employee must use company email
        errors.email = 'Please use your company email for Employee registration.';
    }

    // Contact validations
    if (!contact.trim()) {
        errors.contact = 'Please enter your contact number.';
    } else if (!/^[0-9]{8,12}$/.test(contact)) {
        errors.contact = 'Contact must be 8-12 digits.';
    }

    // Optional username requirement (currently commented in frontend). Keep placeholder if future enforcement.
    // if (String(userType) === '1' && !username.trim()) {
    //     errors.username = 'Please provide your Ramco ID.';
    // }

    // userType basic validation
    if (userType === undefined || userType === null || String(userType).trim() === '') {
        errors.userType = 'User type is required.';
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ code: 400, errors, message: 'Validation failed', status: 'error' });
    }

    // Normalize email/contact for duplicate checks (email lowercased; contact as provided)
    const normalizedEmail = email.toLowerCase();
    const normalizedContact = contact;

    try {
        // Duplicate check (email/contact)
        const existingAccounts = await userModel.findUserByEmailOrContact(normalizedEmail, normalizedContact);
        const pendingAccounts = await pendingUserModel.findPendingUserByEmailOrContact(normalizedEmail, normalizedContact);

        // If already an activated account -> treat as success guidance
        if (existingAccounts.length > 0 && existingAccounts[0].activated_at) {
            return res.status(200).json({ message: 'Account already exists. Please login.', status: 'success' });
        }

        // If pending exists -> idempotent behavior
        if (pendingAccounts.length > 0) {
            const pending = pendingAccounts[0];
            if (Number(userType) === 1) {
                // Employee: generate NEW activation_code on each resend to invalidate old codes
                // Point 17 FIX: Always generate fresh code to prevent old codes being reused
                const activationCode = crypto.randomBytes(32).toString('hex');
                const activationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiration
                await pool.query('UPDATE pending_users SET activation_code = ?, activation_expires_at = ?, status = 2 WHERE id = ?', [activationCode, activationExpiresAt, pending.id]);
                const activationLink = `${getSanitizedFrontendUrl()}/auth/activate?code=${activationCode}`;
                try {
                    await sendMail(normalizedEmail, 'Account Activation (Resent)', accountActivationTemplate(pending.fname || name, activationLink));
                } catch (mailErr) {
                    logger.error('Resend activation email error:', mailErr);
                    return res.status(500).json({ code: 500, message: 'Failed to send activation email. Please try again later.', status: 'error' });
                }
                return res.status(200).json({ message: 'Activation email resent. Please check your inbox.', status: 'success' });
            }
            // Non-employee pending
            return res.status(200).json({ message: 'Registration already received and pending admin approval.', status: 'success' });
        }

        // Username required & uniqueness check only for employees (user_type = 1)
        if (Number(userType) === 1) {
            if (!username.trim()) {
                return res.status(400).json({ code: 400, message: 'Username (Ramco ID) is required for employee registration', status: 'error' });
            }
            try {
                const [userRows]: any[] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username.trim()]);
                const [pendingRows]: any[] = await pool.query('SELECT id FROM pending_users WHERE username = ? LIMIT 1', [username.trim()]);
                if ((Array.isArray(userRows) && userRows.length) || (Array.isArray(pendingRows) && pendingRows.length)) {
                    return res.status(409).json({ code: 409, message: 'Username already in use', status: 'error' });
                }
            } catch (unameErr) {
                logger.error('Username duplicate check error:', unameErr);
                // continue; not fatal
            }
        }

        if (Number(userType) === 1) {
            // Employee flow: immediate activation email (similar to invitation)
            const activationCode = crypto.randomBytes(32).toString('hex');
            await pendingUserModel.createPendingUser({
                activation_code: activationCode,
                contact: normalizedContact,
                email: normalizedEmail,
                fname: name.trim(),
                ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
                method: 'self-register',
                status: 2, // auto-approved state
                user_agent: req.headers['user-agent'] || null,
                user_type: 1,
                username: username.trim(),
            });

            const activationLink = `${getSanitizedFrontendUrl()}/auth/activate?code=${activationCode}`;
            try {
                await sendMail(normalizedEmail, 'Account Activation', accountActivationTemplate(name.trim(), activationLink));
            } catch (mailErr) {
                logger.error('Employee activation email send error:', mailErr);
                return res.status(500).json({ code: 500, message: 'Failed to send activation email', status: 'error' });
            }

            // Optional: notify admins of auto employee registration
            try {
                await notificationModel.createNotification({
                    message: `Employee registration (auto activation sent): ${name} (${normalizedEmail})`,
                    type: 'registration',
                    userId: 0,
                });
            } catch (notifyErr) {
                logger.error('Notification creation error (non-fatal):', notifyErr);
            }

            return res.status(201).json({
                message: 'Registration successful. Please check your email to activate your account.',
                status: 'success',
            });
        } else {
            // Non-employee flow: pending admin approval (no activation code yet)
            await pendingUserModel.createPendingUser({
                activation_code: null,
                contact: normalizedContact,
                email: normalizedEmail,
                fname: name.trim(),
                ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
                method: 'self-register',
                status: 1, // 1 = awaiting admin approval
                user_agent: req.headers['user-agent'] || null,
                user_type: Number(userType),
                username: username?.trim() || null,
            });

            try {
                await notificationModel.createNotification({
                    message: `New user registration pending admin approval: ${name} (${normalizedEmail})`,
                    type: 'registration',
                    userId: 0,
                });
            } catch (notifyErr) {
                logger.error('Notification creation error (non-fatal):', notifyErr);
            }

            try {
                await sendMail(normalizedEmail, 'Registration Received - Pending Approval', `<p>Hi ${name},</p><p>Your registration has been received and is pending admin approval. You will receive an activation link via email once your account is approved.</p>`);
            } catch (mailErr) {
                logger.error('Registration acknowledgement email send error (non-fatal):', mailErr);
            }

            return res.status(201).json({
                message: 'Registration successful. Awaiting admin approval.',
                status: 'success',
            });
        }
    } catch (error: unknown) {
        logger.error('Registration error:', error);
        await logModel.logAuthActivity(0, 'register', 'fail', { error: String(error), reason: 'exception' }, req);
        return res.status(500).json({ code: 500, message: 'Internal server error', status: 'error' });
    }
};

// Admin approves individual registered pending users -- Bulk invites will skipped this step
export const approvePendingUser = async (req: Request, res: Response): Promise<Response> => {
    const { user_ids } = req.body;
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({ message: 'user_ids must be a non-empty array', status: 'error' });
    }
    const results = [];
    for (const pendingUserId of user_ids) {
        try {
            // Fetch pending user
            const [pendingUsers]: any[] = await pool.query('SELECT * FROM pending_users WHERE id = ?', [pendingUserId]);
            const pendingUser = pendingUsers?.[0];
            if (!pendingUser) {
                results.push({ status: 'not_found', user_id: pendingUserId });
                continue;
            }
            // Generate activation code and link
            const activationCode = crypto.randomBytes(32).toString('hex');
            const activationLink = `${getSanitizedFrontendUrl()}/auth/activate?code=${activationCode}`;
            // Update pending user with activation code
            await pool.query('UPDATE pending_users SET activation_code = ?, status = 2 WHERE id = ?', [activationCode, pendingUserId]);
            // Send activation email
            const mailOptions = {
                from: process.env.EMAIL_FROM,
                html: accountActivationTemplate(pendingUser.fname, activationLink),
                subject: 'Account Activation',
                to: pendingUser.email,
            };
            await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);
            await logModel.logAuthActivity(0, 'register', 'success', { pendingUserId }, req);
            results.push({ status: 'sent', user_id: pendingUserId });
        } catch (error) {
            logger.error('Admin approval error:', error);
            results.push({ error: String(error), status: 'error', user_id: pendingUserId });
        }
    }
    return res.status(200).json({ results, status: 'success' });
};

// Validate user prior to registration
export const validateActivationDetails = async (req: Request, res: Response): Promise<Response> => {
    const { activationCode, contact, email } = req.body;

    try {
        const pendingUser = await pendingUserModel.findPendingUserByActivation(email, contact, activationCode);
        if (pendingUser) {
            return res.status(200).json({ message: 'Validation successful', status: 'success', user_type: pendingUser.user_type });
        } else {
            return res.status(401).json({ code: 401, message: 'Invalid activation details', status: 'error' });
        }
    } catch (error) {
        logger.error('Validation error:', error);
        return res.status(500).json({ code: 500, message: 'Internal server error', status: 'error' });
    }
};

// Activate user account from bulk invite or individual registration
export const activateAccount = async (req: Request, res: Response): Promise<Response> => {
    const { activationCode, contact, email, password, username } = req.body;

    try {
        // 1. Validate activation details in pending_users
        const pendingUser = await pendingUserModel.findPendingUserByActivation(email, contact, activationCode);
        if (!pendingUser) {
            // Check if user exists and is already activated
            const existingUsers = await userModel.findUserByEmailOrContact(email, contact);
            if (existingUsers.length > 0 && existingUsers[0].activated_at) {
                logger.info('Activation attempt for already activated account', { contact, email });
                await logModel.logAuthActivity(existingUsers[0].id, 'activate', 'fail', { contact, email, reason: 'already_activated' }, req);
                return res.status(409).json({ code: 409, message: 'Account already activated. Please log in.', status: 'error' });
            }
            logger.error('Activation failed: invalid activation details', { activationCode, contact, email });
            await logModel.logAuthActivity(0, 'activate', 'fail', { contact, email, reason: 'invalid_activation_details' }, req);
            return res.status(401).json({ code: 401, message: 'Activation failed. Please check your details.', status: 'error' });
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

        // 5. Assign group (non-blocking - don't fail activation if group assignment fails)
        try {
            await adminModel.assignGroupByUserId(newUserId, 5);
        } catch (groupError: any) {
            logger.warn('Warning: Could not assign group to user:', { newUserId, error: groupError.message });
            // Continue with activation - group assignment is not critical
        }

        // Fetch group names instead of just IDs
        let groupNames: string[] = [];
        try {
            const groupIds = await adminModel.getGroupsByUserId(newUserId);
            groupNames = (await Promise.all(
                groupIds.map(async (groupId: number) => {
                    try {
                        const group = await adminModel.getGroupById(groupId);
                        return group ? group.name : null;
                    } catch (err: any) {
                        logger.warn(`Could not fetch group ${groupId}:`, err.message);
                        return null;
                    }
                })
            )).filter(Boolean) as string[];
        } catch (groupFetchError: any) {
            logger.warn('Warning: Could not fetch user groups:', groupFetchError.message);
            // Continue with activation - group names not critical for email
        }

        // 6. Send activation email
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            html: accountActivatedTemplate(
                username,
                email,
                contact,
                groupNames.join(', '),
                `${getSanitizedFrontendUrl()}/auth/login`
            ),
            subject: 'Account Activation',
            to: email,
        };
        try {
            await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);
        } catch (mailError) {
            logger.error('Activation email send error:', mailError);
            // Don't fail activation if email fails - user is already created
            logger.warn('Activation email could not be sent, but user account is activated');
        }

        // Notify all admins about the new user activation
        try {
            await notificationModel.createAdminNotification({
                message: `User ${username} (${email}) has activated their account.`,
                type: 'activation'
            });
        } catch (notifError: any) {
            logger.warn('Failed to create admin notification:', notifError);
            // Don't fail activation if notification fails
        }

        await logModel.logAuthActivity(newUserId, 'activate', 'success', {}, req);
        return res.status(200).json({ message: 'Account activated successfully.', status: 'success' });
    } catch (error: any) {
        logger.error('Activation error:', { error: error.message, stack: error.stack });
        await logModel.logAuthActivity(0, 'activate', 'fail', { contact, email, error: String(error.message), reason: 'exception' }, req);
        return res.status(500).json({ 
            code: 500, 
            message: 'Internal server error during activation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            status: 'error' 
        });
    }
}

// Login user
export const login = async (req: Request, res: Response): Promise<Response> => {
    const { emailOrUsername, password } = req.body;
    try {
        const result: any = await userModel.verifyLoginCredentials(emailOrUsername, password);

        if (!result.success) {
            // Count only failed logins towards remaining-attempts
            try { recordFailedAttempt(req); } catch {}
            // Security: do not leak remaining attempts or specific reason
            return res.status(401).json({ code: 401, message: 'Invalid credential', status: 'error' });
        }

        // Validate user object exists and has required fields
        if (!result.user || typeof result.user !== 'object' || !result.user.id) {
            logger.error('Invalid user object returned from credential verification', { userId: result.user?.id });
            return res.status(500).json({ code: 500, message: 'Internal server error', status: 'error' });
        }

        // Check activation status (0 = not activated, 3 = password reset required)
        if (result.user.status === 0) {
            return res.status(403).json({ code: 403, message: 'Account not activated. Please check your email for the activation link.', status: 'error' });
        }

        if (result.user.status === 3) {
            return res.status(403).json({ code: 403, message: 'Password reset required. Please check your email for the reset link.', status: 'error' });
        }

        // Single-session enforcement (configurable, allow same browser/IP re-login)
        const singleSessionEnforcement = process.env.SINGLE_SESSION_ENFORCEMENT === 'true';
        if (singleSessionEnforcement) {
            const existingSession = await userModel.getUserSessionToken(result.user.id);
            if (existingSession) {
                // Block login if session exists (optionally, could check user-agent/IP here if desired)
                await logModel.logAuthActivity(result.user.id, 'login', 'fail', { reason: 'already_logged_in' }, req);
                return res.status(403).json({ code: 403, message: 'This account is already logged in elsewhere. Only one session is allowed.', status: 'error' });
            }
        }

        // Set new session token atomically (clear any previous session)
        const sessionToken = uuidv4();
        await userModel.setUserSessionToken(result.user.id, sessionToken);

    await userModel.updateLastLogin(result.user.id);
        await logModel.logAuthActivity(result.user.id, 'login', 'success', {}, req);

    // On successful login: clear any block and reset failed-attempts counter
    try { clearClientBlock(req); } catch (_) { /* noop */ }
    try { resetAttempts(req); } catch (_) { /* noop */ }

        const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        const userAgent = req.headers['user-agent'] || null;
        await userModel.updateUserLoginDetails(result.user.id, {
            host: req.hostname || null,
            ip: userIp,
            os: userAgent || os.platform()
        });
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }

    const token = jwt.sign({ contact: result.user.contact, email: result.user.email, session: sessionToken, userId: result.user.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
        
        // Fetch navigation based on user's ID and groups
        // Point 19 FIX: Handle group fetch failures gracefully with fallback
        let navigation: any[] = [];
        try {
            const nav = await adminModel.getNavigationByUserId(result.user.id);
            navigation = nav || [];
        } catch (navError) {
            logger.warn(`Warning: Could not fetch navigation for userId=${result.user.id}:`, navError);
            // Continue with empty navigation - user can still login
        }
        
        const uniqueFlatNavItems = Array.from(
            new Map(
                navigation.map((nav: any) => [nav.navId ?? nav.id, { ...nav, navId: nav.navId ?? nav.id }])
            ).values()
        );

        const flatNavItems = uniqueFlatNavItems.map((nav: any) => ({
            navId: nav.navId,
            parent_nav_id: nav.parent_nav_id,
            path: nav.path,
            position: nav.position,
            section_id: nav.section_id,
            status: nav.status,
            title: nav.title,
            type: nav.type,
        }));

        const structuredNavTree = buildNavigationTree(flatNavItems); // Build the navigation tree structure

        // Fetch role details
        const userRole = await adminModel.getRoleById(result.user.role);
        const roleObj = userRole ? {
            create: !!userRole.creates,
            delete: !!userRole.deletes,
            id: userRole.id,
            name: userRole.name,
            update: !!userRole.updates,
            view: !!userRole.views
        } : null;

        // Fetch user groups as objects
        // Point 19 FIX: Handle group fetch errors gracefully
        let usergroups: Array<{ id: number; name: string } | null> = [];
        try {
            const groupIds = await adminModel.getGroupsByUserId(result.user.id);
            usergroups = await Promise.all(
                groupIds.map(async (groupId: number) => {
                    try {
                        const group = await adminModel.getGroupById(groupId);
                        return group ? { id: group.id, name: group.name } : null;
                    } catch (err) {
                        logger.warn(`Failed to fetch group ${groupId} for userId=${result.user.id}:`, err);
                        return null;
                    }
                })
            );
        } catch (groupError) {
            logger.warn(`Warning: Could not fetch user groups for userId=${result.user.id}:`, groupError);
            // Continue with empty groups - user can still login
        }

        // Fetch user profile
        const userProfile = await userModel.getUserProfile(result.user.id);
        const avatarUrl = toPublicUrl((result.user).avatar || null);
        return res.status(200).json({
            data: {
                navTree: structuredNavTree,
                user: {
                    avatar: avatarUrl,
                    contact: result.user.contact,
                    email: result.user.email,
                    id: result.user.id,
                    lastNav: result.user.last_nav,
                    name: result.user.fname,
                    profile: userProfile || {},
                    role: roleObj,
                    status: result.user.status,
                    username: result.user.username,
                    userType: result.user.user_type,
                },
                usergroups: usergroups.filter(Boolean),
            },
            message: 'Login successful',
            status: 'success',
            token,
        });
    } catch (error) {
        logger.error('Login error:', error);
        return res.status(500).json({ code: 500, message: 'Internal server error', status: 'error' });
    }
};

// POST /api/auth/register/verifyme
// Body: { name, email, contact }
// Attempts to match an employee (assetModel employees table) by all three fields.
// Matching strategy (case-insensitive for text):
// 1. Exact email AND contact AND full name (supports name, fname, full_name columns fallback)
// 2. If no exact triple match, attempt exact email + contact (unique pair) and return ramco_id with note.
// 3. If still no match, attempt fuzzy name (case-insensitive) + email.
// Returns { matched: boolean, ramco_id, confidence, strategy } on success.
export const verifyRegisterUser = async (req: Request, res: Response): Promise<Response> => {
    const { contact, email, name } = req.body || {};
    if (!name || !email || !contact) {
        return res.status(400).json({ message: 'Missing required fields (name, email, contact)', status: 'error' });
    }
    try {
        // Load exclusion lists from environment variables (comma-separated) - when matched, skip duplicate check only
        const splitList = (val?: string) => (val || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const EXC_EMAILS = splitList(process.env.VERIFY_EXCLUDE_EMAILS).map(s => s.toLowerCase());
        const EXC_CONTACTS = splitList(process.env.VERIFY_EXCLUDE_CONTACTS).map(s => s.toLowerCase().replace(/[^0-9+]/g, ''));
        const EXC_NAMES = splitList(process.env.VERIFY_EXCLUDE_NAMES).map(s => s.toLowerCase());

        const normLower = (v: any) => String(v || '').trim().toLowerCase();
        const targetNameLower = normLower(name);
        const targetEmailLower = normLower(email);
        const targetContactLower = normLower(contact).replace(/[^0-9+]/g, '');

        const isExcluded = (
            (EXC_EMAILS.length && EXC_EMAILS.includes(targetEmailLower)) ||
            (EXC_CONTACTS.length && EXC_CONTACTS.includes(targetContactLower)) ||
            (EXC_NAMES.length && EXC_NAMES.includes(targetNameLower))
        );

        // Duplicate check (skip if excluded identity)
        if (!isExcluded) {
            try {
                const existingAccounts = await userModel.findUserByEmailOrContact(email, contact);
                const pendingAccounts = await pendingUserModel.findPendingUserByEmailOrContact(email, contact);
                if ((existingAccounts && existingAccounts.length > 0) || (pendingAccounts && pendingAccounts.length > 0)) {
                    return res.status(409).json({ data: { duplicate: true, excluded: false, matched: false }, message: 'Account already exists or is pending activation', status: 'error' });
                }
            } catch (dupErr) {
                logger.error('verifyRegisterUser duplicate check error', dupErr);
                // Continue – not fatal
            }
        }
        // Fetch all employees once (could be optimized with targeted query if schema known)
        const employees: any[] = Array.isArray(await assetModel.getEmployees()) ? await assetModel.getEmployees() as any[] : [];
        const norm = (v: any) => String(v || '').trim().toLowerCase();
        const targetName = norm(name);
        const targetEmail = norm(email);
        const targetContact = norm(contact).replace(/[^0-9+]/g, ''); // digits plus leading +

        // Helper: normalize employee record name/email/contact
        const extract = (emp: any) => {
            const fullName = emp.full_name || emp.name || emp.fname || emp.employee_name || '';
            const emailVal = emp.email || emp.work_email || emp.personal_email || '';
            const contactVal = emp.contact || emp.phone || emp.mobile || emp.contact_no || emp.phone_no || '';
            return {
                contact: norm(String(contactVal).replace(/[^0-9+]/g, '')),
                contactRaw: contactVal || null,
                email: norm(emailVal),
                fullName: norm(fullName),
                fullNameRaw: fullName,
                ramco_id: emp.ramco_id || emp.employee_id || emp.id || null
            };
        };

        const extracted = employees.map(e => ({ original: e, ...extract(e) }));

        // Strategy 1: exact triple match
        const exact = extracted.find(e => e.fullName === targetName && e.email === targetEmail && e.contact === targetContact);
        if (exact?.ramco_id) {
            return res.json({ data: { confidence: 'high', employee_contact: exact.contactRaw, employee_full_name: exact.fullNameRaw, excluded: isExcluded, matched: true, ramco_id: exact.ramco_id, strategy: 'exact_triple' }, message: 'Employee verified (exact match)', status: 'success' });
        }

        // Strategy 2: email + contact match (unique)
        const emailContactMatches = extracted.filter(e => e.email === targetEmail && e.contact === targetContact && e.ramco_id);
        if (emailContactMatches.length === 1) {
            const m = emailContactMatches[0];
            return res.json({ data: { confidence: 'medium', employee_contact: m.contactRaw, employee_full_name: m.fullNameRaw, excluded: isExcluded, matched: true, ramco_id: m.ramco_id, strategy: 'email_contact' }, message: 'Employee verified (email+contact match)', status: 'success' });
        }

        // Strategy 3: name + email
        const nameEmailMatches = extracted.filter(e => e.fullName === targetName && e.email === targetEmail && e.ramco_id);
        if (nameEmailMatches.length === 1) {
            const m = nameEmailMatches[0];
            return res.json({ data: { confidence: 'medium', employee_contact: m.contactRaw, employee_full_name: m.fullNameRaw, excluded: isExcluded, matched: true, ramco_id: m.ramco_id, strategy: 'name_email' }, message: 'Employee verified (name+email match)', status: 'success' });
        }

        // Optional fallback: partial name + email (startswith)
        const partialNameEmailMatches = extracted.filter(e => e.fullName.startsWith(targetName) && e.email === targetEmail && e.ramco_id);
        if (partialNameEmailMatches.length === 1) {
            const m = partialNameEmailMatches[0];
            return res.json({ data: { confidence: 'low', employee_contact: m.contactRaw, employee_full_name: m.fullNameRaw, excluded: isExcluded, matched: true, ramco_id: m.ramco_id, strategy: 'partial_name_email' }, message: 'Employee verified (partial name + email)', status: 'success' });
        }

        return res.status(404).json({ data: { matched: false }, message: 'No matching employee found', status: 'error' });
    } catch (err) {
        logger.error('verifyRegisterUser error', err);
        return res.status(500).json({ message: 'Internal server error', status: 'error' });
    }
};

// Reset password controller
export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
    const { contact, email } = req.body;

    try {
        const users = await userModel.findUserByEmailOrContact(email, contact);
        const user = users[0];
        if (!user) {
            await logModel.logAuthActivity(0, 'reset_password', 'fail', { contact, email, reason: 'user_not_found' }, req);
            return res.status(404).json({ code: 404, message: 'User not found', status: 'error' });
        }

        const payload = {
            c: contact.slice(-4),
            e: email.split('@')[0],
            x: Date.now() + (60 * 60 * 1000)
        };

        const tokenString = Buffer.from(JSON.stringify(payload)).toString('base64');
        const randomBytes = crypto.randomBytes(4).toString('hex');
        const resetToken = `${tokenString}-${randomBytes}`;

        await userModel.updateUserResetTokenAndStatus(user.id, resetToken, 3);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            html: resetPasswordTemplate(user.fname || user.username, `${getSanitizedFrontendUrl()}/auth/reset-password?token=${resetToken}`),
            subject: 'Reset Password',
            to: email,
        };

        await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

        await logModel.logAuthActivity(user.id, 'reset_password', 'success', {}, req);
        return res.status(200).json({ message: 'Reset password email sent successfully', status: 'success' });
    } catch (error) {
        logger.error('Reset password error:', error);
        await logModel.logAuthActivity(0, 'reset_password', 'fail', { contact, email, error: String(error), reason: 'exception' }, req);
        return res.status(500).json({ code: 500, message: 'Error processing reset password request', status: 'error' });
    }
};

// Validate reset password token
export const verifyResetToken = async (req: Request, res: Response): Promise<Response> => {
    const { token } = req.body;

    try {
        const user = await userModel.findUserByResetToken(token);
        if (!user) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid reset link',
                status: 'error',
                valid: false
            });
        }

        const [payloadBase64] = token.split('-');
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

        // Point 18 FIX: Check token expiration AND invalidate expired tokens
        if (Date.now() > payload.x) {
            // Clear expired token from database to prevent reuse
            await userModel.updateUserResetTokenAndStatus(user.id, null, user.status);
            await userModel.reactivateUser(user.id);

            return res.status(400).json({
                code: 400,
                message: 'Reset link has expired. Your account has been reactivated. Please login with your previous credentials or request a new reset link.',
                status: 'error',
                valid: false
            });
        }

        return res.json({
            contact: user.contact,
            email: user.email,
            status: 'success',
            valid: true
        });
    } catch (error) {
        logger.error('Token verification error:', error);
        return res.status(400).json({
            code: 400,
            message: 'Invalid reset link',
            status: 'error',
            valid: false
        });
    }
};

// Update password function to match new token format
export const updatePassword = async (req: Request, res: Response): Promise<Response> => {
    const { contact, email, newPassword, token } = req.body;

    try {
        const user = await userModel.findUserByResetToken(token);
        if (!user) {
            await logModel.logAuthActivity(0, 'reset_password', 'fail', { contact, email, reason: 'invalid_token' }, req);
            return res.status(400).json({
                code: 400,
                message: 'Invalid or expired reset token',
                status: 'error'
            });
        }

        if (user.email !== email || user.contact !== contact) {
            await logModel.logAuthActivity(user.id, 'reset_password', 'fail', { contact, email, reason: 'invalid_credentials' }, req);
            return res.status(400).json({
                code: 400,
                message: 'Invalid credentials',
                status: 'error'
            });
        }

        const [payloadBase64] = token.split('-');
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

        if (Date.now() > payload.x) {
            await userModel.reactivateUser(user.id);
            await logModel.logAuthActivity(user.id, 'reset_password', 'fail', { contact, email, reason: 'expired_token' }, req);
            return res.status(400).json({
                code: 400,
                message: 'Reset token has expired',
                status: 'error'
            });
        }

        await userModel.updateUserPassword(email, contact, newPassword);
        await userModel.reactivateUser(user.id);

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            html: passwordChangedTemplate(user.fname || user.username, `${getSanitizedFrontendUrl()}/auth/login`),
            subject: 'Password Changed Successfully',
            to: email,
        };

        await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

        await logModel.logAuthActivity(user.id, 'reset_password', 'success', {}, req);
        return res.json({
            message: 'Password updated successfully',
            status: 'success'
        });
    } catch (error) {
        logger.error('Update password error:', error);
        await logModel.logAuthActivity(0, 'reset_password', 'fail', { contact, email, error: String(error), reason: 'exception' }, req);
        return res.status(500).json({
            code: 500,
            message: 'Error updating password',
            status: 'error'
        });
    }
};

// Logout controller
// Point 21 FIX: Clear session token on logout to invalidate JWT tokens
export const logout = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = (req as any).user?.id;
        
        // Clear session token on logout - prevents token reuse with single-session enforcement
        if (userId) {
            await userModel.setUserSessionToken(userId, null);
            // Update user logout time and calculate session time_spent
            await userModel.updateUserLogoutAndTimeSpent(userId);
            logger.info(`User ${userId} logged out and session invalidated`);
        }
        
        res.clearCookie('token', {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        });

        await logModel.logAuthActivity(userId || 0, 'logout', 'success', {}, req);

        return res.status(200).json({
            message: 'Logged out successfully',
            status: 'success'
        });
    } catch (error) {
        logger.error('Logout error:', error);
        return res.status(500).json({
            code: 500,
            message: 'Error logging out',
            status: 'error'
        });
    }
};

// Refresh token controller
export const refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        await logModel.logAuthActivity(0, 'other', 'fail', { reason: 'no_token' }, req);
        return res.status(401).json({ code: 401, message: 'No token provided', status: 'error' });
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
            return res.status(401).json({ code: 401, message: 'Invalid token', status: 'error' });
        }

        // Verify user still exists and is active
        const user = await userModel.getUserById(decoded.userId);
        if (!user || user.status !== 1) {
            await logModel.logAuthActivity(decoded.userId, 'other', 'fail', { reason: 'user_inactive' }, req);
            return res.status(401).json({ code: 401, message: 'User account is inactive', status: 'error' });
        }

        // Validate session token if present (for single-session enforcement)
        if (decoded.session) {
            const currentSession = await userModel.getUserSessionToken(decoded.userId);
            if (currentSession !== decoded.session) {
                await logModel.logAuthActivity(decoded.userId, 'other', 'fail', { reason: 'session_mismatch' }, req);
                return res.status(401).json({ code: 401, message: 'Session expired elsewhere', status: 'error' });
            }
        }

        // Generate new session token for enhanced security
        const newSessionToken = uuidv4();
        await userModel.setUserSessionToken(decoded.userId, newSessionToken);

        const newToken = jwt.sign(
            { 
                contact: decoded.contact, 
                email: decoded.email, 
                session: newSessionToken,
                userId: decoded.userId 
            },
            process.env.JWT_SECRET,
            { algorithm: 'HS256', expiresIn: '1h' }
        );

        await logModel.logAuthActivity(decoded.userId, 'other', 'success', {}, req);
        return res.status(200).json({
            status: 'success',
            token: newToken,
        });
    } catch (error) {
        logger.error('Refresh token error:', error);
        await logModel.logAuthActivity(0, 'other', 'fail', { error: String(error), reason: 'exception' }, req);
        return res.status(401).json({ code: 401, message: 'Invalid or expired refresh token', status: 'error' });
    }
};

// Batch reset password for multiple users
export const resetPasswordMulti = async (req: Request, res: Response): Promise<Response> => {
    const { user_ids } = req.body;
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({ message: 'user_ids must be a non-empty array', status: 'error' });
    }

    try {
        // Fetch user info for all user_ids using pool directly
        const [users]: any[] = await pool.query('SELECT * FROM users WHERE id IN (?)', [user_ids]);
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found for the provided IDs', status: 'error' });
        }

        const results = [];
        for (const user of users) {
            try {
                const email = user.email;
                const contact = user.contact;
                const name = user.fname || user.name || user.username || 'User';
                const payload = {
                    c: contact ? contact.slice(-4) : '',
                    e: email.split('@')[0],
                    x: Date.now() + (60 * 60 * 1000)
                };
                const tokenString = Buffer.from(JSON.stringify(payload)).toString('base64');
                const randomBytes = crypto.randomBytes(4).toString('hex');
                const resetToken = `${tokenString}-${randomBytes}`;
                await userModel.updateUserResetTokenAndStatus(user.id, resetToken, 3);

                // Sanitize frontend URL
                const sanitizedFrontendUrl = getSanitizedFrontendUrl();

                // Send reset email
                const mailOptions = {
                    from: process.env.EMAIL_FROM,
                    html: resetPasswordTemplate(name, `${sanitizedFrontendUrl}/auth/reset-password?token=${resetToken}`),
                    subject: 'Reset Password',
                    to: email,
                };
                await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);
                results.push({ email, status: 'sent', user_id: user.id });
            } catch (err) {
                logger.error('Error sending reset email for user', user.id, err);
                results.push({ email: user.email, error: (err instanceof Error ? err.message : JSON.stringify(err)), status: 'error', user_id: user.id });
            }
        }
        return res.status(200).json({ message: 'Reset password emails processed', results, status: 'success' });
    } catch (error) {
        logger.error('Batch reset password error:', error);
        return res.status(500).json({ message: 'Error processing batch reset password request', status: 'error' });
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
            return res.status(400).json({ message: 'users must be a non-empty array', status: 'error' });
        }
    }
    if (!users.length) {
        return res.status(400).json({ message: 'users must be a non-empty array', status: 'error' });
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
            results.push({ email, message: 'Missing required fields', status: 'error' });
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
                results.push({ email, message: 'Missing required fields', status: 'error' });
                continue;
            }
            // Create pending user with status approved (2)
            const activationCode = crypto.randomBytes(32).toString('hex');
            await pendingUserModel.createPendingUser({
                activation_code: activationCode,
                contact: normalizedContact,
                email: normalizedEmail,
                fname: name,
                ip: null,
                method: 'invitation',
                status: 2, // approved
                user_agent: null,
                user_type: userType,
            });
            // Send activation email
            const activationLink = `${getSanitizedFrontendUrl()}/auth/activate?code=${activationCode}`;
            const mailOptions = {
                from: process.env.EMAIL_FROM,
                html: accountActivationTemplate(name, activationLink),
                subject: 'Account Activation',
                to: email,
            };
            await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);
            results.push({ email, status: 'invited' });
        } catch (error) {
            logger.error('Invite user error:', error);
            results.push({ email, message: String(error), status: 'error' });
        }
    }
    return res.status(200).json({ results, status: 'success' });
};

// Delete pending user (admin)
export const deletePendingUser = async (req: Request, res: Response): Promise<Response> => {
    // Accept only `user_ids` in the body. It may be a single id or an array of ids.
    const body: any = req.body || {};
    const raw = body.user_ids;

    if (raw === undefined || raw === null) {
        return res.status(400).json({ message: 'user_ids is required', status: 'error' });
    }

    let userIds: number[] = [];
    if (Array.isArray(raw)) {
        userIds = raw.map((v: any) => Number(v)).filter((n: number) => !Number.isNaN(n));
    } else {
        const n = Number(raw);
        if (Number.isNaN(n)) return res.status(400).json({ message: 'user_ids must contain valid numeric ids', status: 'error' });
        userIds = [n];
    }

    if (!userIds.length) {
        return res.status(400).json({ message: 'user_ids must contain at least one valid id', status: 'error' });
    }

    const results: { error?: string; status: string; user_id: number; }[] = [];
    for (const uid of userIds) {
        try {
            const pendingUser = await pendingUserModel.getPendingUserById(uid);
            if (!pendingUser) {
                results.push({ status: 'not_found', user_id: uid });
                continue;
            }
            await pendingUserModel.deletePendingUser(uid);
            await logModel.logAuthActivity(0, 'other', 'success', { action: 'delete_pending_user', pendingUserId: uid }, req);
            results.push({ status: 'deleted', user_id: uid });
        } catch (error) {
            logger.error('Delete pending user error for id ' + uid + ':', error);
            await logModel.logAuthActivity(0, 'other', 'fail', { action: 'delete_pending_user', error: String(error), pendingUserId: uid, reason: 'exception' }, req);
            results.push({ error: String(error instanceof Error ? error.message : error), status: 'error', user_id: uid });
        }
    }

    return res.status(200).json({ message: 'Pending users processed', results, status: 'success' });
}

/**
 * Send 6-digit pincode to admin for special maintenance mode access
 * Requires: emailOrUsername and role must be 1 (admin)
 */
export const sendAdminPincode = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { emailOrUsername } = req.body || {};

        // Validate input
        if (!emailOrUsername || typeof emailOrUsername !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: 'emailOrUsername is required',
                data: null
            });
        }

        // Find user by username or email
        const user = await userModel.getUserByUsernameOrEmail(emailOrUsername.trim());

        if (!user) {
            logger.warn(`Admin pincode request failed: user not found - ${emailOrUsername}`);
            return res.status(404).json({
                status: 'error',
                message: 'User not found',
                data: null
            });
        }

        // Verify user has admin role (role: 1)
        if (user.role !== 1) {
            logger.warn(`Admin pincode request failed: user ${user.id} does not have admin role (role: ${user.role})`);
            await logModel.logAuthActivity(user.id, 'other', 'fail', { 
                action: 'send_admin_pincode', 
                reason: 'insufficient_role',
                userRole: user.role
            }, req);
            return res.status(403).json({
                status: 'error',
                message: 'You do not have admin access',
                data: null
            });
        }

        // Generate 6-digit pincode
        const pincode = String(Math.floor(100000 + Math.random() * 900000));

        // Store pincode (hashed, 15-minute expiry)
        await userModel.storeAdminPincode(user.id, pincode, 15);

        // Send email with pincode
        const brandName = process.env.BRAND_NAME || 'System Administration';
        const emailContent = adminPincodeTemplate(user.fname || user.username || user.email, pincode, brandName);
        await sendMail(
            user.email,
            '🔐 Admin Access Code - ' + new Date().toLocaleString(),
            emailContent
        );

        logger.info(`Admin pincode sent to user ${user.id} (${user.email})`);
        await logModel.logAuthActivity(user.id, 'other', 'success', { 
            action: 'send_admin_pincode' 
        }, req);

        return res.status(200).json({
            status: 'success',
            message: 'Pincode has been sent to your email',
            data: {
                email: user.email,
                expiresIn: '15 minutes'
            }
        });
    } catch (error) {
        logger.error('Send admin pincode error:', error);
        await logModel.logAuthActivity(0, 'other', 'fail', { 
            action: 'send_admin_pincode', 
            error: String(error instanceof Error ? error.message : error)
        }, req);

        return res.status(500).json({
            status: 'error',
            message: 'Failed to send pincode',
            data: null
        });
    }
}