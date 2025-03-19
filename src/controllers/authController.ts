// filepath: /src/controllers/authController.ts
import { Request, Response } from 'express';
import { createUser, getUserByEmailAndPassword } from '../models/userModel';
import logger from '../utils/logger';

export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  try {
    await createUser(username, email, password);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const rows: any = await getUserByEmailAndPassword(email, password);
    if (Array.isArray(rows) && rows.length > 0) {
      res.status(200).json({ message: 'Login successful' });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};