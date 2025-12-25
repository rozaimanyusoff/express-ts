#!/usr/bin/env node

/**
 * Migration script: Migrate existing logs_auth records to daily JSON files
 * 
 * This script:
 * 1. Queries all records from logs_auth table
 * 2. Organizes them by date (YYYY-MM-DD)
 * 3. Writes them to uploads/logs/auth/auth_YYYY-MM-DD.jsonl (one JSON object per line)
 * 4. Optionally truncates the logs_auth table
 * 
 * Usage:
 *   node scripts/migrate-auth-logs-to-files.js [--truncate] [--delete-logs-auth]
 * 
 * Options:
 *   --truncate        : Truncate logs_auth table after migration
 *   --delete-logs-auth: Drop the logs_auth table entirely (requires --truncate)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || './uploads';
const AUTH_LOGS_DIR = path.join(UPLOAD_BASE_PATH, 'logs', 'auth');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldTruncate = args.includes('--truncate');
const shouldDeleteTable = args.includes('--delete-logs-auth');

if (shouldDeleteTable && !shouldTruncate) {
  console.error('Error: --delete-logs-auth requires --truncate');
  process.exit(1);
}

// Database connection pool
const pool = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'auth',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function ensureAuthLogsDir() {
  try {
    await fs.mkdir(AUTH_LOGS_DIR, { recursive: true });
    console.log(`✓ Ensured directory exists: ${AUTH_LOGS_DIR}`);
  } catch (error) {
    console.error('✗ Failed to create directory:', error);
    throw error;
  }
}

function getLogFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `auth_${year}-${month}-${day}.jsonl`;
}

async function migrateLogsToFiles() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Starting migration of logs_auth to files...\n');
    
    // Get total count
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM logs_auth');
    const totalLogs = countResult[0].count;
    console.log(`Total logs to migrate: ${totalLogs}`);
    
    if (totalLogs === 0) {
      console.log('No logs to migrate.');
      return;
    }
    
    // Stream logs in batches to avoid memory issues
    const batchSize = 10000;
    let offset = 0;
    const fileMap = new Map(); // Map of filename -> accumulated lines
    let processedCount = 0;
    
    while (offset < totalLogs) {
      const [rows] = await connection.query(
        `SELECT user_id, action, status, ip, user_agent, details, created_at 
         FROM logs_auth 
         ORDER BY created_at ASC 
         LIMIT ? OFFSET ?`,
        [batchSize, offset]
      );
      
      if (rows.length === 0) break;
      
      // Group logs by date
      for (const row of rows) {
        const date = new Date(row.created_at);
        const filename = getLogFilename(date);
        
        const logEntry = {
          user_id: row.user_id,
          action: row.action,
          status: row.status,
          ip: row.ip,
          user_agent: row.user_agent,
          details: row.details,
          created_at: new Date(row.created_at).toISOString()
        };
        
        if (!fileMap.has(filename)) {
          fileMap.set(filename, []);
        }
        fileMap.get(filename).push(JSON.stringify(logEntry));
      }
      
      processedCount += rows.length;
      const progress = Math.round((processedCount / totalLogs) * 100);
      process.stdout.write(`\rProcessing logs: ${processedCount}/${totalLogs} (${progress}%)`);
      
      offset += batchSize;
    }
    
    console.log('\n');
    
    // Write files
    let filesWritten = 0;
    for (const [filename, lines] of fileMap) {
      const filepath = path.join(AUTH_LOGS_DIR, filename);
      const content = lines.join('\n') + '\n';
      
      try {
        await fs.appendFile(filepath, content, 'utf-8');
        filesWritten++;
        console.log(`✓ Written to ${filename} (${lines.length} lines)`);
      } catch (error) {
        console.error(`✗ Failed to write ${filename}:`, error);
        throw error;
      }
    }
    
    console.log(`\n✓ Migration complete: ${totalLogs} logs migrated to ${filesWritten} files\n`);
    
    // Optionally truncate table
    if (shouldTruncate) {
      console.log('Truncating logs_auth table...');
      await connection.query('TRUNCATE TABLE logs_auth');
      console.log('✓ logs_auth table truncated\n');
      
      // Optionally drop table
      if (shouldDeleteTable) {
        console.log('Dropping logs_auth table...');
        await connection.query('DROP TABLE logs_auth');
        console.log('✓ logs_auth table dropped\n');
      }
    }
    
    console.log('✓ Migration finished successfully!');
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

// Run migration
await ensureAuthLogsDir();
await migrateLogsToFiles();
