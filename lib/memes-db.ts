/**
 * Memes database layer
 *
 * This file re-exports from focused sub-modules for backward compatibility.
 * New code should import directly from 'lib/memes-db/allowed-users', 'lib/memes-db/submissions', etc.
 */

// Re-export types for backward compatibility
export type {
	MemeStatus,
	UserRole,
	AllowedUser,
	MemeSubmission,
	CreateMemeInput,
} from './types';

export { isEmailAllowed, getUserRole, getAllowedUserByEmail, getNextAuthUserIdByEmail, getAllowedUsers } from './memes-db/allowed-users';
export { addAllowedUser, removeAllowedUser, updateUserRole } from './memes-db/user-management';
export { createMemeSubmission, getMemeSubmissions, getMemeSubmission } from './memes-db/submissions';
export { reviewMemeSubmission, scheduleMeme, markMemePublished, deleteMemeSubmission } from './memes-db/review';
export { getMemeStats, getUserStatsByEmail, getPostStatsByEmail, countRecentSubmissions } from './memes-db/stats';
