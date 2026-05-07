import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/config/supabase-admin";
import { guardDebugRoute } from "@/lib/debug-route-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/env
 *
 * Returns a configuration health check WITHOUT exposing the names of the
 * environment variables being checked. The response uses opaque keys
 * (`auth`, `database`, `app`) so an attacker cannot fingerprint the system
 * by reading variable names.
 *
 * Each entry returns `{ configured: boolean }` only. Values are NEVER
 * returned, and the variable names themselves are not echoed back.
 */
export async function GET() {
    const guard = await guardDebugRoute();
    if (guard) return guard;

    // Internally tracked checks. Names are NOT included in the response.
    const checks: Array<{ key: string; envName: string }> = [
        { key: "auth_google_id", envName: "AUTH_GOOGLE_ID" },
        { key: "auth_google_secret", envName: "AUTH_GOOGLE_SECRET" },
        { key: "supabase_url", envName: "NEXT_PUBLIC_SUPABASE_URL" },
        { key: "supabase_service_role", envName: "SUPABASE_SERVICE_ROLE_KEY" },
        { key: "nextauth_secret", envName: "NEXTAUTH_SECRET" },
        { key: "nextauth_url", envName: "NEXTAUTH_URL" },
        { key: "app_url", envName: "NEXT_PUBLIC_APP_URL" },
    ];

    const envCheck: Record<string, { configured: boolean }> = {};
    let missingCount = 0;
    for (const c of checks) {
        const configured = !!process.env[c.envName];
        envCheck[c.key] = { configured };
        if (!configured) missingCount++;
    }

    let dbConnected = false;
    let dbError: string | null = null;
    try {
        const { error } = await supabaseAdmin
            .from("users")
            .select("id", { count: "exact", head: true });
        if (error) {
            dbError = error.message;
        } else {
            dbConnected = true;
        }
    } catch (e) {
        dbError = e instanceof Error ? e.message : "Unknown error";
    }

    return NextResponse.json(
        {
            status: missingCount === 0 && dbConnected ? "OK" : "ISSUES_FOUND",
            env_check: envCheck,
            db_connection: { connected: dbConnected, error: dbError },
            timestamp: new Date().toISOString(),
        },
        { status: 200 }
    );
}
