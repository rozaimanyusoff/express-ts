import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkFleetTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('🔍 Checking fleet2 and fleet_history tables\n');

    // Check fleet2 structure
    const [fleet2Cols]: any = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'billings' AND TABLE_NAME = 'fleet2' 
       ORDER BY ORDINAL_POSITION LIMIT 20`
    );
    
    console.log('📋 fleet2 table columns:');
    console.table(fleet2Cols);

    // Check fleet_history structure
    const [historycols]: any = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'billings' AND TABLE_NAME = 'fleet_history' 
       ORDER BY ORDINAL_POSITION LIMIT 20`
    );
    
    console.log('\n📋 fleet_history table columns:');
    console.table(historycols);

    // Check recent fleet2 records
    console.log('\n📊 Recent fleet2 records (IDs 425-428):');
    const [fleet2Records]: any = await connection.query(
      `SELECT id, card_no, fuel_type, status, updated_by FROM billings.fleet2 WHERE id >= 425 ORDER BY id DESC`
    );
    console.table(fleet2Records);

    // Check recent fleet_history records
    console.log('\n📝 Recent fleet_history records:');
    const [historyRecords]: any = await connection.query(
      `SELECT * FROM billings.fleet_history ORDER BY id DESC LIMIT 10`
    );
    console.table(historyRecords);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkFleetTables();
