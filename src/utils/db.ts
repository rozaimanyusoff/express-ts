import * as dotenv from 'dotenv';
// filepath: /Users/rozaiman/express-ts/src/utils/dbPool.ts
import * as mysql from 'mysql2/promise';

dotenv.config();

// Enhanced pool configuration to prevent ETIMEDOUT errors
const poolConfig = {
  acquireTimeout: 10000, // 10 seconds
  // Connection pool limits
  connectionLimit: 10,
  // Timeout settings
  connectTimeout: 10000, // 10 seconds
  database: process.env.DB_NAME,
  // Connection health
  enableKeepAlive: true,
  host: process.env.DB_HOST,
  idleTimeout: 60000, // 60 seconds
  keepAliveInitialDelay: 0,
  maxIdle: 10,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT!),
  queueLimit: 0,
  timeout: 30000, // 30 seconds for queries
  user: process.env.DB_USER,
  // Retry configuration
  waitForConnections: true,
};

const pool2Config = {
  acquireTimeout: 10000,
  // Connection pool limits
  connectionLimit: 10,
  // Timeout settings
  connectTimeout: 10000,
  database: process.env.DB2_NAME,
  // Connection health
  enableKeepAlive: true,
  host: process.env.DB2_HOST,
  idleTimeout: 60000,
  keepAliveInitialDelay: 0,
  maxIdle: 10,
  password: process.env.DB2_PASSWORD,
  port: parseInt(process.env.DB2_PORT!),
  queueLimit: 0,
  timeout: 30000,
  user: process.env.DB2_USER,
  // Retry configuration
  waitForConnections: true,
};

const pool: mysql.Pool = mysql.createPool(poolConfig);
const pool2: mysql.Pool = mysql.createPool(pool2Config);

// Note: mysql2/promise pools don't emit 'error' events directly
// Use dbHealthCheck utility for connection monitoring instead

export { pool, pool2 };