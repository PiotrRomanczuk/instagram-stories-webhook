#!/usr/bin/env node

/**
 * Simple script to apply migration using Supabase REST API
 */

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

async function executeSQLViaAPI(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function applyMigration() {
  console.log('🔄 Applying migration manually via ALTER TABLE statements\n');

  const statements = [
    'ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS thumbnail_url text;',
    'ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS video_duration integer;',
    'ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS video_codec text;',
    'ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS video_framerate numeric(5, 2);',
    'ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS needs_processing boolean DEFAULT false;',
    'CREATE INDEX IF NOT EXISTS idx_content_items_needs_processing ON public.content_items(needs_processing) WHERE needs_processing = true;',
    'CREATE INDEX IF NOT EXISTS idx_content_items_video_metadata ON public.content_items(media_type, video_duration) WHERE media_type = \'VIDEO\';',
  ];

  console.log('⚠️  This script requires manual SQL execution.');
  console.log('\n📋 Please copy and paste these SQL statements into Supabase SQL Editor:\n');
  console.log('─'.repeat(70));
  statements.forEach((stmt, i) => {
    console.log(`\n-- Statement ${i + 1}`);
    console.log(stmt);
  });
  console.log('\n' + '─'.repeat(70));
  console.log('\n✨ After running these in Supabase Dashboard, press Ctrl+C to exit.\n');
}

applyMigration();
