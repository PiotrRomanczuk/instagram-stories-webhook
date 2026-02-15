import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import {
	encryptTokenForStorage,
	isTokenEncrypted,
} from '@/lib/utils/token-encryption';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'admin:encrypt-tokens';

/**
 * One-time migration endpoint to encrypt existing plaintext tokens in linked_accounts.
 * Protected by CRON_SECRET header. Remove after migration is complete.
 *
 * Usage: POST /api/admin/encrypt-tokens
 * Header: x-cron-secret: <CRON_SECRET>
 */
export async function POST(req: NextRequest) {
	const secret = req.headers.get('x-cron-secret');
	if (!secret || secret !== process.env.CRON_SECRET) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!process.env.TOKEN_ENCRYPTION_KEY) {
		return NextResponse.json(
			{ error: 'TOKEN_ENCRYPTION_KEY environment variable is not set' },
			{ status: 500 },
		);
	}

	try {
		const { data: accounts, error } = await supabaseAdmin
			.from('linked_accounts')
			.select('id, access_token, refresh_token');

		if (error) {
			Logger.error(MODULE, 'Failed to fetch accounts', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (!accounts || accounts.length === 0) {
			return NextResponse.json({ message: 'No accounts to migrate', migrated: 0 });
		}

		let migrated = 0;
		let skipped = 0;
		const errors: string[] = [];

		for (const account of accounts) {
			const accessAlreadyEncrypted = isTokenEncrypted(account.access_token);
			const refreshAlreadyEncrypted =
				account.refresh_token ? isTokenEncrypted(account.refresh_token) : true;

			if (accessAlreadyEncrypted && refreshAlreadyEncrypted) {
				skipped++;
				continue;
			}

			try {
				const updates: Record<string, string> = {};

				if (!accessAlreadyEncrypted) {
					updates.access_token = encryptTokenForStorage(account.access_token);
				}

				if (account.refresh_token && !refreshAlreadyEncrypted) {
					updates.refresh_token = encryptTokenForStorage(account.refresh_token);
				}

				const { error: updateError } = await supabaseAdmin
					.from('linked_accounts')
					.update(updates)
					.eq('id', account.id);

				if (updateError) {
					errors.push(`Account ${account.id}: ${updateError.message}`);
				} else {
					migrated++;
				}
			} catch (encError: unknown) {
				const msg = encError instanceof Error ? encError.message : String(encError);
				errors.push(`Account ${account.id}: ${msg}`);
			}
		}

		Logger.info(MODULE, `Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors.length} errors`);

		return NextResponse.json({
			message: 'Token encryption migration complete',
			migrated,
			skipped,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : 'Unknown error';
		Logger.error(MODULE, `Migration failed: ${msg}`, error);
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
