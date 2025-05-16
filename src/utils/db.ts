// filepath: /Users/rozaiman/express-ts/src/utils/dbPool.ts
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT as string),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default pool;