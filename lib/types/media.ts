export interface MediaDimensions {
    width: number;
    height: number;
}

export interface AspectRatioInfo {
    ratio: number;
    isIdeal: boolean;
    isAcceptable: boolean;
    needsProcessing: boolean;
    recommendation: 'perfect' | 'acceptable' | 'needs_padding' | 'needs_crop';
    message: string;
}

export interface ProcessingOptions {
    /** Background color for padding (hex or named color) */
    backgroundColor?: string;
    /** Whether to blur the background instead of solid color */
    blurBackground?: boolean;
    /** Quality for JPEG output (1-100) */
    quality?: number;
}

export interface ProcessingResult {
    buffer: Buffer;
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    wasProcessed: boolean;
    processingType: 'none' | 'resize' | 'pad' | 'pad_blur';
}

export interface VideoMetadata {
    width: number;
    height: number;
    duration: number;
    codec: string;
    frameRate: number;
    bitrate: number;
    hasAudio: boolean;
    audioCodec?: string;
    format: string;
    fileSize: number;
}

export interface VideoValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    metadata: VideoMetadata | null;
    needsProcessing: boolean;
    processingReasons: string[];
}

export interface VideoProcessingOptions {
    /** Max duration in seconds (default: 60) */
    maxDuration?: number;
    /** Video bitrate (default: '3500k') */
    videoBitrate?: string;
    /** Audio bitrate (default: '128k') */
    audioBitrate?: string;
    /** Target frame rate (default: 30) */
    frameRate?: number;
    /** Background color for padding (hex) */
    backgroundColor?: string;
    /** Whether to use blurred background for padding */
    blurBackground?: boolean;
    /** Quality preset: 'fast', 'medium', 'slow' (default: 'medium') */
    preset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
}

export interface VideoProcessingResult {
    buffer: Buffer;
    width: number;
    height: number;
    duration: number;
    originalMetadata: VideoMetadata;
    wasProcessed: boolean;
    processingApplied: string[];
}
