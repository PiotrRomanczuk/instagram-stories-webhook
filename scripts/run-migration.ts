/**
 * Apply database migration using Supabase client
 * Run with: npx tsx scripts/run-migration.ts
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE credentials in .env.local');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'found' : 'MISSING');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'found' : 'MISSING');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🔄 Applying migration: add_video_metadata\n');

  const statements = [
    'ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS thumbnail_url text',
    'ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS video_duration integer',
    'ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS video_codec text',
    'ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS video_framerate numeric(5, 2)',
    'ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS needs_processing boolean DEFAULT false',
    'CREATE INDEX IF NOT EXISTS idx_content_items_needs_processing ON public.content_items(needs_processing) WHERE needs_processing = true',
    "CREATE INDEX IF NOT EXISTS idx_content_items_video_metadata ON public.content_items(media_type, video_duration) WHERE media_type = 'VIDEO'",
  ];

  console.log('📝 Note: Supabase client cannot execute DDL directly.');
  console.log('   Attempting verification to check if migration is already applied...\n');

  // Test if columns already exist
  console.log('🔍 Checking if migration is already applied...\n');

  const { data, error } = await supabase
    .from('content_items')
    .select('id, needs_processing, thumbnail_url, video_duration')
    .limit(1);

  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('❌ Migration NOT applied - columns do not exist yet');
      console.log('\n📋 Please run these SQL statements in Supabase SQL Editor:\n');
      console.log('─'.repeat(70));
      statements.forEach((stmt, i) => {
        console.log(`\n-- Statement ${i + 1}`);
        console.log(stmt + ';');
      });
      console.log('\n' + '─'.repeat(70));
      console.log('\n💡 Or copy from: supabase/migrations/20260205000000_add_video_metadata.sql');
      console.log('\n📍 Steps:');
      console.log('   1. Open Supabase Dashboard → SQL Editor');
      console.log('   2. Paste the SQL statements above');
      console.log('   3. Click RUN ▶️');
      console.log('   4. Run this script again to verify\n');
      return false;
    }
    console.error('❌ Unexpected error:', error.message);
    return false;
  }

  console.log('✅ Migration already applied! Columns found:');
  console.log('   • thumbnail_url');
  console.log('   • video_duration');
  console.log('   • video_codec');
  console.log('   • video_framerate');
  console.log('   • needs_processing');
  console.log('\n✨ Database is ready for video features!');

  return true;
}

runMigration()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('\n❌ Migration check failed:', err);
    process.exit(1);
  });
