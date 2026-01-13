#!/usr/bin/env node
/**
 * Apply add_approval_fields_to_transfer_items.sql migration
 * 
 * This script adds the approval_status, approved_by, and approved_date columns
 * to the assets.transfer_items table
 * 
 * Prerequisites:
 * - MySQL server running
 * - Environment variables set: DB_HOST, DB_USER, DB_PASSWORD
 * 
 * Usage: node scripts/apply-approval-migration.js
 */

import mysql from 'mysql2/promise';

const sql = `
ALTER TABLE \`assets\`.\`transfer_items\`
ADD COLUMN \`approval_status\` varchar(50) DEFAULT 'pending' AFTER \`acceptance_attachments\`;

ALTER TABLE \`assets\`.\`transfer_items\`
ADD COLUMN \`approved_by\` varchar(10) DEFAULT NULL AFTER \`approval_status\`;

ALTER TABLE \`assets\`.\`transfer_items\`
ADD COLUMN \`approved_date\` datetime DEFAULT NULL AFTER \`approved_by\`;
`;

async function applyMigration() {
  let connection;
  try {
    console.log('\n🔄 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      multipleStatements: true,
    });

    console.log('✅ Connected to database');
    console.log('\n📋 Running migration: add_approval_fields_to_transfer_items');
    console.log('─'.repeat(70));

    const results = await connection.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n✨ Changes applied:');
    console.log('   ✓ Added column: approval_status (varchar(50), default: \'pending\')');
    console.log('   ✓ Added column: approved_by (varchar(10))');
    console.log('   ✓ Added column: approved_date (datetime)');
    console.log('\n📊 Table: assets.transfer_items');
    console.log('─'.repeat(70));

  } catch (err) {
    console.error('\n❌ Migration failed:');
    console.error(`   Error: ${err.message}`);
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('\n   ℹ️  Columns already exist. No changes made.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
await applyMigration();
