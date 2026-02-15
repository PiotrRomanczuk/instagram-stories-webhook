import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/config/supabase-admin";
import packageJson from "@/package.json";

type CheckStatus = "pass" | "fail";

interface HealthCheck {
    status: CheckStatus;
    message?: string;
}

interface HealthResponse {
    status: "ok" | "degraded" | "error";
    checks: {
        database: HealthCheck;
        env: HealthCheck;
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

function resolveOverallStatus(checks: HealthResponse["checks"]): HealthResponse["status"] {
    const results = Object.values(checks);
    const failCount = results.filter((c) => c.status === "fail").length;

    if (failCount === results.length) return "error";
    if (failCount > 0) return "degraded";
    return "ok";
}

export async function GET() {
    const checks: HealthResponse["checks"] = {
        database: await checkDatabase(),
        env: checkEnvVars(),
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
