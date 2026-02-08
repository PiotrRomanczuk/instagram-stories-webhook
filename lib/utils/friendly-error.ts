/**
 * Maps raw API errors to user-friendly messages with optional action guidance.
 */

export interface FriendlyErrorInfo {
	message: string;
	action?: string;
	actionHref?: string;
}

export function getFriendlyError(raw: string): FriendlyErrorInfo {
	const lower = raw.toLowerCase();

	if (lower.includes('facebook connection') || lower.includes('link your account')) {
		return {
			message: 'Connection lost',
			action: 'Reconnect Account',
			actionHref: '/api/auth/link-facebook',
		};
	}

	if (lower.includes('token expired') || lower.includes('code 190')) {
		return {
			message: 'Token expired',
			action: 'Re-authenticate',
			actionHref: '/api/auth/link-facebook',
		};
	}

	if (lower.includes('token')) {
		return {
			message: 'Token error',
			action: 'Re-authenticate',
			actionHref: '/api/auth/link-facebook',
		};
	}

	if (lower.includes('rate limit') || lower.includes('368')) {
		return { message: 'Rate limited — try again later' };
	}

	if (lower.includes('timeout')) {
		return { message: 'Request timed out — retry' };
	}

	if (lower.includes('invalid') && lower.includes('media')) {
		return { message: 'Invalid media format' };
	}

	if (lower.includes('code 100')) {
		return { message: 'Invalid API parameters' };
	}

	if (raw.length > 80) {
		return { message: raw.slice(0, 77) + '...' };
	}

	return { message: raw };
}

/** Short label for inline display (e.g., on cards) */
export function getFriendlyErrorShort(raw: string): string {
	return getFriendlyError(raw).message;
}
