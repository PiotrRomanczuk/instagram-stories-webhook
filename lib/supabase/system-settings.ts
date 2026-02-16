import { supabaseAdmin } from '@/lib/config/supabase-admin';

/**
 * Read a system setting by key.
 * Returns the string value, or the provided default if not found.
 */
export async function getSystemSetting(
	key: string,
	defaultValue: string = ''
): Promise<string> {
	const { data, error } = await supabaseAdmin
		.from('system_settings')
		.select('value')
		.eq('key', key)
		.single();

	if (error || !data) {
		return defaultValue;
	}

	return data.value;
}

/**
 * Read a boolean system setting.
 * Returns true if the stored value is 'true', false otherwise.
 */
export async function getBooleanSetting(
	key: string,
	defaultValue: boolean = false
): Promise<boolean> {
	const value = await getSystemSetting(key, String(defaultValue));
	return value === 'true';
}

/**
 * Update a system setting by key.
 * Creates the row if it does not exist (upsert).
 */
export async function setSystemSetting(
	key: string,
	value: string,
	updatedBy: string = 'system'
): Promise<void> {
	const { error } = await supabaseAdmin
		.from('system_settings')
		.upsert(
			{
				key,
				value,
				updated_at: new Date().toISOString(),
				updated_by: updatedBy,
			},
			{ onConflict: 'key' }
		);

	if (error) {
		throw new Error(`Failed to update setting "${key}": ${error.message}`);
	}
}

// Well-known setting keys
export const SETTING_KEYS = {
	PUBLISHING_ENABLED: 'publishing_enabled',
	AUTO_PROCESS_VIDEOS: 'auto_process_videos',
} as const;
