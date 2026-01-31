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
			return NextResponse.json({ token: null, connected: false });
		}

		// Check if token is expired
		const isExpired = linkedAccount.expires_at
			? linkedAccount.expires_at < Date.now()
			: false;

		return NextResponse.json({
			connected: true,
			token: {
				expires_at: linkedAccount.expires_at,
				ig_username: linkedAccount.ig_username,
				ig_user_id: linkedAccount.ig_user_id,
				provider_account_id: linkedAccount.provider_account_id,
				is_expired: isExpired,
			},
		});
	} catch (error) {
		console.error('Failed to get token status:', error);
		return NextResponse.json({ error: 'Failed to get token status' }, { status: 500 });
	}
}
