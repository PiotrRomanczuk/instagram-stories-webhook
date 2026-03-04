/**
 * POST /api/media/upload
 *
 * Authenticated proxy for uploading files to the stories storage bucket.
 * All client uploads go through this route instead of direct Supabase access.
 *
 * Accepts: FormData with `file` field + optional `path` prefix
 * Returns: { publicUrl, storagePath }
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { preventWriteForDemo } from '@/lib/preview-guard';

const MODULE = 'api:media:upload';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ['image/', 'video/'];

export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const formData = await request.formData();
		const file = formData.get('file');
		const pathPrefix = (formData.get('path') as string) || 'uploads';
		const upsert = formData.get('upsert') === 'true';

		if (!file || !(file instanceof Blob)) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 });
		}

		// Validate file type
		const contentType = file.type || '';
		if (!ALLOWED_TYPES.some((t) => contentType.startsWith(t))) {
			return NextResponse.json(
				{ error: 'Invalid file type. Only images and videos are allowed.' },
				{ status: 400 },
			);
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
				{ status: 400 },
			);
		}

		// Determine file extension
		const fileName = file instanceof File ? file.name : 'upload';
		const ext = fileName.split('.').pop() || (contentType.startsWith('video/') ? 'mp4' : 'jpg');
		const type = contentType.startsWith('video/') ? 'videos' : 'images';

		// Generate storage path
		const storagePath = `${pathPrefix}/${type}/${crypto.randomUUID()}-${Date.now()}.${ext}`;

		// Upload via service_role client
		const buffer = Buffer.from(await file.arrayBuffer());
		const { error: uploadError } = await supabaseAdmin.storage
			.from('stories')
			.upload(storagePath, buffer, {
				cacheControl: '3600',
				upsert,
				contentType,
			});

		if (uploadError) {
			await Logger.error(MODULE, 'Upload failed', { error: uploadError.message });
			return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
		}

		const {
			data: { publicUrl },
		} = supabaseAdmin.storage.from('stories').getPublicUrl(storagePath);

		await Logger.info(MODULE, 'File uploaded', {
			user: session.user.email,
			storagePath,
			size: file.size,
		});

		return NextResponse.json({ publicUrl, storagePath });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		await Logger.error(MODULE, 'Upload error', { error: message });
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
