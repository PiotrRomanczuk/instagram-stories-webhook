import type { UserRole } from '@/lib/types';

export interface OnboardingGateInput {
    pathname: string;
    role: UserRole | undefined;
    onboardedAt: number | null | undefined;
}

/**
 * Decide whether a request should be redirected to /welcome.
 * Pure function so it can be unit-tested without spinning up Next.js.
 */
export function shouldRedirectToWelcome({
    pathname,
    role,
    onboardedAt,
}: OnboardingGateInput): boolean {
    if (pathname === '/welcome') return false;
    if (role !== 'user') return false;
    return !onboardedAt;
}
