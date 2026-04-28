// ============== TIKTOK API TYPES ==============

export interface TikTokTokenResponse {
    access_token: string;
    expires_in: number;
    open_id: string;
    refresh_token: string;
    refresh_expires_in: number;
    scope: string;
    token_type: string;
}

export interface TikTokTokenRefreshResponse {
    access_token: string;
    expires_in: number;
    open_id: string;
    refresh_token: string;
    refresh_expires_in: number;
    scope: string;
    token_type: string;
}

export interface TikTokUserInfo {
    open_id: string;
    union_id?: string;
    avatar_url?: string;
    display_name?: string;
}

// ============== TIKTOK CONTENT POSTING ==============

export interface TikTokVideoInitRequest {
    post_info: {
        title?: string;
        privacy_level: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
        disable_comment?: boolean;
        disable_duet?: boolean;
        disable_stitch?: boolean;
    };
    source_info: {
        source: 'FILE_UPLOAD';
        video_size: number;
        chunk_size: number;
        total_chunk_count: number;
    };
}

export interface TikTokVideoInitResponse {
    data: {
        publish_id: string;
        upload_url: string;
    };
    error: {
        code: string;
        message: string;
        log_id: string;
    };
}

export interface TikTokPublishStatusResponse {
    data: {
        status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'SEND_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED';
        fail_reason?: string;
        publicaly_available_post_id?: string[];
    };
    error: {
        code: string;
        message: string;
        log_id: string;
    };
}

export interface TikTokPublishResult {
    publishId: string;
    status: 'published' | 'failed';
    postId?: string;
    error?: string;
}

export interface TikTokPublishOptions {
    title?: string;
    privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
    disableComment?: boolean;
}
