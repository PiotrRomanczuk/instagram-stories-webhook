import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTokens } from '@/lib/db';
import { saveLinkedFacebookAccount } from '@/lib/linked-accounts-db';

/**
 * MIGRATION TOOL: Associates the existing global token with a user.
 * Use this to migrate from the single-user global system to the multi-user account-linking system.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email') || process.env.ADMIN_EMAIL?.split(',')[0].trim();
        const secret = searchParams.get('secret');

        // Security check
        if (secret !== process.env.NEXTAUTH_SECRET) {
            return NextResponse.json({ error: 'Unauthorized. Please provide the NEXTAUTH_SECRET as "secret" parameter.' }, { status: 401 });
        }

        if (!email) {
            return NextResponse.json({ error: 'No target email provided or found in ADMIN_EMAIL.' }, { status: 400 });
        }

        console.log(`🚀 Starting migration for user: ${email}`);

        // 1. Get the current global token
        const globalToken = await getTokens();
        if (!globalToken || !globalToken.access_token) {
            return NextResponse.json({ error: 'No global token found in "tokens" table to migrate.' }, { status: 404 });
        }

        // 2. Find the user in the next_auth.users table
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email.toLowerCase())
            .single();

        if (userError || !user) {
            return NextResponse.json({
                error: `User with email "${email}" not found in database.`,
                details: userError?.message,
                tip: 'Ensure the user has signed in with Google at least once before running this migration.'
            }, { status: 404 });
        }

        // 3. Save as linked account for this user
        // We'll need a provider_account_id. Since we don't have it, we'll try to fetch it or use a placeholder
        let providerAccountId = globalToken.user_id || 'migrated_user';

        try {
            const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${globalToken.access_token}`);
            const meData = await meRes.json();
            if (meData.id) providerAccountId = meData.id;
        } catch (e) {
            console.warn('Could not fetch Facebook user ID during migration, using placeholder.');
        }

        await saveLinkedFacebookAccount({
            user_id: user.id,
            provider: 'facebook',
            provider_account_id: providerAccountId,
            access_token: globalToken.access_token,
            expires_at: globalToken.expires_at,
            ig_user_id: globalToken.user_id
        });

        console.log(`✅ Successfully migrated global token to user ${user.id} (${user.email})`);

        return NextResponse.json({
            success: true,
            message: `Migrated global token to user: ${user.email}`,
            user_id: user.id,
            facebook_id: providerAccountId
        });

    } catch (error: any) {
        console.error('Migration Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
