import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkEmployeesTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('🔍 Checking employees table structure and data\n');

    // Check table structure
    const [columns]: any = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'assets' AND TABLE_NAME = 'employees' ORDER BY ORDINAL_POSITION`
    );
    
    console.log('📋 Table Structure (assets.employees):');
    console.table(columns);

    // Search for user by email in employees table
    console.log('\n🔍 Searching for user with email: rozaiman@ranhill.com.my\n');

    const [rows]: any = await connection.query(
      `SELECT id, ramco_id, full_name, email, contact FROM assets.employees WHERE email = ?`,
      ['rozaiman@ranhill.com.my']
    );

    if (rows.length > 0) {
      console.log('✅ User found in employees table:');
      console.table(rows);
      const user = rows[0];
      console.log(`\n🎯 Use ramco_id: "${user.ramco_id}" in your test`);
    } else {
      console.log('❌ No user found in employees table');
      
      // Show first 10 employees
      console.log('\n📋 First 10 employees:');
      const [allEmployees]: any = await connection.query(
        `SELECT id, ramco_id, full_name, email FROM assets.employees LIMIT 10`
      );
      console.table(allEmployees);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkEmployeesTable();
