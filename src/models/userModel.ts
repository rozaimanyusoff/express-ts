// filepath: /src/models/userModel.ts
import pool from '../utils/db';

export const createUser = async (username: string, email: string, password: string) => {
  const [result] = await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, password]);
  return result;
};

export const getUserByEmailAndPassword = async (email: string, password: string) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
  return rows;
};