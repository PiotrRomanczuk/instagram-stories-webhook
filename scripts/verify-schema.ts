
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load .env.local, fallback to .env
const envPath = fs.existsSync(path.resolve(process.cwd(), '.env.local'))
    ? path.resolve(process.cwd(), '.env.local')
    : path.resolve(process.cwd(), '.env');

console.log(`Loading env from ${envPath}`);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking for ig_media_id column in scheduled_posts...");
    const { data, error } = await supabase
        .from('scheduled_posts')
        .select('ig_media_id')
        .limit(1);

    if (error) {
        console.error("Check failed:", error.message);
        if (error.code === '42703') {
            console.log("CONCLUSION: Column 'ig_media_id' DOES NOT exist.");
        }
    } else {
        console.log("CONCLUSION: Column 'ig_media_id' exists.");
    }
}

check();
