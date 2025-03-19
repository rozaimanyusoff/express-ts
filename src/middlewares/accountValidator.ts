// filepath: /Users/rozaiman/express-ts/src/middlewares/accountValidator.ts
import { Request, Response, NextFunction } from 'express';
import pool from '../utils/db';

const accountValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { username, email } = req.body;

  try {
    const [usernameRows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (Array.isArray(usernameRows) && usernameRows.length > 0) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    const [emailRows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (Array.isArray(emailRows) && emailRows.length > 0) {
      return res.status(400).json({ message: 'Email already exists.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default accountValidator;