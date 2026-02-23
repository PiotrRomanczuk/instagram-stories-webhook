/**
 * SSRF Protection Utility
 *
 * Validates URLs before fetching to prevent Server-Side Request Forgery (SSRF) attacks.
 * Blocks private IP ranges, loopback addresses, cloud metadata endpoints, and link-local addresses.
 */

/** Hostnames that are always blocked regardless of IP pattern matching */
const BLOCKED_HOSTS = [
	'169.254.169.254',       // AWS/GCP instance metadata
	'metadata.google.internal', // GCP metadata server
	'metadata.internal',     // Generic cloud metadata alias
];

/** Patterns matching private and link-local IPv4 ranges (RFC 1918 + RFC 3927) */
const PRIVATE_IP_PATTERNS = [
	/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,          // 10.0.0.0/8
	/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
	/^192\.168\.\d{1,3}\.\d{1,3}$/,              // 192.168.0.0/16
	/^169\.254\.\d{1,3}\.\d{1,3}$/,              // 169.254.0.0/16 link-local
];

/**
 * Validates a URL to prevent SSRF attacks.
 *
 * Throws an error if the URL:
 * - Is not a valid URL
 * - Uses HTTP in production (non-HTTPS)
 * - Points to localhost or loopback addresses
 * - Points to cloud metadata endpoints
 * - Points to private IP ranges (RFC 1918)
 * - Points to link-local addresses
 *
 * @param url - The URL string to validate
 * @returns The original URL string if it passes all checks
 * @throws Error if the URL is considered unsafe
 */
export function validateFetchUrl(url: string): string {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error(`Invalid URL: ${url}`);
	}

	// Enforce HTTPS in production
	if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
		throw new Error(`Only HTTPS URLs are allowed in production: ${url}`);
	}

	const hostname = parsed.hostname.toLowerCase();

	// Block loopback addresses — IPv6 ::1 is returned as "[::1]" by the URL parser
	if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
		throw new Error(`Access to localhost is not allowed: ${url}`);
	}

	// Block other loopback range (127.0.0.0/8 beyond 127.0.0.1)
	if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
		throw new Error(`Access to loopback address is not allowed: ${url}`);
	}

	// Block known cloud metadata endpoints
	if (BLOCKED_HOSTS.includes(hostname)) {
		throw new Error(`Access to cloud metadata endpoint is not allowed: ${url}`);
	}

	// Block private IP ranges and link-local
	if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))) {
		throw new Error(`Access to private IP range is not allowed: ${url}`);
	}

	return url;
}
