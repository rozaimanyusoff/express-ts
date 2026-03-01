import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

import * as userModel from '../p.user/userModel';
import { JWT_SECRET, SINGLE_SESSION_ENFORCEMENT } from '../utils/env';
import { AppJwtPayload } from '../types/express';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';

const tokenValidator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    void res.status(401).json({ message: 'Access denied. No token provided.' });
    return;
  }

  // Point 21 FIX: Check if token is blacklisted (logged out)
  if (isTokenBlacklisted(token)) {
    logger.warn('Access attempt with blacklisted token');
    void res.status(401).json({ message: 'Token has been invalidated. Please login again.' });
    return;
  }

  try {
    if (!JWT_SECRET) {
      logger.error('JWT_SECRET is not configured in environment variables');
      void res.status(500).json({ message: 'Server configuration error: JWT secret not set' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    if (typeof decoded === 'object' && decoded !== null) {
      const payload = decoded as AppJwtPayload;
      // Normalise: if token uses `userId` instead of `id`, expose both
      if (!('id' in payload) && 'userId' in payload) {
        payload.id = payload.userId;
      }
      req.user = payload;
    } else {
      req.user = {};
    }

    if (String(SINGLE_SESSION_ENFORCEMENT) === 'true') {
      const appUser = req.user as AppJwtPayload;
      const uid = appUser?.id;
      const sess = appUser?.session;
      if (uid && sess) {
        try {
          const current = await userModel.getUserSessionToken(Number(uid));
          if (!current || current !== sess) {
            void res.status(401).json({ message: 'Session expired or invalidated' });
            return;
          }
        } catch (error) {
          logger.error('Session validation database error:', error);
          void res.status(401).json({ message: 'Session validation failed' });
          return;
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Token validation error:', error);
    void res.status(401).json({ message: 'Invalid or expired token.' });
    return;
  }
};

export default tokenValidator;