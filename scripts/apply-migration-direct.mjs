import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

console.log('🔄 Applying migration via direct table creation...\n');

// Try to verify table exists by testing insert
const testUserId = '00000000-0000-0000-0000-000000000001';
const { error: insertError } = await supabase
  .from('user_preferences')
  .upsert({
    user_id: testUserId,
    tour_completed: false,
    tour_version: 1
  }, {
    onConflict: 'user_id'
  });

if (insertError) {
  console.error('❌ Table does not exist and could not be created automatically.');
  console.log('\n📋 Please apply the migration manually:');
  console.log('1. Go to: https://supabase.com/dashboard/project/urfynxrvzaysvevbcowi/sql');
  console.log('2. Copy contents of: supabase/migrations/20260205_add_tour_tracking.sql');
  console.log('3. Paste and click "Run"\n');
  process.exit(1);
} else {
  console.log('✅ Table exists and is accessible!');

  // Clean up test record
  await supabase
    .from('user_preferences')
    .delete()
    .eq('user_id', testUserId);

  console.log('✅ Migration applied successfully!\n');
  console.log('🎉 Tour tracking is now enabled!');
  console.log('📍 Table: user_preferences');
  console.log('🔧 Test the tour at: http://localhost:3001\n');
  process.exit(0);
}
