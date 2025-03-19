// filepath: /Users/rozaiman/express-ts/src/middlewares/tokenValidator.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import '../types/express'; // Import the extended Request type

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const tokenValidator = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

export default tokenValidator;