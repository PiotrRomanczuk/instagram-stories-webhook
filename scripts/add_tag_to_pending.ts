
import { supabaseAdmin } from '../lib/supabase-admin';

async function main() {
    console.log('🚀 Starting tag update script...');

    const targetUsername = 'michalmarszal';
    const tagData = [{
        username: targetUsername,
        x: 0.5,
        y: 0.5
    }];

    // 1. Fetch pending posts
    const { data: posts, error } = await supabaseAdmin
        .from('scheduled_posts')
        .select('id, user_tags')
        .eq('status', 'pending');

    if (error) {
        console.error('❌ Failed to fetch pending posts:', error);
        process.exit(1);
    }

    if (!posts || posts.length === 0) {
        console.log('ℹ️ No pending posts found.');
        return;
    }

    console.log(`📋 Found ${posts.length} pending posts. Updating tags...`);

    // 2. Update each post
    let updatedCount = 0;
    for (const post of posts) {
        // Prepare new tags
        const currentTags = post.user_tags || [];

        // Check if already tagged to avoid duplicates
        const alreadyTagged = currentTags.some((t: { username: string }) => t.username === targetUsername);

        if (alreadyTagged) {
            console.log(`🔹 Post ${post.id} already has tag. Skipping.`);
            continue;
        }

        const newTags = [...currentTags, ...tagData];

        const { error: updateError } = await supabaseAdmin
            .from('scheduled_posts')
            .update({ user_tags: newTags })
            .eq('id', post.id);

        if (updateError) {
            console.error(`❌ Failed to update post ${post.id}:`, updateError);
        } else {
            console.log(`✅ Updated post ${post.id} with tag @${targetUsername}`);
            updatedCount++;
        }
    }

    console.log(`✨ Complete! Updated ${updatedCount} posts.`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
