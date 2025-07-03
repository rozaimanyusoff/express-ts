import {pool} from '../utils/db';
import logger from '../utils/logger';
import { ResultSetHeader } from 'mysql2';

export interface PendingUser {
  id?: number;
  fname: string;
  email: string;
  contact: string;
  user_type: number;
  status: number;
  activation_code?: string;
  created_at?: Date;
  ip?: string | null;
  user_agent?: string | null;
}

// DB and table variables for easier maintenance
export const DB_NAME = process.env.DB_NAME || 'auth';
export const PENDING_USERS_TABLE = 'pending_users';

export const getAllPendingUsers = async (): Promise<any[]> => {
    try {
        const [rows]: any[] = await pool.query(
            `SELECT * FROM ${PENDING_USERS_TABLE}`
        );
        return rows;
    } catch (error) {
        logger.error(`Database error in getAllPendingUsers: ${error}`);
        throw error;
    }
}

export const createPendingUser = async (user: PendingUser): Promise<ResultSetHeader> => {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO ${PENDING_USERS_TABLE} (fname, email, contact, user_type, status, activation_code, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.fname, user.email, user.contact, user.user_type, user.status, user.activation_code, user.ip ?? null, user.user_agent ?? null]
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
      `SELECT * FROM ${PENDING_USERS_TABLE} WHERE email = ? OR contact = ?`,
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
      `SELECT * FROM ${PENDING_USERS_TABLE} WHERE email = ? AND contact = ? AND activation_code = ?`,
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
    await pool.query(`DELETE FROM ${PENDING_USERS_TABLE} WHERE id = ?`, [id]);
  } catch (error) {
    logger.error('Database error in deletePendingUser:', error);
    throw error;
  }
};
