/**
 * Client-side video validation utilities.
 * Runs in the browser before upload to give instant feedback.
 */

/** Allowed MIME types for video uploads */
const ALLOWED_MIME_TYPES = [
	'video/mp4',
	'video/quicktime', // .mov
	'video/webm',
] as const;

/** Allowed file extensions */
const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.webm'] as const;

/** Maximum file size in bytes (100MB) */
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export interface ClientValidationError {
	field: 'type' | 'size' | 'extension';
	message: string;
	guidance: string;
}

export interface ClientValidationResult {
	valid: boolean;
	errors: ClientValidationError[];
}

/**
 * Validates a file on the client before upload.
 * Checks MIME type, extension, and file size.
 */
export function validateVideoFile(
	file: File,
	maxSizeMB: number = 100
): ClientValidationResult {
	const errors: ClientValidationError[] = [];
	const maxBytes = maxSizeMB * 1024 * 1024;

	// Check MIME type
	const isAllowedType = ALLOWED_MIME_TYPES.some(
		(type) => file.type === type
	);
	if (!isAllowedType && file.type !== '') {
		errors.push({
			field: 'type',
			message: `Unsupported format: ${file.type}`,
			guidance:
				'Please upload an MP4, MOV, or WebM video file.',
		});
	}

	// Check file extension
	const fileName = file.name.toLowerCase();
	const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
		fileName.endsWith(ext)
	);
	if (!hasAllowedExtension) {
		const ext = fileName.includes('.')
			? '.' + fileName.split('.').pop()
			: 'unknown';
		errors.push({
			field: 'extension',
			message: `Unsupported file extension: ${ext}`,
			guidance: `Accepted extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
		});
	}

	// Check file size
	if (file.size > maxBytes) {
		const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
		errors.push({
			field: 'size',
			message: `File is too large (${fileSizeMB}MB)`,
			guidance: `Maximum file size is ${maxSizeMB}MB. Try compressing your video or reducing its resolution.`,
		});
	}

	// Check for empty files
	if (file.size === 0) {
		errors.push({
			field: 'size',
			message: 'File is empty',
			guidance: 'The selected file contains no data. Please choose a different file.',
		});
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES };
