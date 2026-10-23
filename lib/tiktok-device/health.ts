/**
 * Health-check logic for tiktok_devices.
 *
 * Run on a schedule (every 15 min) by /api/cron/tiktok-health.
 * Marks rows offline when their heartbeat is older than the configured
 * threshold and emits an admin alert exactly once per transition.
 */

import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { alertTikTokDeviceOffline } from '@/lib/utils/admin-alerts';

const MODULE = 'tiktok-device:health';

/** Heartbeat older than this and the device is considered offline. */
const STALE_HEARTBEAT_MS = 5 * 60 * 1000;

export interface TikTokHealthResult {
    checked: number;
    markedOffline: number;
    alertedDevices: string[];
}

export async function runTikTokHealthCheck(
    now: number = Date.now(),
): Promise<TikTokHealthResult> {
    const threshold = new Date(now - STALE_HEARTBEAT_MS).toISOString();

    const { data: candidates, error: fetchError } = await supabaseAdmin
        .from('tiktok_devices')
        .select('id, phone_label, last_heartbeat_at, status')
        .eq('status', 'online')
        .or(`last_heartbeat_at.is.null,last_heartbeat_at.lt.${threshold}`);

    if (fetchError) {
        await Logger.warn(MODULE, 'Failed to fetch tiktok_devices', fetchError);
        return { checked: 0, markedOffline: 0, alertedDevices: [] };
    }

    const rows = candidates ?? [];
    if (rows.length === 0) {
        return { checked: 0, markedOffline: 0, alertedDevices: [] };
    }

    const ids = rows.map((r) => r.id);
    const { error: updateError } = await supabaseAdmin
        .from('tiktok_devices')
        .update({ status: 'offline' })
        .in('id', ids)
        .eq('status', 'online');

    if (updateError) {
        await Logger.warn(MODULE, 'Failed to mark devices offline', updateError);
        return { checked: rows.length, markedOffline: 0, alertedDevices: [] };
    }

    const alerted: string[] = [];
    for (const row of rows) {
        await alertTikTokDeviceOffline(row.phone_label, row.last_heartbeat_at);
        alerted.push(row.phone_label);
    }

    await Logger.warn(
        MODULE,
        `Marked ${rows.length} TikTok device(s) offline`,
        { devices: alerted },
    );

    return {
        checked: rows.length,
        markedOffline: rows.length,
        alertedDevices: alerted,
    };
}
