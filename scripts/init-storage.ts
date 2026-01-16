import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initStorage() {
    console.log('🚀 Initializing Supabase Storage...');

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError);
        return;
    }

    const bucketName = 'stories';
    const exists = buckets.find(b => b.name === bucketName);

    if (!exists) {
        console.log(`Creating bucket "${bucketName}"...`);
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'video/mp4'],
            fileSizeLimit: 52428800 // 50MB (within free tier/default limits)
        });

        if (createError) {
            console.error('Error creating bucket:', createError);
        } else {
            console.log(`✅ Bucket "${bucketName}" created successfully!`);
        }
    } else {
        console.log(`✅ Bucket "${bucketName}" already exists.`);
    }
}

initStorage();
