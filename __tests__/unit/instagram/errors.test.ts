import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
    classifyInstagramError,
    classifyInstagramMessageError,
    isRetryableInstagramError,
} from '@/lib/instagram/errors';

function fbError(opts: {
    status?: number;
    code?: number;
    subcode?: number;
    type?: string;
    message?: string;
}): AxiosError {
    const err = new AxiosError(
        opts.message ?? 'Instagram API error',
        'ERR_BAD_REQUEST',
        { headers: new AxiosHeaders() },
    );
    err.response = {
        status: opts.status ?? 400,
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {
            error: {
                message: opts.message ?? 'Instagram API error',
                type: opts.type,
                code: opts.code,
                error_subcode: opts.subcode,
            },
        },
    };
    return err;
}

describe('classifyInstagramError', () => {
    describe('retryable', () => {
        it.each([1, 2, 17, 32, 613])('returns retryable for FB code %i', (code) => {
            const result = classifyInstagramError(fbError({ code }));
            expect(result.kind).toBe('retryable');
            expect(result.code).toBe(code);
        });

        it.each([500, 502, 503, 504])('returns retryable for HTTP %i', (status) => {
            const result = classifyInstagramError(fbError({ status, code: 99 }));
            expect(result.kind).toBe('retryable');
        });

        it('returns retryable for 429 even when type is OAuthException', () => {
            const result = classifyInstagramError(
                fbError({ status: 429, type: 'OAuthException', code: 4 }),
            );
            expect(result.kind).toBe('retryable');
        });
    });

    describe('auth-fatal', () => {
        it.each([460, 461, 463])(
            'returns auth-fatal for code 190 with subcode %i',
            (subcode) => {
                const result = classifyInstagramError(
                    fbError({
                        status: 400,
                        code: 190,
                        subcode,
                        type: 'OAuthException',
                        message: 'Invalid OAuth access token',
                    }),
                );
                expect(result.kind).toBe('auth-fatal');
                expect(result.code).toBe(190);
                expect(result.subcode).toBe(subcode);
            },
        );
    });

    describe('fatal', () => {
        it('rewrites code 368 message and marks fatal', () => {
            const result = classifyInstagramError(
                fbError({ status: 400, code: 368, message: 'Temporary block' }),
            );
            expect(result.kind).toBe('fatal');
            expect(result.message).toBe(
                'Action blocked by Instagram (Rate Limit/Content Policy)',
            );
        });

        it('returns fatal for code 100 (invalid parameter)', () => {
            const result = classifyInstagramError(
                fbError({ status: 400, code: 100, type: 'OAuthException' }),
            );
            expect(result.kind).toBe('fatal');
        });

        it('returns fatal for unknown FB error codes', () => {
            const result = classifyInstagramError(
                fbError({ status: 400, code: 9999, message: 'Unknown' }),
            );
            expect(result.kind).toBe('fatal');
            expect(result.code).toBe(9999);
        });

        it('returns fatal for non-axios Error instances', () => {
            const result = classifyInstagramError(new Error('boom'));
            expect(result.kind).toBe('fatal');
            expect(result.message).toBe('boom');
        });

        it('returns fatal for non-error values', () => {
            const result = classifyInstagramError('string thrown');
            expect(result.kind).toBe('fatal');
            expect(result.message).toBe('Unknown error');
        });

        it('preserves the raw API message when no rewrite applies', () => {
            const result = classifyInstagramError(
                fbError({ status: 400, code: 100, message: 'Missing required parameter' }),
            );
            expect(result.message).toBe('Missing required parameter');
        });
    });
});

describe('classifyInstagramMessageError', () => {
    it('rewrites code 10 as permission-denied (fatal)', () => {
        const result = classifyInstagramMessageError(fbError({ code: 10 }));
        expect(result.kind).toBe('fatal');
        expect(result.message).toMatch(/Permission denied/);
        expect(result.message).toMatch(/instagram_manage_messages/);
    });

    it('rewrites code 100 as invalid-recipient (fatal)', () => {
        const result = classifyInstagramMessageError(fbError({ code: 100 }));
        expect(result.kind).toBe('fatal');
        expect(result.message).toMatch(/Invalid recipient/);
    });

    it('rewrites code 368 with messaging-specific text (overrides base 368 rewrite)', () => {
        const result = classifyInstagramMessageError(fbError({ code: 368 }));
        expect(result.kind).toBe('fatal');
        expect(result.message).toMatch(/Messaging rate limit exceeded/);
        expect(result.message).not.toMatch(/Action blocked/);
    });

    it('rewrites code 551 as not-eligible (fatal)', () => {
        const result = classifyInstagramMessageError(fbError({ code: 551 }));
        expect(result.kind).toBe('fatal');
        expect(result.message).toMatch(/not eligible/);
    });

    it('preserves base classification for codes without messaging rewrites', () => {
        const result = classifyInstagramMessageError(fbError({ status: 500, code: 9999 }));
        expect(result.kind).toBe('retryable');
    });
});

describe('isRetryableInstagramError', () => {
    it('returns true only for retryable kind', () => {
        expect(isRetryableInstagramError(fbError({ status: 500 }))).toBe(true);
        expect(isRetryableInstagramError(fbError({ status: 429 }))).toBe(true);
        expect(isRetryableInstagramError(fbError({ code: 2 }))).toBe(true);
    });

    it('returns false for fatal and auth-fatal kinds', () => {
        expect(isRetryableInstagramError(fbError({ code: 368 }))).toBe(false);
        expect(isRetryableInstagramError(fbError({ code: 190 }))).toBe(false);
        expect(isRetryableInstagramError(fbError({ code: 100 }))).toBe(false);
        expect(isRetryableInstagramError(new Error('x'))).toBe(false);
    });
});
