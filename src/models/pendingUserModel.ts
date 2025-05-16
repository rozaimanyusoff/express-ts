import pool from '../utils/db';
import logger from '../utils/logger';
import { ResultSetHeader } from 'mysql2';

export interface PendingUser {
  id?: number;
  fname: string;
  email: string;
  contact: string;
  user_type: number;
  activation_code: string;
  created_at?: Date;
  ip?: string | null;
  user_agent?: string | null;
}

export const createPendingUser = async (user: PendingUser): Promise<ResultSetHeader> => {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO pending_users (fname, email, contact, user_type, activation_code, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.fname, user.email, user.contact, user.user_type, user.activation_code, user.ip ?? null, user.user_agent ?? null]
    );
    return result;
  } catch (error) {
    logger.error('Database error in createPendingUser:', error);
    throw error;
  }
};

export const findPendingUserByEmailOrContact = async (email: string, contact: string): Promise<PendingUser[]> => {
  try {
    const [rows]: any[] = await pool.query(
      'SELECT * FROM pending_users WHERE email = ? OR contact = ?',
      [email, contact]
    );
    return rows;
  } catch (error) {
    logger.error('Database error in findPendingUserByEmailOrContact:', error);
    throw error;
  }
};

export const findPendingUserByActivation = async (email: string, contact: string, activationCode: string): Promise<PendingUser | null> => {
  try {
    const [rows]: any[] = await pool.query(
      'SELECT * FROM pending_users WHERE email = ? AND contact = ? AND activation_code = ?',
      [email, contact, activationCode]
    );
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (error) {
    logger.error('Database error in findPendingUserByActivation:', error);
    throw error;
  }
};

export const deletePendingUser = async (id: number): Promise<void> => {
  try {
    await pool.query('DELETE FROM pending_users WHERE id = ?', [id]);
  } catch (error) {
    logger.error('Database error in deletePendingUser:', error);
    throw error;
  }
};
