import axios from 'axios';

export type InstagramErrorKind = 'retryable' | 'fatal' | 'auth-fatal';

export interface ClassifiedInstagramError {
    kind: InstagramErrorKind;
    code?: number;
    subcode?: number;
    status?: number;
    message: string;
}

const RETRYABLE_FB_CODES = new Set([1, 2, 17, 32, 613]);
const AUTH_FATAL_FB_CODES = new Set([190]);

export function classifyInstagramError(error: unknown): ClassifiedInstagramError {
    if (!axios.isAxiosError(error)) {
        return {
            kind: 'fatal',
            message: error instanceof Error ? error.message : 'Unknown error',
        };
    }

    const status = error.response?.status;
    const errorData = error.response?.data?.error;
    const code: number | undefined = errorData?.code;
    const subcode: number | undefined = errorData?.error_subcode;
    const rawMessage: string = errorData?.message || error.message || 'Instagram API error';

    if (status === 429) {
        return { kind: 'retryable', code, subcode, status, message: rawMessage };
    }
    if (status && status >= 500) {
        return { kind: 'retryable', code, subcode, status, message: rawMessage };
    }
    if (code !== undefined && RETRYABLE_FB_CODES.has(code)) {
        return { kind: 'retryable', code, subcode, status, message: rawMessage };
    }

    if (code !== undefined && AUTH_FATAL_FB_CODES.has(code)) {
        return { kind: 'auth-fatal', code, subcode, status, message: rawMessage };
    }

    if (code === 368) {
        return {
            kind: 'fatal',
            code,
            subcode,
            status,
            message: 'Action blocked by Instagram (Rate Limit/Content Policy)',
        };
    }

    return { kind: 'fatal', code, subcode, status, message: rawMessage };
}

export function isRetryableInstagramError(error: unknown): boolean {
    return classifyInstagramError(error).kind === 'retryable';
}

const MESSAGING_REWRITES: Record<number, string> = {
    10: 'Permission denied. Ensure instagram_manage_messages permission is granted.',
    100: 'Invalid recipient or message format.',
    368: 'Messaging rate limit exceeded (200 messages/hour). Please try again later.',
    551: 'User is not eligible to receive messages. They may need to initiate the conversation first.',
};

/**
 * Classifies an error from the Instagram messaging API. Layers messaging-specific
 * message rewrites (codes 10, 100, 368, 551) on top of the base classifier.
 */
export function classifyInstagramMessageError(error: unknown): ClassifiedInstagramError {
    const base = classifyInstagramError(error);
    if (base.code !== undefined && MESSAGING_REWRITES[base.code]) {
        return { ...base, kind: 'fatal', message: MESSAGING_REWRITES[base.code] };
    }
    return base;
}
