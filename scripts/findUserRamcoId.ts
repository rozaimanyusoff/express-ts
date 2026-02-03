import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function findUser() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'applications',
    });

    console.log('🔍 Searching for user with email: rozaiman@ranhill.com.my\n');

    const [rows] = await connection.query(
      'SELECT id, ramco_id, full_name, email FROM users WHERE email = ?',
      ['rozaiman@ranhill.com.my']
    );

    if (rows && (rows as any[]).length > 0) {
      console.log('✅ User found:');
      console.table(rows);
      const user = (rows as any)[0];
      console.log(`\n🎯 Use ramco_id: "${user.ramco_id}" in your test`);
    } else {
      console.log('❌ No user found with email rozaiman@ranhill.com.my');
      console.log('\nSearching for all users with ranhill.com.my email...\n');
      
      const [allRanhill] = await connection.query(
        'SELECT id, ramco_id, full_name, email FROM users WHERE email LIKE "%ranhill.com.my%" LIMIT 10'
      );
      
      if ((allRanhill as any[]).length > 0) {
        console.log('Found users with ranhill.com.my email:');
        console.table(allRanhill);
      } else {
        console.log('No users with ranhill.com.my email found');
      }
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

findUser();
