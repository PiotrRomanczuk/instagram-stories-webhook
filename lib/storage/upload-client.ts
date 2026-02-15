/**
 * Client-side upload helper that proxies through the authenticated API route.
 * Replaces direct supabase.storage.from('stories').upload() calls in components.
 */

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
	const formData = new FormData();
	formData.append('file', file);

	if (options?.path) {
		formData.append('path', options.path);
	}
	if (options?.upsert) {
		formData.append('upsert', 'true');
	}

	const response = await fetch('/api/media/upload', {
		method: 'POST',
		body: formData,
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
		throw new Error(errorData.error || `Upload failed (${response.status})`);
	}

	return response.json();
}
