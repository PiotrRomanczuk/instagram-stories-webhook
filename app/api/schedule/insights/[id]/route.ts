import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMediaInsights } from "@/lib/instagram/insights";
import { getScheduledPosts } from "@/lib/scheduled-posts-db";
import { Logger } from "@/lib/logger";

const MODULE = 'api-insights';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const postId = params.id;
        const userId = session.user.id;

        // Fetch the post details from DB to get igMediaId
        const posts = await getScheduledPosts(userId);
        const post = posts.find(p => p.id === postId);

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        if (!post.igMediaId) {
            return NextResponse.json({
                error: 'Insight not available',
                message: 'This post does not have an associated Instagram Media ID. It might have been published before insights tracking was enabled.'
            }, { status: 400 });
        }

        await Logger.info(MODULE, `📊 Fetching insights for post ${postId} (IG Media ID: ${post.igMediaId})...`);

        const insights = await getMediaInsights(
            post.igMediaId,
            userId,
            post.postType || 'STORY'
        );

        return NextResponse.json({ insights });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        await Logger.error(MODULE, `🔥 Insights API Error: ${errorMessage}`, error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
