import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        interface MigrationResults {
            tokens: string;
            posts: string;
        }
        const results: MigrationResults = {
            tokens: 'not_found',
            posts: 'not_found'
        };

        // 1. Migrate Tokens
        const tokensPath = path.join(process.cwd(), 'data', 'tokens.json');
        try {
            const tokensData = await fs.readFile(tokensPath, 'utf-8');
            const tokens = JSON.parse(tokensData);

            const { error: tokenError } = await supabaseAdmin
                .from('tokens')
                .upsert({
                    id: '00000000-0000-0000-0000-000000000001',
                    access_token: tokens.access_token,
                    user_id: tokens.user_id,
                    expires_at: tokens.expires_at
                });

            results.tokens = tokenError ? `error: ${tokenError.message}` : 'success';
        } catch (e: unknown) {
            results.tokens = `skip: ${e instanceof Error ? e.message : String(e)}`;
        }

        // 2. Migrate Posts
        const postsPath = path.join(process.cwd(), 'data', 'scheduled-posts.json');
        try {
            const postsData = await fs.readFile(postsPath, 'utf-8');
            const posts = JSON.parse(postsData);

            if (Array.isArray(posts) && posts.length > 0) {
                const mappedPosts = posts.map(p => ({
                    id: p.id,
                    url: p.url,
                    type: p.type,
                    scheduled_time: p.scheduledTime,
                    status: p.status,
                    created_at: p.createdAt,
                    published_at: p.publishedAt,
                    error: p.error
                }));

                const { error: postError } = await supabaseAdmin
                    .from('scheduled_posts')
                    .upsert(mappedPosts);

                results.posts = postError ? `error: ${postError.message}` : `success (${posts.length} posts)`;
            } else {
                results.posts = 'empty';
            }
        } catch (e: unknown) {
            results.posts = `skip: ${e instanceof Error ? e.message : String(e)}`;
        }

        return NextResponse.json({ success: true, results });
    } catch (error: unknown) {
        console.error('Migration Exception:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown exception';
        return NextResponse.json({
            success: false,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
