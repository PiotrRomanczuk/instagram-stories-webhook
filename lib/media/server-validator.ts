import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import axios from 'axios';
import { Logger } from '../utils/logger';

const MODULE = 'media:validator';

export interface MediaValidationResult {
	valid: boolean;
	mimeType?: string;
	size?: number;
	width?: number;
	height?: number;
	error?: string;
}

const ALLOWED_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'video/mp4',
	'video/quicktime',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_DIMENSION = 4096;

/**
 * Validates a media file from a URL
 * - Checks content type (HEAD request)
 * - Checks size (HEAD request)
 * - Verifies file type (partial download + magic bytes)
 * - Checks image dimensions (for images)
 */
export async function validateMediaUrl(
	url: string,
): Promise<MediaValidationResult> {
	try {
		// 1. Initial HEAD request to check content type and size
		const headResponse = await axios.head(url);
		const contentType = headResponse.headers['content-type'] || '';
		const contentLength = parseInt(
			headResponse.headers['content-length'] || '0',
			10,
		);

		if (contentLength > MAX_FILE_SIZE) {
			return {
				valid: false,
				error: `File too large (${(contentLength / 1024 / 1024).toFixed(1)}MB). Max 50MB.`,
			};
		}

		// 2. Download first 4KB to verify magic bytes
		const partialResponse = await axios.get(url, {
			responseType: 'arraybuffer',
			headers: { Range: 'bytes=0-4095' },
		});
		const buffer = Buffer.from(partialResponse.data);
		const typeInfo = await fileTypeFromBuffer(buffer);

		if (!typeInfo || !ALLOWED_MIME_TYPES.includes(typeInfo.mime)) {
			return {
				valid: false,
				error: `Unsupported file type: ${typeInfo?.mime || 'unknown'}`,
			};
		}

		const result: MediaValidationResult = {
			valid: true,
			mimeType: typeInfo.mime,
			size: contentLength,
		};

		// 3. For images, check dimensions
		if (typeInfo.mime.startsWith('image/')) {
			try {
				// Download full image if dimensions needed (sharp needs full buffer usually)
				// However, STORY optimization usually happens before this or we trust metadata
				// For now, let's at least verify it's a valid image by loading it into sharp
				const fullResponse = await axios.get(url, {
					responseType: 'arraybuffer',
				});
				const fullBuffer = Buffer.from(fullResponse.data);
				const metadata = await sharp(fullBuffer).metadata();

				if (metadata.width && metadata.height) {
					result.width = metadata.width;
					result.height = metadata.height;

					if (
						metadata.width > MAX_IMAGE_DIMENSION ||
						metadata.height > MAX_IMAGE_DIMENSION
					) {
						return {
							valid: false,
							error: `Image dimensions too large (${metadata.width}x${metadata.height}). Max ${MAX_IMAGE_DIMENSION}px.`,
						};
					}
				}
			} catch (err) {
				Logger.warn(MODULE, `Failed to get image metadata for ${url}`, err);
				// We'll still allow it if magic bytes were okay, but maybe it's corrupted
			}
		}

		return result;
	} catch (error) {
		Logger.error(MODULE, `Validation error for ${url}`, error);
		return { valid: false, error: 'Failed to validate media file' };
	}
}

/**
 * Validates a media buffer directly
 */
export async function validateMediaBuffer(
	buffer: Buffer,
): Promise<MediaValidationResult> {
	try {
		if (buffer.length > MAX_FILE_SIZE) {
			return { valid: false, error: 'File too large' };
		}

		const typeInfo = await fileTypeFromBuffer(buffer);
		if (!typeInfo || !ALLOWED_MIME_TYPES.includes(typeInfo.mime)) {
			return {
				valid: false,
				error: `Unsupported file type: ${typeInfo?.mime || 'unknown'}`,
			};
		}

		const result: MediaValidationResult = {
			valid: true,
			mimeType: typeInfo.mime,
			size: buffer.length,
		};

		if (typeInfo.mime.startsWith('image/')) {
			const metadata = await sharp(buffer).metadata();
			result.width = metadata.width;
			result.height = metadata.height;
		}

		return result;
	} catch (error) {
		return { valid: false, error: 'Failed to validate media buffer' };
	}
}
