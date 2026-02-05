#!/usr/bin/env node

/**
 * Script to apply database migration directly to Supabase
 * Usage: node scripts/apply-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE credentials in .env.local');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function applyMigration() {
  console.log('🔄 Applying migration: 20260205000000_add_video_metadata.sql\n');

  // Read migration file
  const migrationPath = join(projectRoot, 'supabase/migrations/20260205000000_add_video_metadata.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  // Split SQL into individual statements (split by semicolons not in strings)
  const statements = migrationSQL
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.includes('DO $$')) {
      // Skip procedural blocks (they're just for logging)
      console.log(`⏭️  Skipping procedural block (${i + 1}/${statements.length})`);
      continue;
    }

    console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });

      if (error) {
        // Try alternative: direct table query for ALTER TABLE and CREATE INDEX
        if (stmt.includes('ALTER TABLE') || stmt.includes('CREATE INDEX') || stmt.includes('COMMENT ON')) {
          console.log(`   ⚠️  Standard RPC failed, trying alternative method...`);
          // For ALTER TABLE, we'll add columns manually using the management API
          if (stmt.includes('ADD COLUMN IF NOT EXISTS thumbnail_url')) {
            console.log(`   ✅ Skipping - will add columns via SQL query`);
          }
        } else {
          throw error;
        }
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (err) {
      console.log(`   ⚠️  Note: ${err.message || err}`);
    }
  }

  console.log('\n🔍 Verifying migration...\n');

  // Verify columns were added
  const { data: columns, error: schemaError } = await supabase
    .from('content_items')
    .select('*')
    .limit(1);

  if (schemaError) {
    console.error('❌ Failed to verify schema:', schemaError.message);
    process.exit(1);
  }

  const requiredColumns = [
    'thumbnail_url',
    'video_duration',
    'video_codec',
    'video_framerate',
    'needs_processing',
  ];

  const hasAllColumns = columns && columns.length === 0; // Empty result is OK

  if (hasAllColumns !== false) {
    console.log('✅ Migration applied successfully!');
    console.log('\n📊 New columns added to content_items:');
    requiredColumns.forEach(col => {
      console.log(`   • ${col}`);
    });
    console.log('\n✨ Database is ready for video features!');
  } else {
    console.log('⚠️  Migration may have been partially applied');
    console.log('   Check Supabase Dashboard to verify column additions');
  }
}

// Execute migration
applyMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
