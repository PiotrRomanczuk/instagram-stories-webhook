import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  // 1. Recent system_logs from cron-debug module
  console.log('=== SYSTEM LOGS (cron-debug module, last 10) ===');
  const { data: cronDebugLogs, error: e1 } = await supabaseAdmin
    .from('system_logs')
    .select('*')
    .eq('module', 'cron-debug')
    .order('created_at', { ascending: false })
    .limit(10);
  if (e1) console.error('Error:', e1);
  else console.log(JSON.stringify(cronDebugLogs, null, 2));

  // 2. Recent error logs
  console.log('\n=== SYSTEM LOGS (errors, last 15) ===');
  const { data: errorLogs, error: e2 } = await supabaseAdmin
    .from('system_logs')
    .select('*')
    .eq('level', 'error')
    .order('created_at', { ascending: false })
    .limit(15);
  if (e2) console.error('Error:', e2);
  else console.log(JSON.stringify(errorLogs, null, 2));

  // 3. Content items with CP-7 in title/caption
  console.log('\n=== CONTENT ITEMS (CP-7 related) ===');
  const { data: cp7Items, error: e3 } = await supabaseAdmin
    .from('content_items')
    .select('id, title, caption, media_type, media_url, publishing_status, error_message, created_at, retry_count')
    .or('title.ilike.%CP-7%,caption.ilike.%CP-7%')
    .order('created_at', { ascending: false })
    .limit(10);
  if (e3) console.error('Error:', e3);
  else console.log(JSON.stringify(cp7Items, null, 2));

  // 4. Recent failed/processing content items
  console.log('\n=== CONTENT ITEMS (failed/processing, last 10) ===');
  const { data: failedItems, error: e4 } = await supabaseAdmin
    .from('content_items')
    .select('id, title, media_type, media_url, publishing_status, error_message, created_at, retry_count')
    .in('publishing_status', ['failed', 'processing'])
    .order('created_at', { ascending: false })
    .limit(10);
  if (e4) console.error('Error:', e4);
  else console.log(JSON.stringify(failedItems, null, 2));

  // 5. Recent scheduler logs (last 20)
  console.log('\n=== SYSTEM LOGS (scheduler module, last 20) ===');
  const { data: schedulerLogs, error: e5 } = await supabaseAdmin
    .from('system_logs')
    .select('id, level, module, message, created_at')
    .eq('module', 'scheduler')
    .order('created_at', { ascending: false })
    .limit(20);
  if (e5) console.error('Error:', e5);
  else console.log(JSON.stringify(schedulerLogs, null, 2));

  // 6. Recent warn logs (video processing warnings)
  console.log('\n=== SYSTEM LOGS (warnings, last 15) ===');
  const { data: warnLogs, error: e6 } = await supabaseAdmin
    .from('system_logs')
    .select('id, level, module, message, details, created_at')
    .eq('level', 'warn')
    .order('created_at', { ascending: false })
    .limit(15);
  if (e6) console.error('Error:', e6);
  else console.log(JSON.stringify(warnLogs, null, 2));

  // 7. Most recently created content items (to find E2E test items)
  console.log('\n=== CONTENT ITEMS (most recent 10) ===');
  const { data: recentItems, error: e7 } = await supabaseAdmin
    .from('content_items')
    .select('id, title, caption, media_type, media_url, publishing_status, error_message, created_at, retry_count, environment')
    .order('created_at', { ascending: false })
    .limit(10);
  if (e7) console.error('Error:', e7);
  else console.log(JSON.stringify(recentItems, null, 2));

  process.exit(0);
}

main();
