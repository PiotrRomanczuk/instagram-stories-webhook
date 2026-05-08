import 'server-only';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized so env vars loaded after this module evaluates (e.g.
// scripts that call dotenv.config() at runtime) still apply on first use.
let _supabaseAdmin: SupabaseClient | null = null;

function getOrCreateClient(): SupabaseClient {
	if (_supabaseAdmin) return _supabaseAdmin;

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
	const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

	if (!supabaseUrl || !supabaseServiceRoleKey) {
		console.warn('⚠️ Missing Supabase URLs or Service Role Key. Admin operations may fail.');
	}

	_supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
	return _supabaseAdmin;
}

// this client has full admin access - bypasses RLS
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
	get(_target, prop) {
		return Reflect.get(getOrCreateClient(), prop);
	},
});
