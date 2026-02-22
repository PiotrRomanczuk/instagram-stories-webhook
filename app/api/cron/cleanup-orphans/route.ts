import { NextRequest, NextResponse } from "next/server";
import { cleanupOrphanedUploads } from "@/lib/storage/cleanup";
import { Logger } from "@/lib/utils/logger";

export const maxDuration = 60;

const MODULE = "api:cron:cleanup";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            Logger.error(MODULE, "CRON_SECRET not configured");
            return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        Logger.info(MODULE, "Starting orphaned uploads cleanup cron job");
        const results = await cleanupOrphanedUploads();

        return NextResponse.json({ success: true, ...results });
    } catch (error) {
        Logger.error(MODULE, "Cron job failed", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
