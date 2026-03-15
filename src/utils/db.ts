import * as mysql from 'mysql2/promise';

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, DB2_HOST, DB2_NAME, DB2_PASSWORD, DB2_PORT, DB2_USER } from './env';

// Enhanced pool configuration to prevent ETIMEDOUT errors
const poolConfig = {
  // Connection pool limits
  connectionLimit: 10,
  // Timeout settings
  connectTimeout: 10000, // 10 seconds
  database: DB_NAME,
  // Connection health
  enableKeepAlive: true,
  host: DB_HOST,
  idleTimeout: 30000, // 30 seconds — keep below MySQL wait_timeout to avoid stale connections
  keepAliveInitialDelay: 0,
  maxIdle: 10,
  password: DB_PASSWORD,
  port: DB_PORT,
  queueLimit: 0,
  user: DB_USER,
  // Retry configuration
  waitForConnections: true,
};

const pool2Config = {
  // Connection pool limits
  connectionLimit: 10,
  // Timeout settings
  connectTimeout: 10000,
  database: DB2_NAME,
  // Connection health
  enableKeepAlive: true,
  host: DB2_HOST,
  idleTimeout: 30000, // 30 seconds
  keepAliveInitialDelay: 0,
  maxIdle: 10,
  password: DB2_PASSWORD,
  port: DB2_PORT,
  queueLimit: 0,
  user: DB2_USER,
  // Retry configuration
  waitForConnections: true,
};

const pool: mysql.Pool = mysql.createPool(poolConfig);
const pool2: mysql.Pool = mysql.createPool(pool2Config);

// Note: mysql2/promise pools don't emit 'error' events directly
// Use dbHealthCheck utility for connection monitoring instead

// Retryable connection error codes caused by stale/dead pool connections
const RETRYABLE_ERROR_CODES = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST']);

/**
 * Wraps pool.query with a single automatic retry for transient connection errors
 * (e.g. read ETIMEDOUT when the MySQL server closed an idle connection that
 * the pool still considered valid).
 */
export const queryWithRetry = async (
  poolInstance: mysql.Pool,
  sql: string,
  values?: unknown[]
): Promise<any> => {
  try {
    return await poolInstance.query(sql, values);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code && RETRYABLE_ERROR_CODES.has(code)) {
      // Single retry — the pool will allocate a fresh connection
      return await poolInstance.query(sql, values);
    }
    throw err;
  }
};

export { pool, pool2 };