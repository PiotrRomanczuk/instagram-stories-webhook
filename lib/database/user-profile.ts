import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'db:user-profile';

export interface UserProfileRow {
    id: string;
    email: string | null;
    name: string | null;
    display_name: string | null;
    handle: string | null;
    contact_email: string | null;
    onboarded_at: string | null;
    guidelines_acknowledged_at: string | null;
}

export async function getUserProfileByEmail(
    email: string,
): Promise<UserProfileRow | null> {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, display_name, handle, contact_email, onboarded_at, guidelines_acknowledged_at')
        .eq('email', email.toLowerCase())
        .maybeSingle();

    if (error) {
        Logger.error(MODULE, `getUserProfileByEmail failed for ${email}`, error);
        return null;
    }
    return data as UserProfileRow | null;
}

export interface UpdateUserProfileInput {
    displayName: string;
    handle: string;
    contactEmail?: string;
}

export async function completeUserOnboarding(
    userId: string,
    input: UpdateUserProfileInput,
): Promise<UserProfileRow | null> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
        .from('users')
        .update({
            display_name: input.displayName,
            handle: input.handle,
            contact_email: input.contactEmail ?? null,
            onboarded_at: now,
            guidelines_acknowledged_at: now,
        })
        .eq('id', userId)
        .select('id, email, name, display_name, handle, contact_email, onboarded_at, guidelines_acknowledged_at')
        .single();

    if (error) {
        Logger.error(MODULE, `completeUserOnboarding failed for ${userId}`, error);
        return null;
    }
    return data as UserProfileRow;
}
