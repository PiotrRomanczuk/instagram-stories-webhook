import type { UserRole } from '@/lib/types/common';

export type AudienceType = 'all' | 'admin' | 'developer';

export interface WhatsNewConfig {
	audienceType: AudienceType;
	targetEmails: string[];
}

export const DEFAULT_CONFIG: WhatsNewConfig = {
	audienceType: 'all',
	targetEmails: [],
};

const VALID_AUDIENCE_TYPES: AudienceType[] = ['all', 'admin', 'developer'];

export function parseWhatsNewConfig(json: string): WhatsNewConfig {
	try {
		const parsed = JSON.parse(json);
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			VALID_AUDIENCE_TYPES.includes(parsed.audienceType) &&
			Array.isArray(parsed.targetEmails)
		) {
			return {
				audienceType: parsed.audienceType,
				targetEmails: parsed.targetEmails.filter(
					(e: unknown) => typeof e === 'string'
				),
			};
		}
	} catch {
		// fall through to default
	}
	return DEFAULT_CONFIG;
}

export function shouldShowToUser(
	config: WhatsNewConfig,
	email: string,
	role: UserRole
): boolean {
	if (config.targetEmails.includes(email)) return true;
	if (config.audienceType === 'all') return true;
	if (config.audienceType === 'admin') return role === 'admin' || role === 'developer';
	if (config.audienceType === 'developer') return role === 'developer';
	return false;
}
