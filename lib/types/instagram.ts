export interface ContentPublishingLimit {
    config?: {
        quota_duration: number;
        quota_total: number;
    };
    quota_usage: number;
}

export interface MediaInsight {
    name: string;
    period: string;
    values: Array<{ value: number }>;
    title: string;
    description: string;
    id: string;
}

export interface GranularScope {
    scope?: string;
    target_ids?: string[];
}

export interface FacebookPage {
    id: string;
    name: string;
    instagram_business_account?: {
        id: string;
        username: string;
    };
}

export interface ContainerData {
    access_token: string;
    media_type?: 'IMAGE' | 'VIDEO' | 'STORIES' | 'REELS';
    image_url?: string;
    video_url?: string;
    caption?: string;
    is_carousel_item?: boolean;
    user_tags?: { username: string; x: number; y: number; }[];
}
