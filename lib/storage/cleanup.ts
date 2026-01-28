import { supabaseAdmin } from '../config/supabase-admin';
import { Logger } from '../utils/logger';

const MODULE = 'storage:cleanup';

/**
 * Cleans up orphaned storage files
 * Files that are in pending_uploads but older than 1 hour
 * (meaning the submission form was likely closed or crashed)
 */
export async function cleanupOrphanedUploads(): Promise<{
	deletedCount: number;
	errors: string[];
}> {
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
	const results = { deletedCount: 0, errors: [] as string[] };

	try {
		// 1. Get orphaned uploads from tracking table
		const { data: orphaned, error: fetchError } = await supabaseAdmin
			.from('pending_uploads')
			.select('*')
			.lt('created_at', oneHourAgo);

		if (fetchError) {
			throw fetchError;
		}

		if (!orphaned || orphaned.length === 0) {
			return results;
		}

		Logger.info(
			MODULE,
			`Found ${orphaned.length} potentially orphaned uploads`,
		);

		for (const item of orphaned) {
			try {
				// 2. Double check they aren't actually linked to a meme
				// (This is redundant if we delete from pending_uploads on success, but safe)
				const { count } = await supabaseAdmin
					.from('meme_submissions')
					.select('id', { count: 'exact', head: true })
					.eq('storage_path', item.storage_path);

				if (count && count > 0) {
					Logger.info(
						MODULE,
						`File ${item.storage_path} is actually linked to meme, removing from pending`,
					);
					await supabaseAdmin
						.from('pending_uploads')
						.delete()
						.eq('id', item.id);
					continue;
				}

				// 3. Delete from Supabase Storage
				const { error: storageError } = await supabaseAdmin.storage
					.from('stories') // The bucket used in meme-submit-form
					.remove([item.storage_path]);

				if (storageError) {
					Logger.error(
						MODULE,
						`Failed to delete ${item.storage_path} from storage`,
						storageError,
					);
					results.errors.push(
						`Storage error for ${item.storage_path}: ${storageError.message}`,
					);
					continue;
				}

				// 4. Delete from pending_uploads table
				const { error: deleteError } = await supabaseAdmin
					.from('pending_uploads')
					.delete()
					.eq('id', item.id);

				if (deleteError) {
					Logger.error(
						MODULE,
						`Failed to delete record ${item.id} from DB`,
						deleteError,
					);
				}

				results.deletedCount++;
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				results.errors.push(`Error processing ${item.storage_path}: ${msg}`);
			}
		}

		Logger.info(
			MODULE,
			`Cleanup completed. Deleted ${results.deletedCount} orphaned files.`,
		);
		return results;
	} catch (error) {
		Logger.error(MODULE, 'Critical error during cleanup', error);
		results.errors.push(error instanceof Error ? error.message : String(error));
		return results;
	}
}
