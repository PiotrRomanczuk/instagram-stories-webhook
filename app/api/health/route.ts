import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/config/supabase-admin";
import packageJson from "@/package.json";
import { getCurrentEnvironment } from "@/lib/content-db/environment";

type CheckStatus = "pass" | "fail" | "warn";

interface HealthCheck {
    status: CheckStatus;
    message?: string;
    details?: Record<string, unknown>;
}

interface HealthResponse {
    status: "ok" | "degraded" | "error";
    checks: {
        database: HealthCheck;
        env: HealthCheck;
        instagram_tokens: HealthCheck;
        cron_health: HealthCheck;
        queue_health: HealthCheck;
        api_quota: HealthCheck;
    };
    timestamp: string;
    version: string;
}

const REQUIRED_ENV_VARS = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
] as const;

async function checkDatabase(): Promise<HealthCheck> {
    try {
        const { error } = await supabaseAdmin
            .from("email_whitelist")
            .select("id", { count: "exact", head: true });

        if (error) {
            return { status: "fail", message: "Database query failed" };
        }
        return { status: "pass" };
    } catch {
        return { status: "fail", message: "Database connection failed" };
    }
}

function checkEnvVars(): HealthCheck {
    const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);

    if (missing.length > 0) {
        return {
            status: "fail",
            message: `Missing env vars: ${missing.join(", ")}`,
        };
    }
    return { status: "pass" };
}

/**
 * Check Instagram token expiry for all linked accounts.
 * Warns if any token expires within 7 days; fails if already expired.
 */
async function checkInstagramTokens(): Promise<HealthCheck> {
    try {
        const { data: accounts, error } = await supabaseAdmin
            .from("linked_accounts")
            .select("user_id, ig_username, expires_at")
            .not("ig_user_id", "is", null);

        if (error) {
            return { status: "warn", message: "Could not query linked accounts" };
        }

        if (!accounts || accounts.length === 0) {
            return { status: "warn", message: "No linked Instagram accounts found" };
        }

        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        const expired = accounts.filter(
            (a) => a.expires_at && a.expires_at < now
        );
        const expiringSoon = accounts.filter(
            (a) => a.expires_at && a.expires_at > now && a.expires_at < now + sevenDays
        );

        if (expired.length > 0) {
            return {
                status: "fail",
                message: `${expired.length} token(s) expired`,
                details: {
                    expiredAccounts: expired.map((a) => ({
                        username: a.ig_username,
                        expiredAt: new Date(a.expires_at).toISOString(),
                    })),
                },
            };
        }

        if (expiringSoon.length > 0) {
            return {
                status: "warn",
                message: `${expiringSoon.length} token(s) expiring within 7 days`,
                details: {
                    expiringSoon: expiringSoon.map((a) => ({
                        username: a.ig_username,
                        expiresAt: new Date(a.expires_at).toISOString(),
                        daysRemaining: Math.floor((a.expires_at - now) / (24 * 60 * 60 * 1000)),
                    })),
                },
            };
        }

        return { status: "pass", details: { accountCount: accounts.length } };
    } catch {
        return { status: "warn", message: "Token check failed" };
    }
}

/**
 * Check whether the main cron job has run recently (within 5 minutes).
 */
async function checkCronHealth(): Promise<HealthCheck> {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { data: logs, error } = await supabaseAdmin
            .from("system_logs")
            .select("created_at, message")
            .eq("module", "scheduler")
            .gte("created_at", fiveMinutesAgo)
            .order("created_at", { ascending: false })
            .limit(1);

        if (error) {
            return { status: "warn", message: "Could not query cron logs" };
        }

        if (!logs || logs.length === 0) {
            return {
                status: "warn",
                message: "No cron activity in the last 5 minutes",
            };
        }

        return {
            status: "pass",
            details: { lastRun: logs[0].created_at },
        };
    } catch {
        return { status: "warn", message: "Cron health check failed" };
    }
}

