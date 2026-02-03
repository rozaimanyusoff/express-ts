import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkLocationsTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('🔍 Checking locations table structure\n');

    const [columns]: any = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'assets' AND TABLE_NAME = 'locations' 
       ORDER BY ORDINAL_POSITION`
    );
    
    console.log('📋 Locations Table Columns:');
    console.table(columns);

    // Sample data
    const [data]: any = await connection.query(
      `SELECT * FROM assets.locations LIMIT 5`
    );
    
    console.log('\n📊 Sample Data:');
    console.table(data);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLocationsTable();
