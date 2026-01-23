import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'identity-audit';

/**
 * Checks for linked account identity mismatches or issues
 */
export async function runIdentityAudit() {
    Logger.info(MODULE, '🔍 Running identity check...');
    try {
        const { data: links, error: linkError } = await supabaseAdmin
            .from('linked_accounts')
            .select('*');

        if (linkError) {
            Logger.error(MODULE, '❌ Failed to fetch links', linkError);
            return { error: linkError };
        }

        if (!links || links.length === 0) {
            Logger.info(MODULE, 'ℹ️ No linked accounts found active.');
            return { message: 'No linked accounts' };
        }

        const results = [];

        for (const link of links) {
            // Fetch User Email
            const { data: userData } = await supabaseAdmin
                .schema('next_auth')
                .from('users')
                .select('email')
                .eq('id', link.user_id)
                .single();

            // Fetch Google Account ID
            const { data: googleData } = await supabaseAdmin
                .schema('next_auth')
                .from('accounts')
                .select('providerAccountId')
                .eq('userId', link.user_id)
                .eq('provider', 'google')
                .single();

            const email = userData?.email || 'Unknown';
            const googleId = googleData?.providerAccountId || 'Not Connected';

            const logMsg = `👤 Identity Audit | User: ${email} | Google ID: ${googleId} | FB ID: ${link.provider_account_id} | IG ID: ${link.ig_user_id || 'N/A'}`;
            Logger.info(MODULE, logMsg);
            results.push(logMsg);
        }

        return { success: true, results };
    } catch (err) {
        Logger.error(MODULE, '❌ Identity check failed', err);
        throw err;
    }
}
