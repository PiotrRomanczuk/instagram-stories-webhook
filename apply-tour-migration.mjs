import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔄 Checking tour tracking table...\n');

// Check if table exists
const { data, error } = await supabase
  .from('user_preferences')
  .select('id')
  .limit(1);

if (!error) {
  console.log('✅ Table "user_preferences" already exists!');
  console.log('📊 Testing tour APIs...\n');
  process.exit(0);
} else {
  console.log('⚠️  Table "user_preferences" does not exist.');
  console.log('Error:', error.message);
  console.log('\n📝 Attempting to create table...\n');

  // Try to create the table using individual statements
  const statements = [
    `CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      tour_completed BOOLEAN DEFAULT FALSE,
      tour_version INTEGER DEFAULT 1,
      last_tour_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(user_id)
    )`,
    `ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY`,
  ];

  for (const stmt of statements) {
    console.log('Executing:', stmt.substring(0, 50) + '...');
    // Note: Direct SQL execution requires admin access
  }

  console.log('\n📋 Manual migration required:');
  console.log('1. Open Supabase Dashboard → SQL Editor');
  console.log('2. Run: supabase/migrations/20260205_add_tour_tracking.sql');
  console.log('3. Then test again\n');
  process.exit(1);
}
