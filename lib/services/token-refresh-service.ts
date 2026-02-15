import axios from 'axios';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { saveLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { LinkedAccount } from '@/lib/types';
import { Logger } from '@/lib/utils/logger';
import { withRetry } from '@/lib/utils/retry';
import { decryptTokenFromStorage } from '@/lib/utils/token-encryption';

const MODULE = 'token-refresh';
const GRAPH_API_VERSION = 'v24.0';
const EXPIRY_WARNING_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface RefreshResult {
	userId: string;
	success: boolean;
	action: 'refreshed' | 'skipped' | 'failed';
	daysRemaining?: number;
	error?: string;
}

interface TokenRefreshSummary {
	totalAccounts: number;
	refreshed: number;
	skipped: number;
	failed: number;
	results: RefreshResult[];
}

function getDaysUntilExpiry(expiresAt: number | undefined): number | null {
	if (!expiresAt) return null;
	return Math.floor((expiresAt - Date.now()) / MS_PER_DAY);
}

function isTokenExpiringSoon(expiresAt: number | undefined): boolean {
	const days = getDaysUntilExpiry(expiresAt);
	return days !== null && days <= EXPIRY_WARNING_DAYS;
}

function isTokenExpired(expiresAt: number | undefined): boolean {
	if (!expiresAt) return false;
	return expiresAt < Date.now();
}

async function exchangeForLongLivedToken(
	currentToken: string,
	appId: string,
	appSecret: string,
): Promise<{ accessToken: string; expiresIn: number }> {
	const response = await axios.get(
		`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`,
		{
			params: {
				grant_type: 'fb_exchange_token',
				client_id: appId,
				client_secret: appSecret,
				fb_exchange_token: currentToken,
			},
		},
	);

	return {
		accessToken: response.data.access_token,
		expiresIn: response.data.expires_in,
	};
}

async function refreshSingleAccount(
	account: LinkedAccount,
	appId: string,
	appSecret: string,
): Promise<RefreshResult> {
	const userId = account.user_id;
	const daysRemaining = getDaysUntilExpiry(account.expires_at);

	if (isTokenExpired(account.expires_at)) {
		await Logger.error(MODULE, 'Token has expired and cannot be refreshed', {
			userId,
			expiresAt: account.expires_at,
		});
		return { userId, success: false, action: 'failed', daysRemaining: 0, error: 'Token already expired' };
	}

	const needsRefresh = isTokenExpiringSoon(account.expires_at) || !account.expires_at;

	if (!needsRefresh && daysRemaining !== null && daysRemaining > EXPIRY_WARNING_DAYS) {
		await Logger.debug(MODULE, `Token healthy, skipping refresh`, {
			userId,
			daysRemaining,
		});
		return { userId, success: true, action: 'skipped', daysRemaining: daysRemaining ?? undefined };
	}

	if (daysRemaining !== null && daysRemaining <= EXPIRY_WARNING_DAYS) {
		await Logger.warn(MODULE, `Token expiring in ${daysRemaining} days`, {
			userId,
			daysRemaining,
			expiresAt: account.expires_at,
		});
	}

	try {
		const decryptedToken = decryptTokenFromStorage(account.access_token);
		const { accessToken, expiresIn } = await withRetry(
			() => exchangeForLongLivedToken(decryptedToken, appId, appSecret),
			{
				maxAttempts: 3,
				initialDelayMs: 2000,
				backoffFactor: 2,
			},
		);

		const newExpiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;

		await saveLinkedFacebookAccount({
			...account,
			access_token: accessToken,
			expires_at: newExpiresAt,
			updated_at: new Date().toISOString(),
		});

		const newDaysRemaining = getDaysUntilExpiry(newExpiresAt);

		await Logger.info(MODULE, `Token refreshed successfully`, {
			userId,
			previousDaysRemaining: daysRemaining,
			newDaysRemaining,
		});

		return {
			userId,
			success: true,
			action: 'refreshed',
			daysRemaining: newDaysRemaining ?? undefined,
		};
	} catch (error: unknown) {
		const errorMessage = axios.isAxiosError(error)
			? String(error.response?.data?.error?.message || error.message)
			: error instanceof Error
				? error.message
				: String(error);

		await Logger.error(MODULE, `Token refresh failed after retries`, {
			userId,
			daysRemaining,
			error: errorMessage,
		});

		return { userId, success: false, action: 'failed', daysRemaining: daysRemaining ?? undefined, error: errorMessage };
	}
}

export async function refreshAllTokens(): Promise<TokenRefreshSummary> {
	const appId = process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID;
	const appSecret = process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET;

	if (!appId || !appSecret) {
		await Logger.error(MODULE, 'Missing Meta App credentials for token refresh');
		return { totalAccounts: 0, refreshed: 0, skipped: 0, failed: 0, results: [] };
	}

	const { data: accounts, error: fetchError } = await supabaseAdmin
		.from('linked_accounts')
		.select('id, user_id, provider, provider_account_id, access_token, refresh_token, expires_at, ig_user_id, ig_username, created_at, updated_at')
		.eq('provider', 'facebook');

	if (fetchError) {
		await Logger.error(MODULE, `Failed to fetch linked accounts: ${fetchError.message}`);
		return { totalAccounts: 0, refreshed: 0, skipped: 0, failed: 0, results: [] };
	}

	if (!accounts || accounts.length === 0) {
		await Logger.info(MODULE, 'No linked accounts found to refresh');
		return { totalAccounts: 0, refreshed: 0, skipped: 0, failed: 0, results: [] };
	}

	await Logger.info(MODULE, `Starting token refresh check for ${accounts.length} account(s)`);

	const results: RefreshResult[] = [];

	for (const account of accounts) {
		const result = await refreshSingleAccount(account as LinkedAccount, appId, appSecret);
		results.push(result);
	}

	const summary: TokenRefreshSummary = {
		totalAccounts: accounts.length,
		refreshed: results.filter((r) => r.action === 'refreshed').length,
		skipped: results.filter((r) => r.action === 'skipped').length,
		failed: results.filter((r) => r.action === 'failed').length,
		results,
	};

	const logLevel = summary.failed > 0 ? 'warn' : 'info';
	await Logger.log(
		`Token refresh complete: ${summary.refreshed} refreshed, ${summary.skipped} skipped, ${summary.failed} failed`,
		{ module: MODULE, level: logLevel, details: summary },
	);

	return summary;
}
