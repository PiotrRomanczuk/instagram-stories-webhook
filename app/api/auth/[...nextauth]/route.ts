import NextAuth, { Session, User, Account, Profile } from "next-auth";
import { JWT } from "next-auth/jwt";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import * as jwt from "jsonwebtoken";
import { getInstagramBusinessAccountId } from "@/lib/instagram/account";
import { saveTokens } from "@/lib/db";

const handler = NextAuth({
    providers: [
        // Primary Layer: Google Auth
        GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID || "",
            clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
        }),
        // Secondary Layer: Facebook/Instagram Integration
        FacebookProvider({
            clientId: process.env.AUTH_FACEBOOK_ID || process.env.NEXT_PUBLIC_FB_APP_ID || "",
            clientSecret: process.env.AUTH_FACEBOOK_SECRET || process.env.FB_APP_SECRET || "",
            authorization: {
                params: {
                    scope: [
                        "instagram_basic",
                        "instagram_content_publish",
                        "pages_read_engagement",
                        "pages_show_list",
                        "public_profile",
                        "email"
                    ].join(","),
                },
            },
        }),
    ],
    adapter: SupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    }),
    callbacks: {
        async signIn({ user, account }: { user: User; account: Account | null; email?: { verificationRequest?: boolean } }) {
            const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";

            console.log('--- Auth Attempt ---');
            console.log(`📡 Provider: ${account?.provider}`);
            console.log(`📧 Attempting Email: ${user.email}`);

            if (account?.provider === 'google') {
                console.log('🛡️  Google Auth Flow Detected');
            }

            const isAllowed = user.email === adminEmail;

            if (isAllowed) {
                console.log(`✅ ACCESS GRANTED: ${user.email} matches Admin Whitelist.`);
            } else {
                console.log(`❌ ACCESS DENIED: ${user.email} is NOT in the Admin Whitelist.`);
                console.log(`   (Admin Email is set to: ${adminEmail})`);
            }

            console.log('--------------------');
            return isAllowed;
        },
        async jwt({ token, account, user, profile }: { token: JWT; account: Account | null; user?: User; profile?: Profile }) {
            // Identity Layer: Initial sign-in
            if (user) {
                token.id = user.id;
                console.log(`👤 User Sign-in: ${user.email} (Provider: ${account?.provider})`);
            }

            // Integration Layer: Capture Facebook tokens
            if (account && account.provider === "facebook") {
                console.log('🔗 Facebook Integration Triggered');
                console.log(`   Faceboook Name: ${profile?.name}`);
                console.log(`   Facebook User ID: ${account.providerAccountId}`);

                token.accessToken = account.access_token;
                token.expiresAt = account.expires_at;

                // Sync Instagram ID & Persistence
                if (account.access_token) {
                    const igUserId = await getInstagramBusinessAccountId(account.access_token);
                    if (igUserId) {
                        token.igUserId = igUserId;
                    }

                    await saveTokens({
                        access_token: account.access_token,
                        user_id: (token.igUserId as string) || "",
                        expires_at: account.expires_at ? Date.now() + (account.expires_at * 1000) : undefined
                    });
                }
            }
            return token;
        },
        async session({ session, token }: { session: Session & { accessToken?: string | null; igUserId?: string; supabaseAccessToken?: string }; token: JWT }) {
            // 1. NextAuth Session Data
            const accessToken = token.accessToken;
            session.accessToken = typeof accessToken === 'string' ? `${accessToken.substring(0, 10)}...` : undefined;
            session.igUserId = token.igUserId as string | undefined;
            session.user.id = token.id as string;

            // 2. Supabase RLS JWT (Official Documentation Implementation)
            const signingSecret = process.env.SUPABASE_JWT_SECRET;
            if (signingSecret) {
                const payload = {
                    aud: "authenticated",
                    exp: Math.floor(new Date(session.expires).getTime() / 1000),
                    sub: token.id,
                    email: session.user.email,
                    role: "authenticated",
                };
                session.supabaseAccessToken = jwt.sign(payload, signingSecret);
            }

            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: '/auth/signin',
        verifyRequest: '/auth/verify-request',
    }
});

export { handler as GET, handler as POST };
