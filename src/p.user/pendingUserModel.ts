import { ResultSetHeader } from 'mysql2';

import { pool } from '../utils/db';
import logger from '../utils/logger';

export interface PendingUser {
  about?: null | string;
  activation_code?: null | string;
  contact: string;
  created_at?: Date;
  email: string;
  fname: string;
  id?: number;
  ip?: null | string;
  method?: 'invitation' | 'self-register';
  status: number;
  user_agent?: null | string;
  user_type: number;
  username?: null | string;
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
      `INSERT INTO ${PENDING_USERS_TABLE} (fname, username, email, contact, user_type, status, activation_code, ip, user_agent, method, about) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.fname,
        user.username ?? null,
        user.email,
        user.contact,
        user.user_type,
        user.status,
        user.activation_code ?? null,
        user.ip ?? null,
        user.user_agent ?? null,
        user.method ?? null,
        user.about ?? null
      ]
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

export const findPendingUserByActivation = async (email: string, contact: string, activationCode: string): Promise<null | PendingUser> => {
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

//truncate pending users table -- applied

export const getPendingUserById = async (id: number): Promise<any | null> => {
  try {
    const [rows]: any[] = await pool.query(
      `SELECT * FROM ${PENDING_USERS_TABLE} WHERE id = ?`,
      [id]
    );
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (error) {
    logger.error('Database error in getPendingUserById:', error);
    throw error;
  }
};
