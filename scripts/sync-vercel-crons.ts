/**
 * Syncs vercel.json crons config from the cron-jobs registry.
 * Run: npm run cron:sync
 */
import fs from 'node:fs';
import path from 'node:path';
import { toVercelCronsConfig } from '../lib/cron/cron-jobs';

const VERCEL_JSON_PATH = path.resolve(__dirname, '..', 'vercel.json');

function main(): void {
    const crons = toVercelCronsConfig();

    let existing: Record<string, unknown> = {};
    try {
        const raw = fs.readFileSync(VERCEL_JSON_PATH, 'utf-8');
        existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
        // File doesn't exist or is invalid — start fresh
    }

    const updated = { ...existing, crons };
    const output = JSON.stringify(updated, null, '\t') + '\n';

    fs.writeFileSync(VERCEL_JSON_PATH, output, 'utf-8');
    console.log(`Updated ${VERCEL_JSON_PATH} with ${crons.length} cron jobs.`);
}

main();
