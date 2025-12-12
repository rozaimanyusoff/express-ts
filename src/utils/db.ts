import { post } from 'axios';
import { betterAuth } from 'better-auth';
import { username } from "better-auth/plugins"
import * as dotenv from 'dotenv';
// filepath: /Users/rozaiman/express-ts/src/utils/dbPool.ts
import * as mysql from 'mysql2/promise';
import { Pool } from 'pg';

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

const pool3 = mysql.createPool({
  database: process.env.DB_NAME_AQS || 'ranhill',
  host: process.env.DB_HOST_AQS,
  password: process.env.DB_PASSWORD_AQS,
  port: parseInt(process.env.DB_PORT_AQS!),
  user: process.env.DB_USER_AQS,
});

const auth = betterAuth({
  basePath: '/api/aqs/auth',
  database: new Pool({
    database: process.env.PG_DB_NAME_LOCAL,
    host: process.env.PG_DB_HOST_LOCAL,
    options: "-c search_path=auth",
    password: process.env.PG_DB_PASSWORD_LOCAL,
    port: parseInt(process.env.PG_DB_PORT_LOCAL!),
    user: process.env.PG_DB_USER_LOCAL
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username()
  ],
  user: {
    modelName: 'users',
  }
});

const pgPool = new Pool({
  database: process.env.PG_DB_NAME_LOCAL,
  host: process.env.PG_DB_HOST_LOCAL,
  password: process.env.PG_DB_PASSWORD_LOCAL,
  port: parseInt(process.env.PG_DB_PORT_LOCAL!),
  user: process.env.PG_DB_USER_LOCAL,
});

export { auth, pgPool, pool, pool2, pool3 };