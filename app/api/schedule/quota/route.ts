import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLinkedFacebookAccount } from "@/lib/database/linked-accounts";
import { getContentPublishingLimit } from "@/lib/instagram/quota";
import { Logger } from "@/lib/utils/logger";

const MODULE = 'api-quota';

export async function GET(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // 1. Get Linked Account to retrieve IG User ID
        const linkedAccount = await getLinkedFacebookAccount(userId);
        if (!linkedAccount || !linkedAccount.ig_user_id) {
            return NextResponse.json({
                error: 'No Instagram account linked',
                limit: null
            }, { status: 404 });
        }

        // 2. Fetch Limit
        await Logger.info(MODULE, `📊 Fetching publishing quota for user ${userId}...`);

        const limitData = await getContentPublishingLimit(
            linkedAccount.ig_user_id,
            userId
        );

        return NextResponse.json({ limit: limitData });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        await Logger.error(MODULE, `🔥 Quota API Error: ${errorMessage}`, error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
