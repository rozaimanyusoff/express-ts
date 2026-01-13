#!/usr/bin/env node
/**
 * Migration runner - applies SQL migration files from db/migrations/
 * Usage: node scripts/run-migrations.js [migration_file_name.sql | all]
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, '../db/migrations');

async function runMigration(filename) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    multipleStatements: true,
    waitForConnections: true,
  });

  try {
    const filePath = path.join(migrationsDir, filename);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filename}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n📁 Running migration: ${filename}`);
    console.log('─'.repeat(60));

    const results = await connection.query(sql);
    console.log('✅ Migration completed successfully');
    console.log(`   Executed: ${results.length} statement(s)`);
  } catch (err) {
    console.error('❌ Migration failed:');
    console.error(err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

async function listMigrations() {
  try {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    console.log('\n📋 Available migrations:');
    console.log('─'.repeat(60));
    files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log('─'.repeat(60));
    return files;
  } catch (err) {
    console.error('Error reading migrations directory:', err.message);
    process.exit(1);
  }
}

async function runAllMigrations() {
  const files = await listMigrations();
  for (const file of files) {
    await runMigration(file);
    console.log();
  }
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === 'list') {
  await listMigrations();
} else if (args[0] === 'all') {
  await runAllMigrations();
} else {
  await runMigration(args[0]);
}
