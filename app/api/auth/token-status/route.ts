import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getLinkedFacebookAccount } from '@/lib/database/linked-accounts';

export async function GET() {
	try {
		const session = await getServerSession(authOptions);

		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const linkedAccount = await getLinkedFacebookAccount(session.user.id);

		if (!linkedAccount) {
			return NextResponse.json({ token: null });
		}

		return NextResponse.json({
			token: {
				expires_at: linkedAccount.expires_at,
				ig_username: linkedAccount.ig_username,
				provider_account_id: linkedAccount.provider_account_id,
			},
		});
	} catch (error) {
		console.error('Failed to get token status:', error);
		return NextResponse.json({ error: 'Failed to get token status' }, { status: 500 });
	}
}
