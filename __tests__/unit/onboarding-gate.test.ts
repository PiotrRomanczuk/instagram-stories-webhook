import { describe, it, expect } from 'vitest';
import { shouldRedirectToWelcome } from '@/lib/onboarding-gate';

describe('shouldRedirectToWelcome', () => {
    it('redirects creators with no onboarded_at', () => {
        expect(
            shouldRedirectToWelcome({
                pathname: '/',
                role: 'user',
                onboardedAt: null,
            }),
        ).toBe(true);
    });

    it('does not redirect when already on /welcome', () => {
        expect(
            shouldRedirectToWelcome({
                pathname: '/welcome',
                role: 'user',
                onboardedAt: null,
            }),
        ).toBe(false);
    });

    it('does not redirect once onboarded_at is set', () => {
        expect(
            shouldRedirectToWelcome({
                pathname: '/submit',
                role: 'user',
                onboardedAt: Date.now(),
            }),
        ).toBe(false);
    });

    it('does not redirect admins', () => {
        expect(
            shouldRedirectToWelcome({
                pathname: '/',
                role: 'admin',
                onboardedAt: null,
            }),
        ).toBe(false);
    });

    it('does not redirect developers', () => {
        expect(
            shouldRedirectToWelcome({
                pathname: '/',
                role: 'developer',
                onboardedAt: null,
            }),
        ).toBe(false);
    });

    it('does not redirect demo users', () => {
        expect(
            shouldRedirectToWelcome({
                pathname: '/',
                role: 'demo',
                onboardedAt: null,
            }),
        ).toBe(false);
    });

    it('does not redirect when role is undefined', () => {
        expect(
            shouldRedirectToWelcome({
                pathname: '/',
                role: undefined,
                onboardedAt: null,
            }),
        ).toBe(false);
    });
});
