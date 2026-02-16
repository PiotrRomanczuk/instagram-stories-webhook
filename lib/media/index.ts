// Image Processing Exports
export { analyzeAspectRatio, validateForStories, getImageDimensionsFromUrl, getImageDimensionsFromFile, STORY_IDEAL_WIDTH, STORY_IDEAL_HEIGHT, STORY_IDEAL_RATIO } from './validator';
export { processImageForStory, needsProcessing } from './processor';

// Video Processing Exports
export {
    processVideoForStory,
    validateVideoForStories,
    getVideoMetadata,
    videoNeedsProcessing,
    checkFfmpegAvailable,
    getVideoProcessingBackend,
    processAndUploadStoryVideo,
    extractVideoThumbnail,
    THUMBNAIL_OFFSET_SEC,
    VIDEO_STORY_WIDTH,
    VIDEO_STORY_HEIGHT,
    VIDEO_STORY_RATIO,
    VIDEO_MAX_DURATION_SEC,
    VIDEO_RECOMMENDED_DURATION_SEC,
    VIDEO_FRAME_RATE,
    VIDEO_BITRATE,
    AUDIO_BITRATE,
    MAX_FILE_SIZE_MB
} from './video-processor';

// Cloudinary Video Processing Exports
export {
    isCloudinaryConfigured,
    processVideoUrlWithCloudinary,
    getCloudinaryVideoThumbnail,
    extractThumbnailWithCloudinary,
    deleteCloudinaryVideo,
} from './cloudinary-video-processor';

export type {
    CloudinaryProcessingResult,
    CloudinaryThumbnailResult,
} from './cloudinary-video-processor';

export type {
    MediaDimensions,
    AspectRatioInfo,
    ProcessingOptions,
    ProcessingResult,
    VideoMetadata,
    VideoValidationResult,
    VideoProcessingOptions,
    VideoProcessingResult
} from '../types';