/**
 * Check for overdue/stuck posts in the publishing queue.
 */
async function checkQueueHealth(): Promise<HealthCheck> {
    try {
        const now = Date.now();
        const env = getCurrentEnvironment();

        const { count: overdueCount, error: overdueError } = await supabaseAdmin
            .from("content_items")
            .select("id", { count: "exact", head: true })
            .eq("environment", env)
            .eq("publishing_status", "scheduled")
            .lt("scheduled_time", now);

        const { count: stuckCount, error: stuckError } = await supabaseAdmin
            .from("content_items")
            .select("id", { count: "exact", head: true })
            .eq("environment", env)
            .eq("publishing_status", "processing")
            .lt("processing_started_at", new Date(now - 5 * 60 * 1000).toISOString());

        if (overdueError || stuckError) {
            return { status: "warn", message: "Could not query queue" };
        }

        if ((stuckCount ?? 0) > 0) {
            return {
                status: "fail",
                message: `${stuckCount} post(s) stuck in processing >5min`,
                details: { stuckCount, overdueCount },
            };
        }

        if ((overdueCount ?? 0) > 5) {
            return {
                status: "warn",
                message: `${overdueCount} overdue post(s) awaiting publish`,
                details: { overdueCount },
            };
        }

        return { status: "pass", details: { overdueCount, stuckCount } };
    } catch {
        return { status: "warn", message: "Queue health check failed" };
    }
}

/**
 * Check the most recent quota snapshot to surface low-quota warnings.
 */
async function checkApiQuota(): Promise<HealthCheck> {
    try {
        const { data: snapshot, error } = await supabaseAdmin
            .from("api_quota_history")
            .select("quota_total, quota_usage, recorded_at")
            .order("recorded_at", { ascending: false })
            .limit(1)
            .single();

        if (error || !snapshot) {
            return { status: "warn", message: "No quota snapshot available" };
        }

        const { quota_total, quota_usage } = snapshot;
        if (!quota_total || quota_total === 0) {
            return { status: "warn", message: "Quota total unknown" };
        }

        const usagePct = Math.round((quota_usage / quota_total) * 100);
        if (usagePct >= 90) {
            return {
                status: "fail",
                message: `API quota critical: ${usagePct}% used`,
                details: { quota_usage, quota_total, usagePct },
            };
        }
        if (usagePct >= 75) {
            return {
                status: "warn",
                message: `API quota high: ${usagePct}% used`,
                details: { quota_usage, quota_total, usagePct },
            };
        }

        return {
            status: "pass",
            details: { quota_usage, quota_total, usagePct, snapshotAt: snapshot.recorded_at },
        };
    } catch {
        return { status: "warn", message: "Quota check failed" };
    }
}

function resolveOverallStatus(checks: HealthResponse["checks"]): HealthResponse["status"] {
    const results = Object.values(checks);
    const failCount = results.filter((c) => c.status === "fail").length;
    const warnCount = results.filter((c) => c.status === "warn").length;

    if (failCount === results.length) return "error";
    if (failCount > 0 || warnCount > 0) return "degraded";
    return "ok";
}

export async function GET() {
    const [
        database,
        env,
        instagram_tokens,
        cron_health,
        queue_health,
        api_quota,
    ] = await Promise.all([
        checkDatabase(),
        Promise.resolve(checkEnvVars()),
        checkInstagramTokens(),
        checkCronHealth(),
        checkQueueHealth(),
        checkApiQuota(),
    ]);

    const checks: HealthResponse["checks"] = {
        database,
        env,
        instagram_tokens,
        cron_health,
        queue_health,
        api_quota,
    };

    const response: HealthResponse = {
        status: resolveOverallStatus(checks),
        checks,
        timestamp: new Date().toISOString(),
        version: packageJson.version,
    };

    const httpStatus = response.status === "ok" ? 200 : 503;

    return NextResponse.json(response, { status: httpStatus });
}
