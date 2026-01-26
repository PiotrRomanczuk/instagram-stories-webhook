
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const vars = [
        'AUTH_GOOGLE_ID',
        'AUTH_GOOGLE_SECRET',
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
        'NEXT_PUBLIC_APP_URL'
    ];

    const status: Record<string, string> = {};
    const issues: string[] = [];

    vars.forEach(v => {
        const val = process.env[v];
        if (!val) {
            status[v] = '❌ MISSING';
            issues.push(`${v} is missing`);
        } else {
            status[v] = `Present (${val.length} chars)`;
            // Check for common issues
            if (val.startsWith('"') || val.startsWith("'")) {
                status[v] += ' ⚠️ STARTS WITH QUOTE (Remote invalid)';
                issues.push(`${v} starts with a quote character. Remove quotes in Vercel Dashboard.`);
            }
            if (val.endsWith('"') || val.endsWith("'")) {
                status[v] += ' ⚠️ ENDS WITH QUOTE (Remote invalid)';
                issues.push(`${v} ends with a quote character. Remove quotes in Vercel Dashboard.`);
            }
            if (v.includes('URL') && !val.startsWith('http')) {
                status[v] += ' ⚠️ INVALID PROTOCOL';
                issues.push(`${v} does not start with http/https`);
            }
        }
    });

    // Test DB connection
    let dbStatus = "Unknown";
    try {
        // Just try to fetch one user to verify connection and schema access
        const { count, error } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
        if (error) {
            dbStatus = `❌ Error: ${error.message} (Code: ${error.code})`;
            issues.push(`Database Error: ${error.message}`);
        } else {
            dbStatus = `✅ Connected. Users count: ${count}`;
        }
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        dbStatus = `❌ Exception: ${msg}`;
        issues.push(`Database Exception: ${msg}`);
    }

    return NextResponse.json({
        deployment_env: process.env.NODE_ENV,
        status: issues.length === 0 ? '✅ OK' : '❌ ISSUES FOUND',
        issues,
        env_check: status,
        db_connection: dbStatus,
        timestamp: new Date().toISOString()
    }, { status: 200 });
}
