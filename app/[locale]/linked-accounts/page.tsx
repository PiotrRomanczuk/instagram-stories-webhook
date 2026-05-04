import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { LinkedAccountsClient } from './linked-accounts-client';

export default async function LinkedAccountsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/auth/signin');
    const role = getUserRole(session);
    if (role !== 'admin' && role !== 'developer') redirect('/');
    return <LinkedAccountsClient />;
}
