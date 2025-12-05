// filepath: /Users/rozaiman/express-ts/src/utils/dbPool.ts
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { post } from 'axios';
import { Pool } from 'pg';

dotenv.config();

// Enhanced pool configuration to prevent ETIMEDOUT errors
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT as string),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Connection pool limits
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000, // 60 seconds
  queueLimit: 0,
  // Timeout settings
  connectTimeout: 10000, // 10 seconds
  acquireTimeout: 10000, // 10 seconds
  timeout: 30000, // 30 seconds for queries
  // Connection health
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Retry configuration
  waitForConnections: true,
};

const pool2Config = {
  host: process.env.DB2_HOST,
  port: parseInt(process.env.DB2_PORT as string),
  user: process.env.DB2_USER,
  password: process.env.DB2_PASSWORD,
  database: process.env.DB2_NAME,
  // Connection pool limits
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  // Timeout settings
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timeout: 30000,
  // Connection health
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Retry configuration
  waitForConnections: true,
};

const pool: mysql.Pool = mysql.createPool(poolConfig);
const pool2: mysql.Pool = mysql.createPool(pool2Config);

// Note: mysql2/promise pools don't emit 'error' events directly
// Use dbHealthCheck utility for connection monitoring instead

const pool3 = mysql.createPool({
  host: process.env.DB_HOST_AQS,
  port: parseInt(process.env.DB_PORT_AQS as string),
  user: process.env.DB_USER_AQS,
  password: process.env.DB_PASSWORD_AQS,
  database: process.env.DB_NAME_AQS || 'ranhill',
});

const pgPool = new Pool({
  host: process.env.PG_DB_HOST_LOCAL,
  port: parseInt(process.env.PG_DB_PORT_LOCAL as string),
  user: process.env.PG_DB_USER_LOCAL,
  password: process.env.PG_DB_PASSWORD_LOCAL,
  database: process.env.PG_DB_NAME_LOCAL,
});

export { pool, pool2, pool3, pgPool };