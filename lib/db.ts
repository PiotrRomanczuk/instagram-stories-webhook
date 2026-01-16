import { supabase } from './supabase';
import { TokenData } from './types';

// For the migration, we'll use a fixed ID to ensure we only ever have one active token record
// mimicking the original single-file behavior.
const TOKEN_RECORD_ID = '00000000-0000-0000-0000-000000000001';

export async function getTokens(): Promise<TokenData | null> {
    try {
        const { data, error } = await supabase
            .from('tokens')
            .select('*')
            .eq('id', TOKEN_RECORD_ID)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            console.error('Supabase getTokens Error:', error);
            return null;
        }

        return {
            access_token: data.access_token,
            user_id: data.user_id,
            expires_at: data.expires_at ? Number(data.expires_at) : undefined
        };
    } catch (error) {
        console.error('getTokens exception:', error);
        return null;
    }
}

export async function saveTokens(tokens: TokenData): Promise<void> {
    try {
        const { error } = await supabase
            .from('tokens')
            .upsert({
                id: TOKEN_RECORD_ID,
                access_token: tokens.access_token,
                user_id: tokens.user_id,
                expires_at: tokens.expires_at,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Supabase saveTokens Error:', error);
            throw error;
        }
    } catch (error) {
        console.error('saveTokens exception:', error);
        throw error;
    }
}
