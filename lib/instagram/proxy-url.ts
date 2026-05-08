/**
 * Wraps an IG CDN URL with the proxy route so the browser can load it
 * without hitting CORS or expired-signature errors. The proxy route
 * re-fetches with the linked account's access token server-side.
 */
export function proxyUrl(url: string | undefined, download = false): string | undefined {
	if (!url) return undefined;
	const params = new URLSearchParams({ url });
	if (download) params.set('download', '1');
	return `/api/instagram/proxy?${params.toString()}`;
}
