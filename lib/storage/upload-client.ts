/**
 * Client-side upload helper that uploads directly to Supabase Storage.
 * Bypasses Vercel serverless function to avoid 4.5MB payload limit.
 */

import { supabase } from '@/lib/config/supabase';

interface UploadOptions {
	/** Storage path prefix (default: 'uploads') */
	path?: string;
	/** Allow overwriting existing files */
	upsert?: boolean;
}

interface UploadResult {
	publicUrl: string;
	storagePath: string;
}

export async function uploadToStorage(
	file: File | Blob,
	options?: UploadOptions,
): Promise<UploadResult> {
	const pathPrefix = options?.path || 'uploads';

	// Determine file type and extension
	const fileName = file instanceof File ? file.name : 'upload';
	const contentType = file.type || '';
	const ext = fileName.split('.').pop() || (contentType.startsWith('video/') ? 'mp4' : 'jpg');
	const type = contentType.startsWith('video/') ? 'videos' : 'images';

	// Generate storage path
	const storagePath = `${pathPrefix}/${type}/${crypto.randomUUID()}-${Date.now()}.${ext}`;

	// Upload directly to Supabase Storage (bypasses Vercel function limit)
	const { error: uploadError } = await supabase.storage
		.from('stories')
		.upload(storagePath, file, {
			cacheControl: '3600',
			upsert: options?.upsert ?? false,
			contentType,
		});

	if (uploadError) {
		throw new Error(uploadError.message || 'Upload failed');
	}

	const {
		data: { publicUrl },
	} = supabase.storage.from('stories').getPublicUrl(storagePath);

	return { publicUrl, storagePath };
}
