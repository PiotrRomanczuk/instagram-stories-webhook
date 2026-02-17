/**
 * Client-side upload helper using Supabase signed upload URLs.
 *
 * Flow:
 * 1. Request signed URL from authenticated API route (small payload)
 * 2. Upload file directly to Supabase using signed URL (bypasses Vercel)
 *
 * This avoids Vercel's 4.5MB function body limit while maintaining
 * authentication and security through the signed URL.
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
	const fileName = file instanceof File ? file.name : 'upload';
	const contentType = file.type || 'application/octet-stream';

	// Step 1: Get signed upload URL from authenticated API route
	const signedUrlResponse = await fetch('/api/media/signed-upload-url', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			fileName,
			contentType,
			pathPrefix: options?.path,
		}),
	});

	if (!signedUrlResponse.ok) {
		const errorData = await signedUrlResponse.json().catch(() => ({ error: 'Failed to get upload URL' }));
		throw new Error(errorData.error || `Failed to get upload URL (${signedUrlResponse.status})`);
	}

	const { signedUrl, token, storagePath, publicUrl } = await signedUrlResponse.json();

	// Step 2: Upload file directly to Supabase using signed URL
	const uploadResponse = await fetch(signedUrl, {
		method: 'PUT',
		body: file,
		headers: {
			'Content-Type': contentType,
			'x-upsert': options?.upsert ? 'true' : 'false',
			...(token ? { 'x-upload-token': token } : {}),
		},
	});

	if (!uploadResponse.ok) {
		const errorText = await uploadResponse.text().catch(() => 'Upload failed');
		throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
	}

	return { publicUrl, storagePath };
}
