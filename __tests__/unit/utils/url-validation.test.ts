/**
 * Unit tests for SSRF URL validation utility (H1)
 * Verifies that validateFetchUrl blocks unsafe URLs and allows safe ones.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateFetchUrl } from '@/lib/utils/url-validation';

describe('validateFetchUrl', () => {
	describe('private IPv4 ranges', () => {
		it('blocks 10.x.x.x addresses', () => {
			expect(() => validateFetchUrl('https://10.0.0.1/secret')).toThrow(
				'Access to private IP range is not allowed',
			);
			expect(() => validateFetchUrl('https://10.255.255.255/data')).toThrow(
				'Access to private IP range is not allowed',
			);
		});

		it('blocks 172.16-31.x.x addresses', () => {
			expect(() => validateFetchUrl('https://172.16.0.1/secret')).toThrow(
				'Access to private IP range is not allowed',
			);
			expect(() => validateFetchUrl('https://172.31.255.255/data')).toThrow(
				'Access to private IP range is not allowed',
			);
		});

		it('does not block 172.15.x.x (outside private range)', () => {
			// 172.15.x.x is public; should not throw (just pass URL validation)
			expect(() => validateFetchUrl('https://172.15.0.1/path')).not.toThrow();
		});

		it('does not block 172.32.x.x (outside private range)', () => {
			expect(() => validateFetchUrl('https://172.32.0.1/path')).not.toThrow();
		});

		it('blocks 192.168.x.x addresses', () => {
			expect(() => validateFetchUrl('https://192.168.0.1/router')).toThrow(
				'Access to private IP range is not allowed',
			);
			expect(() => validateFetchUrl('https://192.168.100.50/admin')).toThrow(
				'Access to private IP range is not allowed',
			);
		});
	});

	describe('loopback addresses', () => {
		it('blocks localhost', () => {
			expect(() => validateFetchUrl('https://localhost/api')).toThrow(
				'Access to localhost is not allowed',
			);
		});

		it('blocks 127.0.0.1', () => {
			expect(() => validateFetchUrl('https://127.0.0.1/api')).toThrow(
				'Access to localhost is not allowed',
			);
		});

		it('blocks ::1 (IPv6 loopback)', () => {
			expect(() => validateFetchUrl('https://[::1]/api')).toThrow(
				'Access to localhost is not allowed',
			);
		});

		it('blocks other 127.x.x.x loopback addresses', () => {
			expect(() => validateFetchUrl('https://127.0.0.2/api')).toThrow(
				'Access to loopback address is not allowed',
			);
			expect(() => validateFetchUrl('https://127.100.200.1/api')).toThrow(
				'Access to loopback address is not allowed',
			);
		});
	});

	describe('cloud metadata endpoints', () => {
		it('blocks AWS instance metadata endpoint (169.254.169.254)', () => {
			expect(() =>
				validateFetchUrl('https://169.254.169.254/latest/meta-data/'),
			).toThrow('Access to cloud metadata endpoint is not allowed');
		});

		it('blocks GCP metadata server (metadata.google.internal)', () => {
			expect(() =>
				validateFetchUrl('https://metadata.google.internal/computeMetadata/v1/'),
			).toThrow('Access to cloud metadata endpoint is not allowed');
		});

		it('blocks generic metadata.internal', () => {
			expect(() =>
				validateFetchUrl('https://metadata.internal/token'),
			).toThrow('Access to cloud metadata endpoint is not allowed');
		});

		it('blocks link-local range (169.254.x.x)', () => {
			expect(() => validateFetchUrl('https://169.254.1.1/anything')).toThrow(
				'Access to private IP range is not allowed',
			);
		});
	});

	describe('valid public HTTPS URLs', () => {
		it('allows well-known CDN URL', () => {
			expect(validateFetchUrl('https://cdn.example.com/image.jpg')).toBe(
				'https://cdn.example.com/image.jpg',
			);
		});

		it('allows Instagram CDN URL', () => {
			const url = 'https://scontent.cdninstagram.com/v/photo.jpg';
			expect(validateFetchUrl(url)).toBe(url);
		});

		it('allows Supabase storage URL', () => {
			const url = 'https://abc.supabase.co/storage/v1/object/public/stories/file.mp4';
			expect(validateFetchUrl(url)).toBe(url);
		});

		it('allows URL with query parameters', () => {
			const url = 'https://api.example.com/data?foo=bar&baz=qux';
			expect(validateFetchUrl(url)).toBe(url);
		});

		it('returns the original URL string unchanged', () => {
			const url = 'https://example.com/path';
			const result = validateFetchUrl(url);
			expect(result).toBe(url);
		});
	});

	describe('invalid URL strings', () => {
		it('throws for completely invalid URL', () => {
			expect(() => validateFetchUrl('not-a-url')).toThrow('Invalid URL');
		});

		it('throws for empty string', () => {
			expect(() => validateFetchUrl('')).toThrow('Invalid URL');
		});

		it('throws for relative path', () => {
			expect(() => validateFetchUrl('/internal/api')).toThrow('Invalid URL');
		});
	});

	describe('HTTPS enforcement in production', () => {
		beforeEach(() => {
			vi.stubEnv('NODE_ENV', 'production');
		});

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it('blocks HTTP URLs in production', () => {
			expect(() => validateFetchUrl('http://example.com/image.jpg')).toThrow(
				'Only HTTPS URLs are allowed in production',
			);
		});

		it('allows HTTPS URLs in production', () => {
			expect(() => validateFetchUrl('https://example.com/image.jpg')).not.toThrow();
		});
	});
});
