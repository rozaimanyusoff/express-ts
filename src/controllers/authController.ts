import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { findUserByEmailOrContact, registerUser, validateActivation, activateUser, verifyLoginCredentials, updateLastLogin, updateUserPassword, findUserByResetToken, updateUserResetTokenAndStatus, reactivateUser, getUserByEmailAndPassword, updateUserLoginDetails, logAuthActivity } from '../models/userModel';
import { getNavigationByUserId } from '../models/navModel';
import { getGroupsByUserId, assignGroupByUserId } from '../models/groupModel';
import logger from '../utils/logger';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendMail } from '../utils/mailer';
import os from 'os';
import { URL } from 'url';
import buildNavigationTree from '../utils/navBuilder';

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
      return res.status(400).json({ status: 'error', code: 400, message: 'The requested credentials already exist' });
    }

    const newUserId = (await registerUser(name, email, contact, userType, activationCode)).insertId;

    await assignGroupByUserId(newUserId); // Assign default group to the new user

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Account Activation',
      html: `
        <h1>Account Activation</h1>
        <p>Hello ${name},</p>
        <p>Please activate your account by clicking the link below:</p>
        <a href="${activationLink}">Activate Account</a>
        <p>This link will expire in 24 hours.</p>
        <p>Thank you!</p>
      `,
    };

    await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

    return res.status(201).json({
      status: 'success',
      message: 'Registration successful. Please check your email to activate your account.',
    });
  } catch (error: unknown) {
    logger.error('Registration error:', error);
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
    const activation: any = await activateUser(email, contact, activationCode, username, password);
    if (activation.affectedRows > 0) { // Check if any rows were updated

      const userId = activation.userId; // Assuming the userId is returned in the activation response
      await assignGroupByUserId(userId); // Assign default group to user after activation
      const userGroups = await getGroupsByUserId(userId); // Fetch user groups for the activated user

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Account Activation',
        html: `
              <h1>Account Activated</h1>
              <p>Hello ${username},</p>
              <p>Your account has been activated successfully.</p>
              <p>You can now login to your account.</p>
              <a href="${sanitizedFrontendUrl}/auth/login">Login</a>
              <p>Account details:</p>
              <ul>
                <li>Username: ${username}</li>
                <li>Email: ${email}</li>
                <li>Contact: ${contact}</li>
                <li>Groups: ${userGroups.join(', ')}</li>
              </ul>
              <p>Thank you!</p>
        `,
      };

      await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

      return res.status(200).json({ status: 'success', message: 'Account activated successfully.' });
    } else {
      return res.status(401).json({ status: 'error', code: 401, message: 'Activation failed. Please check your details.' });
    }
  } catch (error) {
    logger.error('Activation error:', error);
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
      from: process.env.VITE_EMAIL_FROM,
      to: email,
      subject: 'Reset Password',
      html: `
              <h1>Reset Password</h1>
              <p>Hello ${user.name},</p>
              <p>Please reset your password by clicking the link below:</p>
              <a href="${sanitizedFrontendUrl}/auth/reset-password?token=${resetToken}">Reset Password</a>
              <p>This link will expire in 1 hour.</p>
              <p>Thank you!</p>
          `
    };

    await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

    return res.status(200).json({ status: 'success', message: 'Reset password email sent successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
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
          return res.status(400).json({
              status: 'error',
              code: 400,
              message: 'Invalid or expired reset token'
          });
      }

      if (user.email !== email || user.contact !== contact) {
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
          return res.status(400).json({
              status: 'error',
              code: 400,
              message: 'Reset token has expired'
          });
      }

      await updateUserPassword(email, contact, newPassword);

      await reactivateUser(user.id);

      const mailOptions = {
          from: process.env.VITE_EMAIL_FROM,
          to: email,
          subject: 'Password Changed Successfully',
          html: `
              <h1>Password Changed</h1>
              <p>Hello ${user.fname},</p>
              <p>Your password has been successfully changed.</p>
              <p>If you did not make this change, please contact our support team immediately.</p>
              <p>You can login with your new password at:</p>
              <a href="${sanitizedFrontendUrl}/auth/login">Login Here</a>
              <p>Thank you!</p>
          `
      };

      await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

      return res.json({
          status: 'success',
          message: 'Password updated successfully'
      });
  } catch (error) {
      logger.error('Update password error:', error);
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
    return res.status(401).json({ status: 'error', code: 401, message: 'No token provided' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (typeof decoded !== 'object' || !('userId' in decoded)) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid token' });
    }

    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email, contact: decoded.contact },
      process.env.JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    return res.status(200).json({
      status: 'success',
      token: newToken,
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    return res.status(401).json({ status: 'error', code: 401, message: 'Invalid or expired refresh token' });
  }
};