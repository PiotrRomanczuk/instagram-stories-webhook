import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables before importing modules that need them
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
if (result.error) {
    console.warn('⚠️ Could not load .env.local:', result.error.message);
}

import { Logger } from '../lib/logger';

async function main() {
    try {
        await Logger.cleanup();
        process.exit(0);
    } catch (error) {
        console.error('Cleanup script failed:', error);
        process.exit(1);
    }
}

main();
