/**
 * TikTok device registry for the phone-driven Stories publisher.
 *
 * GET  /api/tiktok/devices — list current user's registered phones
 * POST /api/tiktok/devices — register a new phone (one row per ADB serial)
 *
 * Admin/developer roles only — registering a device is a high-trust action
 * (the worker authenticates with the service-role key off this device).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getUserId, getUserRole } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { rateLimiter } from '@/lib/middleware/rate-limit';

const API_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 };

const DEVICE_COLUMNS =
    'id, device_serial, phone_label, tiktok_username, status, last_heartbeat_at, daily_post_cap, created_at, updated_at';

const createDeviceSchema = z.object({
    deviceSerial: z.string().min(4).max(64),
    phoneLabel: z.string().min(1).max(64),
    tiktokUsername: z.string().min(1).max(64),
    dailyPostCap: z.number().int().min(1).max(100).optional(),
});

function requireAdminOrDeveloper(role: string | undefined): NextResponse | null {
    if (role !== 'admin' && role !== 'developer') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return null;
}

export async function GET(req: NextRequest) {
    const rateCheck = rateLimiter(req, API_RATE_LIMIT);
    if (rateCheck.isRateLimited) return rateCheck.response!;

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = requireAdminOrDeveloper(getUserRole(session));
    if (forbidden) return forbidden;

    const userId = getUserId(session);

    const { data, error } = await supabaseAdmin
        .from('tiktok_devices')
        .select(DEVICE_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
    }

    return NextResponse.json({ devices: data ?? [] });
}

export async function POST(req: NextRequest) {
    const rateCheck = rateLimiter(req, API_RATE_LIMIT);
    if (rateCheck.isRateLimited) return rateCheck.response!;

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forbidden = requireAdminOrDeveloper(getUserRole(session));
    if (forbidden) return forbidden;

    const userId = getUserId(session);

    let payload: unknown;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createDeviceSchema.safeParse(payload);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', issues: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const { deviceSerial, phoneLabel, tiktokUsername, dailyPostCap } = parsed.data;

    const { data, error } = await supabaseAdmin
        .from('tiktok_devices')
        .insert({
            user_id: userId,
            device_serial: deviceSerial,
            phone_label: phoneLabel,
            tiktok_username: tiktokUsername,
            daily_post_cap: dailyPostCap ?? 10,
        })
        .select(DEVICE_COLUMNS)
        .single();

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json(
                { error: 'A device with this serial is already registered' },
                { status: 409 },
            );
        }
        return NextResponse.json(
            { error: 'Failed to register device', detail: error.message },
            { status: 500 },
        );
    }

    return NextResponse.json({ device: data }, { status: 201 });
}
