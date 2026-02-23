import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getSession, requireDeveloper } from '@/lib/auth-helpers';

export async function GET() {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    // Require developer role
    const session = await getSession();
    try {
        requireDeveloper(session);
    } catch {
        return NextResponse.json({ error: 'Developer access required' }, { status: 403 });
    }

    try {
        interface MigrationResults {
            posts: string;
        }
        const results: MigrationResults = {
            posts: 'not_found'
        };

        // Migrate Posts (tokens table has been dropped - INS-41)
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
            error: errorMessage
        }, { status: 500 });
    }
}
