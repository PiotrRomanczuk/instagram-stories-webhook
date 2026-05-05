import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Logger } from '@/lib/utils/logger';
import { completeOnboardingSchema } from '@/lib/validations/profile.schema';
import { completeUserOnboarding, getUserProfileByEmail } from '@/lib/database/user-profile';
import { preventWriteForDemo } from '@/lib/preview-guard';

const MODULE = 'api:profile:onboarding';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getUserProfileByEmail(session.user.email);
    return NextResponse.json({
        profile,
        onboarded: !!profile?.onboarded_at,
    });
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const demoGuard = preventWriteForDemo(session);
    if (demoGuard) return demoGuard;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = completeOnboardingSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
            { status: 400 },
        );
    }

    const updated = await completeUserOnboarding(session.user.id, {
        displayName: parsed.data.displayName,
        handle: parsed.data.handle,
        contactEmail: parsed.data.contactEmail,
    });

    if (!updated) {
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    Logger.info(MODULE, `Onboarding completed for ${session.user.email}`);
    return NextResponse.json({ profile: updated, onboarded: true });
}
