#!/usr/bin/env node
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await conn.execute(`ALTER TABLE project_scope_activities 
      ADD COLUMN old_value VARCHAR(255) NULL,
      ADD COLUMN new_value VARCHAR(255) NULL`);
    console.log('✅ Columns added');
  } catch (e) {
    console.error('Column may already exist:', e.message);
  }
  
  await conn.end();
})();
