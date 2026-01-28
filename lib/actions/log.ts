'use server';

import { Logger } from '@/lib/utils/logger';

/**
 * Server action to log errors from client components
 * ensuring that fs/node modules are not bundled for the client
 */
export async function logError(
	module: string,
	message: string,
	details?: unknown,
) {
	try {
		await Logger.error(module, message, details);
	} catch (err) {
		console.error('Failed to log error via server action:', err);
	}
}

export async function logInfo(
	module: string,
	message: string,
	details?: unknown,
) {
	try {
		await Logger.info(module, message, details);
	} catch (err) {
		console.error('Failed to log info via server action:', err);
	}
}
