import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('⚠️ Missing Supabase URLs or Service Role Key. Admin operations may fail.');
}

// Lazy-initialized to avoid crashing at module evaluation when env vars are missing
let _supabaseAdmin: SupabaseClient | null = null;

// this client has full admin access - bypasses RLS
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        if (!_supabaseAdmin) {
            _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
        }
        return Reflect.get(_supabaseAdmin, prop);
    }
});
