import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserProfileByEmail } from '@/lib/database/user-profile';
import { WelcomeWizard } from '@/app/components/onboarding/welcome-wizard';

export default async function WelcomePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect('/auth/signin');
    }

    const role = session.user.role;
    if (role === 'admin' || role === 'developer' || role === 'demo') {
        redirect('/');
    }

    const profile = await getUserProfileByEmail(session.user.email);
    if (profile?.onboarded_at) {
        redirect('/');
    }

    const initialName =
        profile?.display_name ??
        session.user.name ??
        session.user.email?.split('@')[0] ??
        '';

    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
            <WelcomeWizard
                initialDisplayName={initialName}
                accountEmail={session.user.email}
            />
        </main>
    );
}
