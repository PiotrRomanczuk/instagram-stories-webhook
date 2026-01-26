import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
    getMemeSubmissions, 
    createMemeSubmission,
    getMemeStats
} from '@/lib/memes-db';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import { submitMemeSchema } from '@/lib/validations/meme.schema';
import { MemeStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserId(session);
        const role = getUserRole(session);
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || undefined;
        const search = searchParams.get('search') || undefined;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '12', 10);
        const offset = (page - 1) * limit;

        const options: {
            status?: MemeStatus | MemeStatus[];
            userId?: string;
            search?: string;
            limit?: number;
            offset?: number;
        } = {
            status: status as MemeStatus || undefined,
            search,
            limit,
            offset
        };

        if (role !== 'admin') {
            options.userId = userId;
        }

        const memes = await getMemeSubmissions(options);
        const stats = role === 'admin' ? await getMemeStats() : null;

        return NextResponse.json({
            memes,
            stats,
            pagination: {
                page,
                limit,
                hasMore: memes.length === limit
            }
        });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to fetch memes'
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserId(session);
        const userEmail = session.user?.email || '';

        const body = await req.json();
        const validated = submitMemeSchema.parse(body);

        const meme = await createMemeSubmission({
            user_id: userId,
            user_email: userEmail,
            media_url: validated.mediaUrl,
            storage_path: validated.storagePath,
            title: validated.title,
            caption: validated.caption
        });

        if (!meme) {
            return NextResponse.json({ error: 'Failed to create meme' }, { status: 500 });
        }

        return NextResponse.json({ meme });
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
        }
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Internal Server Error' 
        }, { status: 500 });
    }
}
