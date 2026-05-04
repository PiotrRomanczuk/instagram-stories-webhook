import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'publishing-toggle';

/**
 * Reads the global publishing toggle from system_settings.
 *
 * The toggle is an explicit kill switch: only `value === 'true'` enables
 * publishing. Any other value (or a Supabase failure) returns false, which
 * matches the prior inline behaviour (`setting?.value !== 'true'` paused).
 */
export async function isPublishingEnabled(): Promise<boolean> {
    try {
        const { data: setting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'publishing_enabled')
            .single();

        return setting?.value === 'true';
    } catch (error) {
        await Logger.warn(MODULE, 'Failed to read publishing_enabled toggle, defaulting to paused', error);
        return false;
    }
}
