/**
 * Memes database layer
 * Re-exports all meme-related database operations
 */

// Re-export types for backward compatibility
export type {
	MemeStatus,
	UserRole,
	AllowedUser,
	MemeSubmission,
	CreateMemeInput,
} from '../types';

export { isEmailAllowed, getUserRole, getAllowedUserByEmail, getNextAuthUserIdByEmail, getAllowedUsers } from './allowed-users';
export { addAllowedUser, removeAllowedUser, updateUserRole } from './user-management';
export { createMemeSubmission, getMemeSubmissions, getMemeSubmission } from './submissions';
export { reviewMemeSubmission, scheduleMeme, markMemePublished, deleteMemeSubmission } from './review';
export { getMemeStats, getUserStatsByEmail, getPostStatsByEmail, countRecentSubmissions } from './stats';
