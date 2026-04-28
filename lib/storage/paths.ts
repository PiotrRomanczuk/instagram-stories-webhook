/**
 * Google Drive folder name constants.
 * All paths are relative to GOOGLE_DRIVE_ROOT_FOLDER_ID.
 *
 * Layout:
 *   <root>/
 *     uploads/      — raw incoming media from users
 *     stories/      — downloaded Instagram story frames (14-day retention)
 *     composed/     — FFmpeg-composed MP4s (14-day retention)
 *     horoscopes/   — AI-generated horoscope images/videos (14-day retention)
 *     audio/        — cached royalty-free audio tracks
 *     thumbnails/   — cover thumbnails for composed videos
 *     temp/         — temporary work files (cleaned after each job)
 */
export const DRIVE_FOLDERS = {
    UPLOADS: 'uploads',
    STORIES: 'stories',
    COMPOSED: 'composed',
    HOROSCOPES: 'horoscopes',
    AUDIO: 'audio',
    THUMBNAILS: 'thumbnails',
    TEMP: 'temp',
} as const;

export type DriveFolderName = (typeof DRIVE_FOLDERS)[keyof typeof DRIVE_FOLDERS];

/** Folders subject to 14-day automatic retention cleanup. */
export const RETENTION_FOLDERS: DriveFolderName[] = [
    DRIVE_FOLDERS.STORIES,
    DRIVE_FOLDERS.COMPOSED,
    DRIVE_FOLDERS.HOROSCOPES,
];

export const RETENTION_DAYS = 14;
