#!/usr/bin/env node
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function setupTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Drop existing tables if they exist (be careful!)
    console.log('Dropping existing tables...');
    await connection.execute('DROP TABLE IF EXISTS `project_scope_activities`');
    await connection.execute('DROP TABLE IF EXISTS `project_scopes`');
    
    // Create project_scopes table
    console.log('Creating project_scopes table...');
    await connection.execute(`
      CREATE TABLE \`project_scopes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`project_id\` INT NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`status\` ENUM('not_started','in_progress','to_review','completed','on_hold','cancelled') NOT NULL DEFAULT 'not_started',
        \`priority\` ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
        \`progress\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`assignee\` VARCHAR(50) NULL,
        \`task_groups\` TEXT NULL,
        \`planned_start_date\` DATE NULL,
        \`planned_end_date\` DATE NULL,
        \`actual_start_date\` DATE NULL,
        \`actual_end_date\` DATE NULL,
        \`planned_mandays\` INT NULL,
        \`actual_mandays\` INT NULL,
        \`attachment\` TEXT NULL,
        \`order_index\` INT NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`chk_progress\` CHECK (\`progress\` BETWEEN 0 AND 100),
        INDEX \`idx_project\` (\`project_id\`),
        INDEX \`idx_status\` (\`status\`),
        INDEX \`idx_assignee\` (\`assignee\`),
        INDEX \`idx_order\` (\`project_id\`, \`order_index\`)
      )
    `);

    // Create project_scope_activities table
    console.log('Creating project_scope_activities table...');
    await connection.execute(`
      CREATE TABLE \`project_scope_activities\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`scope_id\` INT NOT NULL,
        \`project_id\` INT NOT NULL,
        \`activity_type\` ENUM('status_change','review_comment','progress_update','assignee_change','attachment_added','priority_change') NOT NULL,
        \`old_status\` ENUM('not_started','in_progress','to_review','completed','on_hold','cancelled') NULL,
        \`new_status\` ENUM('not_started','in_progress','to_review','completed','on_hold','cancelled') NULL,
        \`old_value\` VARCHAR(255) NULL,
        \`new_value\` VARCHAR(255) NULL,
        \`reason\` TEXT NULL,
        \`comments\` TEXT NULL,
        \`changed_by\` VARCHAR(50) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_scope\` (\`scope_id\`),
        INDEX \`idx_project\` (\`project_id\`),
        INDEX \`idx_type\` (\`activity_type\`),
        INDEX \`idx_created\` (\`created_at\`),
        INDEX \`idx_changed_by\` (\`changed_by\`)
      )
    `);
    
    console.log('✅ Tables created successfully!');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setupTables();
