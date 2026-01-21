import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local BEFORE everything else
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import cron from 'node-cron';

const MODULE = 'cron';

async function runWorker() {
    // We use dynamic imports to ensure env vars are loaded first
    const { Logger } = await import('../lib/utils/logger');
    const { processScheduledPosts } = await import('../lib/scheduler/process-service');

    Logger.info(MODULE, '🚀 Starting Instagram Story Scheduler Worker...');
    Logger.info(MODULE, '⏰ Schedule: Every minute (* * * * *)');

    // Schedule the task to run every minute
    cron.schedule('* * * * *', async () => {
        Logger.info(MODULE, '🕒 Running scheduled post check...');

        try {
            const result = await processScheduledPosts();
            if (result.processed > 0) {
                Logger.info(MODULE, `✅ Summary: ${result.succeeded} succeeded, ${result.failed} failed.`);
            }
        } catch (error) {
            Logger.error(MODULE, '❌ Fatal error in cron task', error);
        }
    });

    // Schedule identity check every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        Logger.info(MODULE, '🔍 Running 5-minute identity check...');
        try {
            const { supabaseAdmin } = await import('../lib/config/supabase-admin');

            const { data: links, error: linkError } = await supabaseAdmin
                .from('linked_accounts')
                .select('*');

            if (linkError) {
                Logger.error(MODULE, '❌ Failed to fetch links', linkError);
                return;
            }

            if (!links || links.length === 0) {
                Logger.info(MODULE, 'ℹ️ No linked accounts found active.');
                return;
            }

            for (const link of links) {
                // Fetch User Email
                const { data: userData } = await supabaseAdmin
                    .schema('next_auth')
                    .from('users')
                    .select('email')
                    .eq('id', link.user_id)
                    .single();

                // Fetch Google Account ID
                const { data: googleData } = await supabaseAdmin
                    .schema('next_auth')
                    .from('accounts')
                    .select('providerAccountId')
                    .eq('userId', link.user_id)
                    .eq('provider', 'google')
                    .single();

                const email = userData?.email || 'Unknown';
                const googleId = googleData?.providerAccountId || 'Not Connected';

                Logger.info(MODULE, `👤 Identity Audit | User: ${email} | Google ID: ${googleId} | FB ID: ${link.provider_account_id} | IG ID: ${link.ig_user_id || 'N/A'}`);
            }
        } catch (err) {
            Logger.error(MODULE, '❌ Identity check failed', err);
        }
    });

    // Also run once on startup
    Logger.info(MODULE, '🔄 Performing initial startup check...');
    processScheduledPosts().catch(err => {
        Logger.error(MODULE, '❌ Error in initial startup check', err);
    });
}

runWorker().catch(err => {
    console.error('❌ Failed to start worker:', err);
    process.exit(1);
});
