/**
 * Mock Instagram Graph API responses
 */

export const mockInstagramResponses = {
    createContainer: {
        id: 'container_12345',
    },

    containerStatus: {
        id: 'container_12345',
        status_code: 'FINISHED',
    },

    publishMedia: {
        id: 'ig_media_67890',
    },

    insights: {
        data: [
            {
                name: 'impressions',
                period: 'lifetime',
                values: [{ value: 1234 }],
            },
            {
                name: 'reach',
                period: 'lifetime',
                values: [{ value: 890 }],
            },
        ],
    },

    quota: {
        data: [
            {
                quota_usage: 45,
                config_id: 'quota_config_1',
            },
        ],
    },

    error: {
        error: {
            message: 'Invalid OAuth access token',
            type: 'OAuthException',
            code: 190,
        },
    },

    rateLimitError: {
        error: {
            message: 'Application request limit reached',
            type: 'OAuthException',
            code: 4,
        },
    },

    contentPolicyError: {
        error: {
            message: 'Action blocked by Instagram',
            type: 'IGApiException',
            code: 368,
        },
    },
};

export const mockFacebookPageResponse = {
    id: 'page_123',
    name: 'Test Page',
    instagram_business_account: {
        id: 'ig_account_456',
    },
};
