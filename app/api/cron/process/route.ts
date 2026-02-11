import { NextRequest, NextResponse } from "next/server";
import { processScheduledPosts } from "@/lib/scheduler/process-service";
import { Logger } from "@/lib/utils/logger";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        await Logger.error("cron", "CRON_SECRET not configured");
        return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    if (
        process.env.DISABLE_CRON === "true" ||
        (process.env.VERCEL_ENV === "preview" && process.env.STAGING_MODE !== "true")
    ) {
        return NextResponse.json({ message: "Cron disabled on preview deployment", skipped: true }, { status: 200 });
    }

    try {
        const result = await processScheduledPosts();
        return NextResponse.json(result);
    } catch (error) {
        await Logger.error("cron", "Cron job failed", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
