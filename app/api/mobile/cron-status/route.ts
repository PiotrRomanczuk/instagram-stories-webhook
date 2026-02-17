/**
 * Mobile Cron Status API Endpoint
 *
 * Bearer token authenticated endpoint for mobile widgets.
 * Returns combined cron status, metrics, and recent logs optimized for widget display.
 *
 * Authentication: Bearer token (API key)
 * Scopes required: cron:read
 *
 * @example
 * ```bash
 * curl -H "Authorization: Bearer sk_live_..." \
 *      https://your-app.vercel.app/api/mobile/cron-status
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractApiKey, validateApiKey, hasScope, isKeyExpired } from '@/lib/auth/api-keys';
import { getApiKeysByPrefix, updateLastUsedAt } from '@/lib/database/api-keys';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getCurrentEnvironment } from '@/lib/content-db/environment';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:mobile:cron-status';

/**
 * Cron job configuration
 */
interface CronJob {
  name: string;
  schedule: string;
}

const CRON_JOBS: CronJob[] = [
  { name: 'process', schedule: '* * * * *' }, // Every minute
  { name: 'identity-audit', schedule: '*/5 * * * *' }, // Every 5 minutes
  { name: 'check-media-health', schedule: '0 */6 * * *' }, // Every 6 hours
];

/**
 * Calculate next run time based on cron schedule
 */
function calculateNextRun(schedule: string): Date {
  const now = new Date();

  if (schedule === '* * * * *') {
    return new Date(now.getTime() + 60 * 1000);
  } else if (schedule === '*/5 * * * *') {
    const minutes = now.getMinutes();
    const nextMinute = Math.ceil(minutes / 5) * 5;
    const nextRun = new Date(now);
    nextRun.setMinutes(nextMinute, 0, 0);
    if (nextRun <= now) {
      nextRun.setTime(nextRun.getTime() + 5 * 60 * 1000);
    }
    return nextRun;
  } else if (schedule === '0 */6 * * *') {
    const hours = now.getHours();
    const nextHour = Math.ceil(hours / 6) * 6;
    const nextRun = new Date(now);
    nextRun.setHours(nextHour, 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setTime(nextRun.getTime() + 6 * 60 * 60 * 1000);
    }
    return nextRun;
  }

  return new Date(now.getTime() + 60 * 1000);
}

/**
 * Get relative time string (e.g., "5m ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Get countdown time string (e.g., "in 30s")
 */
function getCountdownTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (seconds < 0) return 'overdue';
  if (seconds < 60) return `in ${seconds}s`;
  if (minutes < 60) return `in ${minutes}m`;
  return `in ${hours}h`;
}

/**
 * Fetch cron job status
 */
async function getCronStatus() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const jobsStatus = await Promise.all(
    CRON_JOBS.map(async (job) => {
      const { data: logs } = await supabaseAdmin
        .from('system_logs')
        .select('message, created_at, level, details')
        .eq('module', 'cron')
        .ilike('message', `%${job.name}%`)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      let lastRun = null;
      let lastStatus = 'unknown';
      let lastMessage = 'No recent execution';

      if (logs && logs.length > 0) {
        const lastLog = logs[0];
        lastRun = new Date(lastLog.created_at);
        lastStatus = lastLog.level === 'error' ? 'error' : 'success';
        lastMessage = lastLog.message;
      }

      const nextRun = calculateNextRun(job.schedule);

      return {
        name: job.name,
        schedule: job.schedule,
        lastRun: lastRun ? lastRun.toISOString() : null,
        lastRunRelative: lastRun ? getRelativeTime(lastRun) : 'never',
        lastStatus,
        lastMessage,
        nextExpectedRun: nextRun.toISOString(),
        nextRunCountdown: getCountdownTime(nextRun),
      };
    })
  );

  return {
    jobs: jobsStatus,
    timestamp: now.toISOString(),
  };
}

/**
 * Fetch cron metrics
 */
