// filepath: /src/controllers/authController.ts
import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { findUserByEmailOrContact, registerUser, validateActivation, activateUser, verifyLoginCredentials, updateLastLogin, getUserByEmailAndPassword } from '../models/userModel';
import logger from '../utils/logger';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import accountValidator from '../middlewares/accountValidator';
import { sendMail } from '../utils/mailer';

dotenv.config();

// Register a new user
export const register = async (req: Request, res: Response) => {
  const { name, email, contact } = req.body;

  const activationCode = crypto.randomBytes(32).toString('hex');
  const activationLink = `${process.env.BASE_URL}/activate?code=${activationCode}`;

  try {
    // check existing user
    const existingUser = await findUserByEmailOrContact(email, contact);
    if (existingUser) {
      return res.status(400).json({ message: 'The requested credentials already exists' });
    }

    // register user
    await registerUser(name, email, contact, activationCode);

    //send activation email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Account Activation',
      html: `
            <h1>Account Activation</h1>
            <p>Hello ${name},</p>
            <p>Please activate your account by clicking the link below:</p>
            <a href="${process.env.FRONTEND_URL}/activate/${activationLink}">${activationLink}</a>
            <p>This link will expire in 24 hours.</p>
            <p>Thank you!</p>
      `,
    };

    await sendMail(mailOptions.to, mailOptions.subject, mailOptions.html);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Validate user prior to registration
export const validateActivationDetails = async (req: Request, res: Response) => {
  const { email, contact, activationCode } = req.body;

  try {
    const validation: any = await validateActivation(email, contact, activationCode);
    if (validation.valid) {
      res.status(200).json({ valid: true, message: 'Validation successful' });
    } else {
      res.status(401).json({ valid: false, message: 'Invalid activation details' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Activate user account
export const activateAccount = async (req: Request, res: Response) => {
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

      res.status(200).json({ message: activation.message });
    } else {
      res.status(401).json({ message: activation.message });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Login user
export const login = async (req: Request, res: Response) => {
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

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const token = jwt.sign({ userId: result.user.id, email: result.user.email, contact: result.user.contact }, process.env.JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });

    res.status(200).json({ 
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
    logger.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};