import * as dotenv from 'dotenv';
import * as mysql from 'mysql2/promise';
import * as fs from 'fs';

dotenv.config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
  });

  try {
    const migrationSQL = fs.readFileSync('./db/migrations/add_transferred_on_to_transfer_items.sql', 'utf-8');
    const statements = migrationSQL.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        await connection.execute(statement);
        console.log('✅ Done');
      }
    }

    console.log('\n✅ Migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await connection.end();
  }
}

runMigration();
