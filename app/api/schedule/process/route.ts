import { NextRequest, NextResponse } from 'next/server';
import { getPendingPosts, updateScheduledPost } from '@/lib/scheduled-posts-db';
import { publishStory } from '@/lib/instagram';

// This endpoint should be called periodically (e.g., every minute via cron job)
export async function GET(request: NextRequest) {
    try {
        console.log('🔄 Checking for pending scheduled posts...');

        const pendingPosts = await getPendingPosts();

        if (pendingPosts.length === 0) {
            console.log('✅ No pending posts to publish');
            return NextResponse.json({
                message: 'No pending posts',
                processed: 0
            });
        }

        console.log(`📋 Found ${pendingPosts.length} pending post(s) to publish`);

        const results = [];

        for (const post of pendingPosts) {
            try {
                console.log(`📤 Publishing scheduled post ${post.id}...`);
                console.log(`   URL: ${post.url}`);
                console.log(`   Type: ${post.type}`);
                console.log(`   Scheduled for: ${new Date(post.scheduledTime).toLocaleString()}`);

                // Publish the story
                const result = await publishStory(post.url, post.type);

                // Update status to published
                await updateScheduledPost(post.id, {
                    status: 'published',
                    publishedAt: Date.now(),
                });

                console.log(`✅ Successfully published scheduled post ${post.id}`);

                results.push({
                    id: post.id,
                    success: true,
                    result,
                });
            } catch (error: any) {
                console.error(`❌ Failed to publish scheduled post ${post.id}:`, error.message);

                // Update status to failed
                await updateScheduledPost(post.id, {
                    status: 'failed',
                    error: error.message,
                });

                results.push({
                    id: post.id,
                    success: false,
                    error: error.message,
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        console.log(`📊 Processed ${results.length} post(s): ${successCount} succeeded, ${failCount} failed`);

        return NextResponse.json({
            message: `Processed ${results.length} post(s)`,
            processed: results.length,
            succeeded: successCount,
            failed: failCount,
            results,
        });
    } catch (error: any) {
        console.error('Error processing scheduled posts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
