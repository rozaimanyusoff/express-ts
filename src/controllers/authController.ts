import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { findUserByEmailOrContact, registerUser, validateActivation, activateUser, verifyLoginCredentials, updateLastLogin, updateUserPassword, findUserByResetToken, updateUserResetTokenAndStatus, reactivateUser, getUserByEmailAndPassword, updateUserLoginDetails } from '../models/userModel';
import logger from '../utils/logger';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendMail } from '../utils/mailer';
import os from 'os';

dotenv.config();

// Register a new user
export const register = async (req: Request, res: Response): Promise<Response> => {
  const { name, email, contact } = req.body;

  if (!name || !email || !contact) {
    return res.status(400).json({ status: false, message: 'Missing required fields' });
  }

  const activationCode = crypto.randomBytes(32).toString('hex');
  const activationLink = `${process.env.BASE_URL}/activate?code=${activationCode}`;

  try {
    const existingAccounts = await findUserByEmailOrContact(email, contact);

    if (existingAccounts.length > 0) {
      return res.status(400).json({ status: false, message: 'The requested credentials already exist' });
    }

    await registerUser(name, email, contact, activationCode);

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
      status: true,
      message: 'Registration successful. Please check your email to activate your account.',
    });
  } catch (error: unknown) {
    logger.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Validate user prior to registration
export const validateActivationDetails = async (req: Request, res: Response): Promise<Response> => {
  const { email, contact, activationCode } = req.body;

  try {
    const validation: any = await validateActivation(email, contact, activationCode);
    if (validation.valid) {
      return res.status(200).json({ valid: true, message: 'Validation successful' });
    } else {
      return res.status(401).json({ valid: false, message: 'Invalid activation details' });
    }
  } catch (error) {
    logger.error('Validation error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Activate user account
export const activateAccount = async (req: Request, res: Response): Promise<Response> => {
  const { email, contact, activationCode, userType, username, password } = req.body;

  try {
    const activation: any = await activateUser(email, contact, activationCode, userType, username, password);
    if (activation.activated) {

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Account Activation',
        html: `
              <h1>Account Activated</h1>
              <p>Hello ${username},</p>
              <p>Your account has been activated successfully.</p>
              <p>You can now login to your account.</p>
              <a href="${process.env.FRONTEND_URL}/login">Login</a>
              <p>Account details:</p>
              <ul>
                <li>Username: ${username}</li>
                <li>Email: ${email}</li>
                <li>Contact: ${contact}</li>
              </ul>
              <p>Thank you!</p>
        `,
      };

      await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

      return res.status(200).json({ message: activation.message });
    } else {
      return res.status(401).json({ message: activation.message });
    }
  } catch (error) {
    logger.error('Activation error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Login user
export const login = async (req: Request, res: Response): Promise<Response> => {
  const { emailOrUsername, password } = req.body;
  try {
    const result: any = await verifyLoginCredentials(emailOrUsername, password);

    if (!result.success) {
      return res.status(401).json({ message: result.message });
    }

    if (result.user.status === 0) {
      return res.status(403).json({ message: 'Account not activated. Please check your email for the activation link.' });
    }

    if (result.user.status === 3) {
      return res.status(403).json({ message: 'Password reset required. Please check your email for the reset link.' });
    }

    await updateLastLogin(result.user.id);

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

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        contact: result.user.contact,
        name: result.user.name,
        status: result.user.status,
        lastNav: result.user.lastNav,
        lastLogin: result.user.lastLogin,
        role: result.user.role,
        accessgroups: result.user.accessgroups,
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Reset password controller
export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  const { email, contact } = req.body;

  try {
    const users = await findUserByEmailOrContact(email, contact);
    const user = users[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
              <a href="${process.env.FRONTEND_URL}/resetpass/${resetToken}">Reset Password</a>
              <p>This link will expire in 1 hour.</p>
              <p>Thank you!</p>
          `
    };

    await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

    return res.status(200).json({ message: 'Reset password email sent successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    return res.status(500).json({ message: 'Error processing reset password request' });
  }
};

// Validate reset password token
export const verifyResetToken = async (req: Request, res: Response): Promise<Response> => {
  const { token } = req.body;

  try {
      const user = await findUserByResetToken(token);
      if (!user) {
          return res.status(400).json({
              valid: false,
              message: 'Invalid reset link'
          });
      }

      const [payloadBase64] = token.split('-');
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

      if (Date.now() > payload.x) {
          await reactivateUser(user.id);

          return res.status(400).json({
              valid: false,
              message: 'Reset link has expired. Your account has been reactivated. Please login with your previous credentials or request a new reset link.'
          });
      }

      return res.json({
          valid: true,
          email: user.email,
          contact: user.contact
      });
  } catch (error) {
      logger.error('Token verification error:', error);
      return res.status(400).json({
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
              message: 'Invalid or expired reset token'
          });
      }

      if (user.email !== email || user.contact !== contact) {
          return res.status(400).json({
              message: 'Invalid credentials'
          });
      }

      const [payloadBase64] = token.split('-');
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

      if (Date.now() > payload.x) {
          await reactivateUser(user.id);
          return res.status(400).json({
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
              <p>Hello ${user.name},</p>
              <p>Your password has been successfully changed.</p>
              <p>If you did not make this change, please contact our support team immediately.</p>
              <p>You can login with your new password at:</p>
              <a href="${process.env.VITE_FRONTEND_URL}/login">Login Here</a>
              <p>Thank you!</p>
          `
      };

      await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);

      return res.json({
          message: 'Password updated successfully'
      });
  } catch (error) {
      logger.error('Update password error:', error);
      return res.status(500).json({
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

      return res.status(200).json({
          success: true,
          message: 'Logged out successfully'
      });
  } catch (error) {
      logger.error('Logout error:', error);
      return res.status(500).json({
          success: false,
          message: 'Error logging out'
      });
  }
};