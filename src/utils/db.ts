// filepath: /Users/rozaiman/express-ts/src/utils/dbPool.ts
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { post } from 'axios';
import { Pool } from 'pg';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT as string),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const pool2 = mysql.createPool({
  host: process.env.DB2_HOST,
  port: parseInt(process.env.DB2_PORT as string),
  user: process.env.DB2_USER,
  password: process.env.DB2_PASSWORD,
  database: process.env.DB2_NAME,
});

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