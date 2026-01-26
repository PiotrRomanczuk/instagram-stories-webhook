/**
 * Setup AI Analysis Storage
 * Initializes the AI analysis system for Pro plan
 *
 * Usage: npx tsx scripts/setup-ai-analysis.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAIAnalysis() {
    console.log('🚀 Setting up AI Analysis Storage...\n');

    try {
        // 1. Check if migration has been run
        console.log('1️⃣  Checking database schema...');
        const { data: tables, error: tableError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

        if (tableError) {
            console.warn('   ⚠️  Could not verify schema (this is OK if RLS is enabled)');
        } else {
            const hasTable = tables?.some((t: any) => t.table_name === 'ai_meme_analysis');
            if (hasTable) {
                console.log('   ✅ ai_meme_analysis table exists');
            } else {
                console.log('   ❌ ai_meme_analysis table not found');
                console.log('      Run migration: supabase migration up');
                process.exit(1);
            }
        }

        // 2. Check storage bucket
        console.log('\n2️⃣  Checking storage bucket...');
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

        if (bucketError) {
            console.error(`   ❌ Error listing buckets: ${bucketError.message}`);
            process.exit(1);
        }

        const aiAnalysisBucket = buckets?.find(b => b.name === 'ai-analysis');

        if (!aiAnalysisBucket) {
            console.log('   ℹ️  ai-analysis bucket not found');
            console.log('      Creating bucket...');

            const { error: createError } = await supabase.storage.createBucket('ai-analysis', {
                public: false,
                fileSizeLimit: 104857600, // 100MB (Pro plan allows more)
            });

            if (createError) {
                console.error(`   ❌ Error creating bucket: ${createError.message}`);
                process.exit(1);
            }

            console.log('   ✅ ai-analysis bucket created (private)');
        } else {
            console.log('   ✅ ai-analysis bucket already exists');
        }

        // 3. Test write permissions
        console.log('\n3️⃣  Testing write permissions...');

        const testFileName = `.setup-test-${Date.now()}.txt`;
        const testContent = 'AI Analysis Setup Test';

        const { error: uploadError } = await supabase.storage
            .from('ai-analysis')
            .upload(testFileName, new TextEncoder().encode(testContent), {
                upsert: true,
            });

        if (uploadError) {
            console.error(`   ❌ Upload test failed: ${uploadError.message}`);
            process.exit(1);
        }

        console.log('   ✅ Write permissions OK');

        // Clean up test file
        await supabase.storage
            .from('ai-analysis')
            .remove([testFileName]);

        // 4. Summary
        console.log('\n✅ AI Analysis Storage Setup Complete!\n');
        console.log('📋 Next steps:');
        console.log('   1. Run the migration: supabase migration up');
        console.log('   2. Check docs: docs/AI_ANALYSIS_SETUP.md');
        console.log('   3. Publish a test meme');
        console.log('   4. Check pending memes: GET /api/ai-analysis');
        console.log('\n📊 Storage Configuration:');
        console.log(`   Bucket: ai-analysis`);
        console.log(`   Access: Private (Admin only)`);
        console.log(`   Max File: 100 MB`);
        console.log(`   Plan: Supabase Pro`);
        console.log('\n🔗 Useful commands:');
        console.log('   List pending: curl http://localhost:3000/api/ai-analysis');
        console.log('   Submit results: curl -X POST http://localhost:3000/api/ai-analysis/results');
        console.log('   Get signed URL: curl -X POST http://localhost:3000/api/ai-analysis/signed-url');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Setup failed: ${errorMessage}`);
        process.exit(1);
    }
}

setupAIAnalysis();
