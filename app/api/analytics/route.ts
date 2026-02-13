import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

export async function GET() {
    try {
        // Verify authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin or developer
        const userRole = (session.user as { role?: string }).role;
        if (userRole !== 'admin' && userRole !== 'developer') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch all meme submissions
        const { data: memes, error: memesError } = await supabaseAdmin
            .from('meme_submissions')
            .select('status, user_email, title, created_at')
            .order('created_at', { ascending: false });

        if (memesError) {
            throw memesError;
        }

        const totalSubmissions = memes?.length || 0;
        const pendingCount = memes?.filter(m => m.status === 'pending').length || 0;
        const approvedCount = memes?.filter(m => m.status === 'approved').length || 0;
        const rejectedCount = memes?.filter(m => m.status === 'rejected').length || 0;
        const scheduledCount = memes?.filter(m => m.status === 'scheduled').length || 0;
        const publishedCount = memes?.filter(m => m.status === 'published').length || 0;

        const approvalRate = totalSubmissions > 0 ? (approvedCount / totalSubmissions) * 100 : 0;
        const rejectionRate = totalSubmissions > 0 ? (rejectedCount / totalSubmissions) * 100 : 0;

        // Find top contributor
        const contributorCounts: Record<string, number> = {};
        memes?.forEach(meme => {
            if (meme.user_email) {
                contributorCounts[meme.user_email] = (contributorCounts[meme.user_email] || 0) + 1;
            }
        });

        const topContributor = Object.entries(contributorCounts).length > 0
            ? Object.entries(contributorCounts).reduce((a, b) => a[1] > b[1] ? a : b)
            : null;

        // Recent activity (simplified - in production, you'd have an activity log table)
        const recentActivity = memes?.slice(0, 10).map(meme => ({
            action: `Meme "${meme.title || 'Untitled'}" ${meme.status}`,
            timestamp: meme.created_at,
            user: meme.user_email
        })) || [];

        return NextResponse.json({
            totalSubmissions,
            approvalRate,
            rejectionRate,
            scheduledCount,
            publishedCount,
            pendingCount,
            topContributor: topContributor ? {
                email: topContributor[0],
                count: topContributor[1]
            } : null,
            recentActivity
        });
    } catch (error) {
        console.error('Analytics API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
