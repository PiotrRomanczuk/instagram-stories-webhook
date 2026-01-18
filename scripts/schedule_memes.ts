
import * as fs from 'fs';
import * as path from 'path';
import { supabaseAdmin } from '../lib/supabase-admin';
import { addScheduledPost } from '../lib/scheduled-posts-db';


async function main() {
    console.log('🚀 Starting meme scheduling script...');

    // 1. Get a valid user with linked Facebook account
    console.log('🔍 Finding a user with linked Facebook account...');
    const { data: accounts, error: accountError } = await supabaseAdmin
        .from('linked_accounts')
        .select('user_id')
        .eq('provider', 'facebook')
        .limit(1);

    if (accountError || !accounts || accounts.length === 0) {
        console.error('❌ No user with linked Facebook account found.', accountError);
        process.exit(1);
    }
    const userId = accounts[0].user_id;
    console.log(`✅ Found user: ${userId}`);

    // 2. List memes
    const memesDir = path.join(process.cwd(), 'memes');
    if (!fs.existsSync(memesDir)) {
        console.error('❌ Memes directory not found:', memesDir);
        process.exit(1);
    }

    const files = fs.readdirSync(memesDir).filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i));
    if (files.length < 25) {
        console.warn(`⚠️ Warning: Only ${files.length} memes found. We will schedule them all and repeat if necessary.`);
    }

    // Shuffle and pick 25
    const shuffled = files.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 25);

    // If we have fewer than 25, loop content
    while (selected.length < 25) {
        selected.push(shuffled[selected.length % shuffled.length]);
    }

    console.log(`📋 Selected ${selected.length} memes to schedule.`);

    // 3. Process each meme
    const startTime = Date.now() + 60 * 1000; // Start 1 minute from now

    for (let i = 0; i < selected.length; i++) {
        const filename = selected[i];
        const filePath = path.join(memesDir, filename);
        const fileBuffer = fs.readFileSync(filePath);

        // Upload to Supabase Storage
        const uploadPath = `memes/${Date.now()}_${filename}`;
        console.log(`[${i + 1}/25] 📤 Uploading ${filename} to Supabase...`);

        const { error: uploadError } = await supabaseAdmin.storage
            .from('stories')
            .upload(uploadPath, fileBuffer, {
                contentType: 'image/jpeg', // Assuming mostly jpg based on file list
                upsert: true
            });

        if (uploadError) {
            console.error(`❌ Upload failed for ${filename}:`, uploadError);
            continue;
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('stories')
            .getPublicUrl(uploadPath);

        // Add to schedule
        // Spread evenly over 24 hours (24 * 60 * 60 * 1000 ms)
        const msPerDay = 24 * 60 * 60 * 1000;
        const interval = Math.floor(msPerDay / selected.length);
        const scheduledTime = startTime + i * interval;

        try {
            await addScheduledPost({
                userId,
                url: publicUrl,
                type: 'IMAGE',
                postType: 'STORY',
                caption: `Meme ${i + 1} #meme`,
                scheduledTime
            });
            console.log(`✅ Scheduled ${filename} for ${new Date(scheduledTime).toISOString()}`);
        } catch (dbError) {
            console.error(`❌ Failed to schedule ${filename}:`, dbError);
        }
    }

    console.log('✨ Scheduling complete!');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
