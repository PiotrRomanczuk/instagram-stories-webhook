import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const ALLOWED_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/i;
const EXT_FROM_TYPE: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'video/mp4': 'mp4',
	'video/quicktime': 'mov',
};

/**
 * GET /api/instagram/proxy?url=<cdn-url>[&download=1]
 *
 * Streams a media file from Instagram's CDN through our origin so the
 * browser can render it (bypasses cross-origin / hotlink restrictions)
 * and so users can save it via a download button.
 *
 * Only `*.cdninstagram.com` and `*.fbcdn.net` hosts are accepted to
 * prevent the endpoint from being abused as an open proxy.
 */
export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { searchParams } = new URL(req.url);
	const target = searchParams.get('url');
	const download = searchParams.get('download') === '1';
	if (!target) {
		return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
	}

	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
	}
	if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.test(parsed.hostname)) {
		return NextResponse.json({ error: 'Forbidden host' }, { status: 400 });
	}

	const upstream = await fetch(parsed.toString(), {
		headers: { Accept: 'image/*,video/*,*/*' },
	});
	if (!upstream.ok || !upstream.body) {
		return NextResponse.json(
			{ error: `Upstream ${upstream.status}` },
			{ status: 502 },
		);
	}

	const contentType =
		upstream.headers.get('content-type') ?? 'application/octet-stream';
	const headers = new Headers({
		'Content-Type': contentType,
		'Cache-Control': 'private, max-age=300',
	});
	const len = upstream.headers.get('content-length');
	if (len) headers.set('Content-Length', len);

	if (download) {
		const ext = EXT_FROM_TYPE[contentType.split(';')[0].trim()] ?? 'bin';
		const stamp = new Date().toISOString().replace(/[:.]/g, '-');
		headers.set(
			'Content-Disposition',
			`attachment; filename="instagram-story-${stamp}.${ext}"`,
		);
	}

	return new Response(upstream.body, { headers });
}
