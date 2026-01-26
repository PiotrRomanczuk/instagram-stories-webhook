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

    // 1. Initialize 'stories' bucket (public, for meme uploads)
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

    // 2. Initialize 'ai-analysis' bucket (private, for AI processing - Pro plan)
    const aiAnalysisBucketName = 'ai-analysis';
    const aiAnalysisExists = buckets.find(b => b.name === aiAnalysisBucketName);

    if (!aiAnalysisExists) {
        console.log(`Creating bucket "${aiAnalysisBucketName}"...`);
        const { error: createError } = await supabase.storage.createBucket(aiAnalysisBucketName, {
            public: false, // Private bucket for AI analysis
            fileSizeLimit: 104857600 // 100MB (Pro plan allows more)
        });

        if (createError) {
            console.error('Error creating bucket:', createError);
        } else {
            console.log(`✅ Bucket "${aiAnalysisBucketName}" created successfully (private)!`);
        }
    } else {
        console.log(`✅ Bucket "${aiAnalysisBucketName}" already exists.`);
    }

    console.log('\n📊 Storage Setup Summary:');
    console.log(`   - stories (public): For user uploads and scheduling`);
    console.log(`   - ai-analysis (private): For AI analysis of published memes (Pro plan)`);
}

initStorage();
