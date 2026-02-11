import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/config/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
    // Block in production
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Not available in production" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const vars = [
        "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"
    ];

    const status: Record<string, string> = {};
    const issues: string[] = [];

    vars.forEach(v => {
        const val = process.env[v];
        if (!val) {
            status[v] = "MISSING";
            issues.push(`${v} is missing`);
        } else {
            status[v] = "Present";
            if (v.includes("URL") && !val.startsWith("http")) {
                status[v] += " INVALID PROTOCOL";
                issues.push(`${v} does not start with http/https`);
            }
        }
    });

    let dbStatus = "Unknown";
    try {
        const { count, error } = await supabaseAdmin.from("users").select("id", { count: "exact", head: true });
        if (error) {
            dbStatus = `Error: ${error.message}`;
            issues.push(`Database Error: ${error.message}`);
        } else {
            dbStatus = `Connected. Users count: ${count}`;
        }
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        dbStatus = `Exception: ${msg}`;
        issues.push(`Database Exception: ${msg}`);
    }

    return NextResponse.json({
        deployment_env: process.env.NODE_ENV,
        status: issues.length === 0 ? "OK" : "ISSUES FOUND",
        issues, env_check: status, db_connection: dbStatus,
        timestamp: new Date().toISOString()
    }, { status: 200 });
}
