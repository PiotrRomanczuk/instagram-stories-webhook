import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local BEFORE everything else
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import cron from 'node-cron';

const MODULE = 'cron';

async function runWorker() {
    // We use dynamic imports to ensure env vars are loaded first
    const { Logger } = await import('../lib/logger');
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
