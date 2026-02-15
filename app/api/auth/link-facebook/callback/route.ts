import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
	getInstagramBusinessAccountId,
	getInstagramUsername,
} from '@/lib/instagram/account';
import { saveLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { authOptions } from '@/lib/auth';
import { Logger } from '@/lib/utils/logger';
import { verifySignedState } from '@/lib/utils/crypto-signing';

const MODULE = 'auth';

/**
 * Handles the Facebook OAuth callback for account linking.
 */
export async function GET(req: NextRequest) {
	await Logger.info(MODULE, '📥 Facebook callback received');
	const session = await getServerSession(authOptions);
	const { searchParams } = new URL(req.url);
	const code = searchParams.get('code');
	const state = searchParams.get('state');
	const error = searchParams.get('error');

	// 1. Check for errors from Facebook
	if (error) {
		const errorDesc = searchParams.get('error_description');
		await Logger.error(MODULE, `❌ Facebook OAuth error: ${error}`, {
			error,
			description: errorDesc,
		});
		return NextResponse.redirect(new URL('/?error=fb_auth_failed', req.url));
	}

	// 2. Validate session
	if (!session?.user?.id) {
		await Logger.warn(
			MODULE,
			'⚠️ No session found during Facebook linking callback',
		);
		return NextResponse.redirect(new URL('/auth/signin', req.url));
	}

	const userId = session.user.id;

	// 3. Verify cryptographically signed state for CSRF protection
	const cookieState = req.cookies.get('fb_link_state')?.value;
	if (!state || state !== cookieState) {
		await Logger.error(
			MODULE,
			'🔒 State mismatch in Facebook linking callback',
			{ userId, state, cookieState },
		);
		return NextResponse.redirect(new URL('/?error=state_mismatch', req.url));
	}

	// Verify state signature and contents
	const stateSecret =
		process.env.NEXTAUTH_SECRET || process.env.WEBHOOK_SECRET || '';
	const stateVerification = verifySignedState(state, stateSecret);

	if (!stateVerification.valid) {
		await Logger.error(
			MODULE,
			`🔒 State signature verification failed: ${stateVerification.error}`,
			{ userId },
		);
		return NextResponse.redirect(new URL('/?error=invalid_state', req.url));
	}

	// Verify the userId in state matches the session (prevents session fixation)
	if (stateVerification.data?.userId !== userId) {
		await Logger.error(
			MODULE,
			'🔒 State userId mismatch - possible session fixation attack',
			{
				sessionUserId: userId,
				stateUserId: stateVerification.data?.userId,
			},
		);
		return NextResponse.redirect(new URL('/?error=user_mismatch', req.url));
	}

	if (!code) {
		await Logger.error(MODULE, '❌ No code provided in Facebook callback', {
			userId,
		});
		return NextResponse.redirect(new URL('/?error=no_code', req.url));
	}

	try {
		const appId =
			process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
		const appSecret =
			process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;
		const redirectUri = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/auth/link-facebook/callback`;

		// 4. Exchange code for access token
		await Logger.info(MODULE, `🔑 Exchanging code for token...`, { userId });
		const tokenResponse = await fetch(
			`https://graph.facebook.com/v24.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`,
		);
		const tokenData = await tokenResponse.json();

		if (tokenData.error) {
			await Logger.error(
				MODULE,
				`❌ Token exchange failed: ${tokenData.error.message}`,
				{ userId, error: tokenData.error },
			);
			throw new Error(`Token exchange failed: ${tokenData.error.message}`);
		}

		const shortLivedToken = tokenData.access_token;
		await Logger.info(MODULE, '✅ Short-lived token obtained', { userId });

		// 5. Exchange for long-lived token (60 days)
		const longLivedResponse = await fetch(
			`https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`,
		);
		const longLivedData = await longLivedResponse.json();

		if (longLivedData.error) {
			await Logger.error(
				MODULE,
				`❌ Long-lived token exchange failed: ${longLivedData.error.message}`,
				{ userId, error: longLivedData.error },
			);
			throw new Error(
				`Long-lived token exchange failed: ${longLivedData.error.message}`,
			);
		}

		const accessToken = longLivedData.access_token;
		const expiresAt = longLivedData.expires_in
			? Date.now() + longLivedData.expires_in * 1000
			: undefined;

		const days = longLivedData.expires_in
			? Math.floor(longLivedData.expires_in / 86400)
			: 'unknown';
		await Logger.info(
			MODULE,
			`✅ Long-lived token obtained (expires in ${days} days)`,
			{ userId, days },
		);

		// 6. Fetch Instagram Business Account ID & Username
		await Logger.info(
			MODULE,
			'📸 Fetching Instagram Business Account Info...',
			{ userId },
		);
		const igUserId = await getInstagramBusinessAccountId(accessToken);
		let igUsername: string | undefined = undefined;

		if (igUserId) {
			await Logger.info(
				MODULE,
				`✨ Instagram Business Account found: ${igUserId}`,
				{ userId, igUserId },
			);

			// NEW: Fetch and cache username
			igUsername =
				(await getInstagramUsername(igUserId, accessToken)) || undefined;
			if (igUsername) {
				await Logger.info(MODULE, `👤 IG Username fetched: @${igUsername}`, {
					userId,
					igUsername,
				});
			}
		} else {
			await Logger.warn(MODULE, '⚠️ No Instagram Business Account found', {
				userId,
			});
		}

		// 7. Get Facebook User ID (provider_account_id)
		const meResponse = await fetch(
			`https://graph.facebook.com/me?access_token=${accessToken}`,
		);
		const meData = await meResponse.json();
		const facebookUserId = meData.id;

		// 8. Save to linked_accounts table
		await saveLinkedFacebookAccount({
			user_id: userId,
			provider: 'facebook',
			provider_account_id: facebookUserId,
			access_token: accessToken,
			expires_at: expiresAt,
			ig_user_id: igUserId || undefined,
			ig_username: igUsername,
		});

		await Logger.info(
			MODULE,
			`✅ Facebook account successfully linked for user ${userId}`,
			{ userId, facebookUserId, igUserId },
		);

		// 9. Redirect back to dashboard with success
		const response = NextResponse.redirect(new URL('/?status=linked', req.url));
		response.cookies.delete('fb_link_state');
		return response;
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		await Logger.error(
			MODULE,
			`❌ Facebook linking failed for user ${userId}: ${errorMessage}`,
			{ userId, error },
		);
		return NextResponse.redirect(
			new URL(
				`/?error=linking_failed&message=${encodeURIComponent(errorMessage)}`,
				req.url,
			),
		);
	}
}
