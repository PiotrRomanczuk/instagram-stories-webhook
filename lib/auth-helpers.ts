import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { UserRole } from "./types";

/**
 * Get the current session on the server side
 */
export async function getSession() {
    return await getServerSession(authOptions);
}

/**
 * Check if the current user is an admin or developer
 */
export function isAdmin(session: { user?: { role?: UserRole } } | null): boolean {
    const role = session?.user?.role;
    return role === 'admin' || role === 'developer';
}

/**
 * Check if the current user is a developer
 */
export function isDeveloper(session: { user?: { role?: UserRole } } | null): boolean {
    return session?.user?.role === 'developer';
}

/**
 * Check if a user has a valid session
 */
export function isAuthenticated(session: { user?: { id?: string } } | null): boolean {
    return !!session?.user?.id;
}

/**
 * Require admin or developer role - throws if not authorized
 */
export function requireAdmin(session: { user?: { role?: UserRole } } | null): void {
    if (!isAdmin(session)) {
        throw new Error('Admin access required');
    }
}

/**
 * Require developer role - throws if not developer
 */
export function requireDeveloper(session: { user?: { role?: UserRole } } | null): void {
    if (!isDeveloper(session)) {
        throw new Error('Developer access required');
    }
}

/**
 * Require authentication - throws if not logged in
 */
export function requireAuth(session: { user?: { id?: string } } | null): void {
    if (!isAuthenticated(session)) {
        throw new Error('Authentication required');
    }
}

/**
 * Get user ID from session - throws if not authenticated
 */
export function getUserId(session: { user?: { id?: string } } | null): string {
    if (!session?.user?.id) {
        throw new Error('Authentication required');
    }
    return session.user.id;
}

/**
 * Get user email from session
 */
export function getUserEmail(session: { user?: { email?: string | null } } | null): string {
    return session?.user?.email || '';
}

/**
 * Get user role from session (defaults to 'user')
 */
export function getUserRole(session: { user?: { role?: UserRole } } | null): UserRole {
    return session?.user?.role || 'user';
}
