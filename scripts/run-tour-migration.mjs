// Direct migration script using Supabase Admin SDK
import pg from 'pg';
import { readFileSync } from 'fs';
import 'dotenv/config';

const { Client } = pg;

const connectionString = `postgresql://postgres:${process.env.SUPABASE_DATABASE_PASSWORD}@db.urfynxrvzaysvevbcowi.supabase.co:5432/postgres`;

console.log('🔄 Connecting to Supabase PostgreSQL...\n');

const client = new Client({ connectionString });

try {
  await client.connect();
  console.log('✅ Connected to database\n');

  // Read migration file
  const sql = readFileSync('supabase/migrations/20260205_add_tour_tracking.sql', 'utf8');

  console.log('📝 Executing migration...\n');

  // Execute the entire migration
  await client.query(sql);

  console.log('✅ Migration executed successfully!\n');

  // Verify table exists
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_preferences'
  `);

  if (result.rows.length > 0) {
    console.log('✅ Table "user_preferences" created and verified!');
    console.log('🎉 Tour tracking is now enabled!\n');
    console.log('🧪 Test the tour at: http://localhost:3001');
  } else {
    console.log('⚠️  Table creation might have failed');
  }
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.log('\n📋 Please apply manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/urfynxrvzaysvevbcowi/sql');
  console.log('2. Copy: supabase/migrations/20260205_add_tour_tracking.sql');
  console.log('3. Run the SQL\n');
  process.exit(1);
} finally {
  await client.end();
}
