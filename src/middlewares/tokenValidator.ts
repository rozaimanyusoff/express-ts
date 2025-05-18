// filepath: /Users/rozaiman/express-ts/src/middlewares/tokenValidator.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const tokenValidator = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access denied. No token provided.' });
    return; // ✅ Exit the function here!
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Ensure req.user.id is set, even if payload uses userId
    if (typeof decoded === 'object' && decoded !== null) {
      req.user = decoded;
      if (!('id' in req.user) && 'userId' in decoded) {
        (req.user as any).id = (decoded as any).userId;
      }
    } else {
      req.user = {};
    }
    next(); // ✅ Proceed to next middleware
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
    return; // ✅ Exit after response
  }
};

export default tokenValidator;