async function getCronMetrics() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const env = getCurrentEnvironment();

  const [
    { count: postsInQueue },
    { count: postsProcessing },
    { count: postsStuck },
    { count: failedLast24h },
    { data: publishedLast24h },
    { data: recentPosts },
  ] = await Promise.all([
    supabaseAdmin
      .from('content_items')
      .select('id', { count: 'exact' })
      .eq('environment', env)
      .eq('publishing_status', 'scheduled')
      .lte('scheduled_time', now.getTime()),
    supabaseAdmin
      .from('content_items')
      .select('id', { count: 'exact' })
      .eq('environment', env)
      .eq('publishing_status', 'processing'),
    supabaseAdmin
      .from('content_items')
      .select('id', { count: 'exact' })
      .eq('environment', env)
      .eq('publishing_status', 'processing')
      .lt('processing_started_at', fiveMinutesAgo.toISOString()),
    supabaseAdmin
      .from('content_items')
      .select('id', { count: 'exact' })
      .eq('environment', env)
      .eq('publishing_status', 'failed')
      .gte('updated_at', twentyFourHoursAgo.toISOString()),
    supabaseAdmin
      .from('content_items')
      .select('id, published_at', { count: 'exact' })
      .eq('environment', env)
      .eq('publishing_status', 'published')
      .gte('published_at', twentyFourHoursAgo.toISOString()),
    supabaseAdmin
      .from('content_items')
      .select('publishing_status')
      .eq('environment', env)
      .in('publishing_status', ['published', 'failed'])
      .gte('updated_at', twentyFourHoursAgo.toISOString()),
  ]);

  const failedCount = recentPosts?.filter((p) => p.publishing_status === 'failed').length || 0;
  const successCount = recentPosts?.filter((p) => p.publishing_status === 'published').length || 0;
  const errorRate =
    successCount + failedCount > 0
      ? Math.round((failedCount / (successCount + failedCount)) * 100)
      : 0;

  return {
    postsInQueue: postsInQueue || 0,
    postsProcessing: postsProcessing || 0,
    postsStuck: postsStuck || 0,
    failedLast24h: failedLast24h || 0,
    publishedLast24h: publishedLast24h?.length || 0,
    errorRate,
  };
}

/**
 * Fetch recent logs
 */
async function getRecentLogs(hours: number = 1, limit: number = 10) {
  const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

  const { data: logs } = await supabaseAdmin
    .from('system_logs')
    .select('id, level, module, message, details, created_at')
    .ilike('module', '%cron%')
    .gte('created_at', hoursAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  return logs || [];
}

/**
 * GET /api/mobile/cron-status
 *
 * Returns combined cron status, metrics, and recent logs for mobile widget.
 * Requires valid API key with cron:read scope.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Extract API key from Authorization header
    const authHeader = req.headers.get('authorization');
    const apiKey = extractApiKey(authHeader);

    if (!apiKey) {
      Logger.warn(MODULE, 'Missing or invalid Authorization header');
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    // 2. Find API key in database by prefix (performance optimization)
    const keyPrefix = apiKey.substring(0, 16);
    const candidateKeys = await getApiKeysByPrefix(keyPrefix);

    if (candidateKeys.length === 0) {
      Logger.warn(MODULE, 'No API key found with prefix', { prefix: keyPrefix });
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // 3. Validate key hash
    let validKey = null;
    for (const key of candidateKeys) {
      const isValid = await validateApiKey(apiKey, key.keyHash);
      if (isValid) {
        validKey = key;
        break;
      }
    }

    if (!validKey) {
      Logger.warn(MODULE, 'API key hash validation failed');
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // 4. Check expiration
    if (isKeyExpired(validKey.expiresAt)) {
      Logger.warn(MODULE, 'API key expired', { keyId: validKey.id });
      return NextResponse.json({ error: 'API key expired' }, { status: 401 });
    }

    // 5. Check scopes
    if (!hasScope(validKey.scopes, 'cron:read')) {
      Logger.warn(MODULE, 'Insufficient permissions', { keyId: validKey.id, scopes: validKey.scopes });
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // 6. Update last used timestamp (async, don't await)
    updateLastUsedAt(validKey.id).catch((err) => {
      Logger.warn(MODULE, 'Failed to update last_used_at', err);
    });

    // 7. Fetch cron data in parallel
    const [statusData, metricsData, logsData] = await Promise.all([
      getCronStatus(),
      getCronMetrics(),
      getRecentLogs(1, 10),
    ]);

    // 8. Return combined response optimized for widget
    Logger.info(MODULE, 'Cron status fetched successfully', { userId: validKey.userId });
    return NextResponse.json({
      status: statusData,
      metrics: metricsData,
      recentLogs: logsData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    Logger.error(MODULE, 'Error fetching cron status', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch cron status',
      },
      { status: 500 }
    );
  }
}
