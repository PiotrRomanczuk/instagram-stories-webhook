import { NextRequest, NextResponse } from 'next/server';
import { getPendingPosts, updateScheduledPost, ScheduledPostWithUser } from '@/lib/scheduled-posts-db';
import { publishMedia } from '@/lib/instagram';
import { supabase } from '@/lib/supabase';

// This endpoint should be called periodically (e.g., every minute via cron job)
export async function GET(request: NextRequest) {
    try {
        // 🔒 Security Check: Secure with CRON_SECRET
        const authHeader = request.headers.get('authorization');
        const secret = process.env.CRON_SECRET;

        // If secret is defined in env, enforce it
        if (secret && authHeader !== `Bearer ${secret}`) {
            console.error('🔒 Unauthorized cron attempt: Invalid or missing secret');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
                console.log(`📤 Publishing scheduled post ${post.id} for user ${post.userId}...`);

                // Publish the media using the associated user's tokens
                const result = await publishMedia(
                    post.url,
                    post.type,
                    post.postType || 'STORY',
                    post.caption,
                    post.userId // Pass the userId to use their linked account
                );

                // Update status to published
                await updateScheduledPost(post.id, {
                    status: 'published',
                    publishedAt: Date.now(),
                });

                console.log(`✅ Successfully published scheduled post ${post.id}`);

                // 📁 Media Auto-Cleanup
                if (post.url.includes('/storage/v1/object/public/stories/')) {
                    try {
                        const pathMatch = post.url.split('/stories/')[1];
                        if (pathMatch) {
                            console.log(`🧹 Cleaning up media: ${pathMatch}`);
                            const { error: deleteError } = await supabase.storage
                                .from('stories')
                                .remove([pathMatch]);

                            if (deleteError) {
                                console.warn(`⚠️ Cleanup failed for ${pathMatch}:`, deleteError.message);
                            } else {
                                console.log(`✨ Successfully deleted media ${pathMatch}`);
                            }
                        }
                    } catch (cleanupError: any) {
                        console.warn('⚠️ Cleanup logic error:', cleanupError.message || String(cleanupError));
                    }
                }

                results.push({
                    id: post.id,
                    success: true,
                    result,
                });
            } catch (error: any) {
                const errorMessage = error.message || 'Unknown error';
                console.error(`❌ Failed to publish scheduled post ${post.id}:`, errorMessage);

                // Update status to failed
                await updateScheduledPost(post.id, {
                    status: 'failed',
                    error: errorMessage,
                });

                results.push({
                    id: post.id,
                    success: false,
                    error: errorMessage,
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
        const errorMessage = error.message || 'Unknown error';
        console.error('Error processing scheduled posts:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
