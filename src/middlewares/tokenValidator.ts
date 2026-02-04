import dotenv from 'dotenv';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import * as userModel from '../p.user/userModel';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';
import logger from '../utils/logger';

dotenv.config();

const { JWT_SECRET, SINGLE_SESSION_ENFORCEMENT } = process.env;

const tokenValidator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access denied. No token provided.' });
    return;
  }

  // Point 21 FIX: Check if token is blacklisted (logged out)
  if (isTokenBlacklisted(token)) {
    logger.warn('Access attempt with blacklisted token');
    res.status(401).json({ message: 'Token has been invalidated. Please login again.' });
    return;
  }

  try {
    if (!JWT_SECRET) {
      logger.error('JWT_SECRET is not configured in environment variables');
      res.status(500).json({ message: 'Server configuration error: JWT secret not set' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    if (typeof decoded === 'object' && decoded !== null) {
      req.user = decoded;
      if (!('id' in req.user) && 'userId' in decoded) {
        (req.user as any).id = (decoded as any).userId;
      }
    } else {
      req.user = {};
    }

    if (String(SINGLE_SESSION_ENFORCEMENT) === 'true') {
      const uid = (req.user as any)?.id;
      const sess = (decoded as any)?.session;
      if (uid && sess) {
        try {
          const current = await userModel.getUserSessionToken(Number(uid));
          if (!current || current !== sess) {
            res.status(401).json({ message: 'Session expired or invalidated' });
            return;
          }
        } catch (error) {
          logger.error('Session validation database error:', error);
          res.status(401).json({ message: 'Session validation failed' });
          return;
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export default tokenValidator;