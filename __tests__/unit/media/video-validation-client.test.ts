import { describe, it, expect } from 'vitest';
import {
	validateVideoFile,
	formatFileSize,
	ALLOWED_MIME_TYPES,
	ALLOWED_EXTENSIONS,
	MAX_FILE_SIZE_BYTES,
} from '@/lib/media/video-validation-client';

/**
 * Helper to create a mock File object with given properties.
 */
function createMockFile(
	name: string,
	size: number,
	type: string
): File {
	const blob = new Blob(['x'.repeat(Math.min(size, 100))], { type });
	Object.defineProperty(blob, 'size', { value: size });
	Object.defineProperty(blob, 'name', { value: name });
	return blob as File;
}

describe('validateVideoFile', () => {
	describe('valid files', () => {
		it('accepts a valid MP4 file', () => {
			const file = createMockFile('video.mp4', 50 * 1024 * 1024, 'video/mp4');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('accepts a valid MOV file', () => {
			const file = createMockFile('video.mov', 10 * 1024 * 1024, 'video/quicktime');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('accepts a valid WebM file', () => {
			const file = createMockFile('video.webm', 5 * 1024 * 1024, 'video/webm');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('accepts a file exactly at the size limit', () => {
			const file = createMockFile('video.mp4', 100 * 1024 * 1024, 'video/mp4');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(true);
		});

		it('accepts a file with empty MIME type but valid extension', () => {
			// Some browsers may not detect MIME type
			const file = createMockFile('video.mp4', 1024, '');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(true);
		});
	});

	describe('MIME type validation', () => {
		it('rejects an image file', () => {
			const file = createMockFile('photo.jpg', 1024, 'image/jpeg');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ field: 'type' }),
				])
			);
		});

		it('rejects an audio file', () => {
			const file = createMockFile('song.mp3', 1024, 'audio/mpeg');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ field: 'type' }),
				])
			);
		});

		it('rejects application/octet-stream', () => {
			const file = createMockFile('file.mp4', 1024, 'application/octet-stream');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ field: 'type' }),
				])
			);
		});

		it('includes guidance in the MIME type error', () => {
			const file = createMockFile('photo.png', 1024, 'image/png');
			const result = validateVideoFile(file);
			const typeError = result.errors.find((e) => e.field === 'type');
			expect(typeError?.guidance).toContain('MP4');
			expect(typeError?.guidance).toContain('MOV');
			expect(typeError?.guidance).toContain('WebM');
		});
	});

	describe('extension validation', () => {
		it('rejects a file with .avi extension', () => {
			const file = createMockFile('video.avi', 1024, 'video/mp4');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ field: 'extension' }),
				])
			);
		});

		it('rejects a file with no extension', () => {
			const file = createMockFile('video', 1024, 'video/mp4');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ field: 'extension' }),
				])
			);
		});

		it('accepts case-insensitive extensions', () => {
			const file = createMockFile('video.MP4', 1024, 'video/mp4');
			const result = validateVideoFile(file);
			// Extension check uses toLowerCase
			expect(result.errors.find((e) => e.field === 'extension')).toBeUndefined();
		});
	});

	describe('file size validation', () => {
		it('rejects a file exceeding 100MB', () => {
			const file = createMockFile('huge.mp4', 101 * 1024 * 1024, 'video/mp4');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ field: 'size' }),
				])
			);
		});

		it('rejects an empty file', () => {
			const file = createMockFile('empty.mp4', 0, 'video/mp4');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						field: 'size',
						message: 'File is empty',
					}),
				])
			);
		});

		it('respects custom maxSize parameter', () => {
			const file = createMockFile('video.mp4', 30 * 1024 * 1024, 'video/mp4');
			const result = validateVideoFile(file, 20);
			expect(result.valid).toBe(false);
			const sizeError = result.errors.find((e) => e.field === 'size');
			expect(sizeError?.guidance).toContain('20MB');
		});

		it('includes file size in the error message', () => {
			const file = createMockFile('video.mp4', 150 * 1024 * 1024, 'video/mp4');
			const result = validateVideoFile(file);
			const sizeError = result.errors.find(
				(e) => e.field === 'size' && e.message !== 'File is empty'
			);
			expect(sizeError?.message).toContain('150.0MB');
		});
	});

	describe('multiple errors', () => {
		it('returns all errors for an invalid file', () => {
			const file = createMockFile('bad.txt', 200 * 1024 * 1024, 'text/plain');
			const result = validateVideoFile(file);
			expect(result.valid).toBe(false);
			// Should have type, extension, and size errors
			expect(result.errors.length).toBeGreaterThanOrEqual(3);
		});
	});
});

describe('formatFileSize', () => {
	it('formats bytes', () => {
		expect(formatFileSize(500)).toBe('500 B');
	});

	it('formats kilobytes', () => {
		expect(formatFileSize(1536)).toBe('1.5 KB');
	});

	it('formats megabytes', () => {
		expect(formatFileSize(52428800)).toBe('50.0 MB');
	});
});

describe('constants', () => {
	it('has correct allowed MIME types', () => {
		expect(ALLOWED_MIME_TYPES).toContain('video/mp4');
		expect(ALLOWED_MIME_TYPES).toContain('video/quicktime');
		expect(ALLOWED_MIME_TYPES).toContain('video/webm');
	});

	it('has correct allowed extensions', () => {
		expect(ALLOWED_EXTENSIONS).toContain('.mp4');
		expect(ALLOWED_EXTENSIONS).toContain('.mov');
		expect(ALLOWED_EXTENSIONS).toContain('.webm');
	});

	it('has 100MB max file size', () => {
		expect(MAX_FILE_SIZE_BYTES).toBe(100 * 1024 * 1024);
	});
});
