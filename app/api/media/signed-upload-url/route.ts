/**
 * POST /api/media/signed-upload-url
 *
 * Generate a signed URL for direct client-side uploads to Supabase Storage.
 * This bypasses the Vercel function body size limit by allowing the client
 * to upload directly to Supabase using a pre-signed URL.
 *
 * Request: { fileName: string, contentType: string, pathPrefix?: string }
 * Response: { signedUrl: string, storagePath: string, publicUrl: string }
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { preventWriteForDemo } from '@/lib/preview-guard';

const MODULE = 'api:media:signed-upload-url';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime', 'video/webm'];

export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const body = await request.json();
		const { fileName, contentType, pathPrefix = 'uploads' } = body;

		if (!fileName || !contentType) {
			return NextResponse.json(
				{ error: 'fileName and contentType are required' },
				{ status: 400 }
			);
		}

		// Validate content type
		if (!ALLOWED_TYPES.includes(contentType)) {
			return NextResponse.json(
				{ error: 'Invalid file type. Only images and videos are allowed.' },
				{ status: 400 }
			);
		}

		// Determine file type and generate storage path
		const ext = fileName.split('.').pop() || (contentType.startsWith('video/') ? 'mp4' : 'jpg');
		const type = contentType.startsWith('video/') ? 'videos' : 'images';
		const storagePath = `${pathPrefix}/${type}/${crypto.randomUUID()}-${Date.now()}.${ext}`;

		// Create a signed URL for upload (valid for 5 minutes)
		const { data, error } = await supabaseAdmin.storage
			.from('stories')
			.createSignedUploadUrl(storagePath);

		if (error || !data) {
			await Logger.error(MODULE, 'Failed to create signed URL', { error: error?.message });
			return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 });
		}

		// Get the public URL for the file (will be accessible after upload)
		const {
			data: { publicUrl },
		} = supabaseAdmin.storage.from('stories').getPublicUrl(storagePath);

		await Logger.info(MODULE, 'Signed upload URL created', {
			user: session.user.email,
			storagePath,
			contentType,
		});

		return NextResponse.json({
			signedUrl: data.signedUrl,
			token: data.token,
			storagePath,
			publicUrl,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		await Logger.error(MODULE, 'Error creating signed URL', { error: message });
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
