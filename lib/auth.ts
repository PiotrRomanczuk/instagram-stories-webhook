import { AuthOptions, Session, User, Account } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import * as jwt from "jsonwebtoken";

export const authOptions: AuthOptions = {
    providers: [
        // Primary Layer: Google Auth is now the ONLY login method
        GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID || "",
            clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
        }),
    ],
    adapter: SupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    }),
    callbacks: {
        async signIn({ user, account }: { user: User; account: Account | null }) {
            const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
            const allowedEmails = adminEmail.split(',').map(e => e.trim().toLowerCase());

            console.log('--- Auth Attempt ---');
            console.log(`📡 Provider: ${account?.provider}`);
            console.log(`📧 Attempting Email: ${user.email}`);

            const userEmail = user.email?.toLowerCase() || "";
            const isAllowed = allowedEmails.includes(userEmail);

            if (account?.provider === 'google') {
                if (isAllowed) {
                    console.log(`✅ GOOGLE ACCESS GRANTED: ${userEmail}`);
                    return true;
                } else {
                    console.log(`❌ GOOGLE ACCESS DENIED: ${userEmail} not in ${allowedEmails}`);
                    return false;
                }
            }

            // We no longer allow Facebook sign-ins for login
            if (account?.provider === 'facebook') {
                console.log(`❌ Facebook Login Blocked (Use Link Feature instead): ${userEmail}`);
                return false;
            }

            return isAllowed;
        },
        async jwt({ token, user }: { token: JWT; account: Account | null; user?: User }) {
            // Identity Layer: Initial sign-in
            if (user) {
                token.id = user.id;
                token.email = user.email;
                console.log(`👤 User Sign-in: ${user.email}`);
            }

            return token;
        },
        async session({ session, token }: { session: Session & { supabaseAccessToken?: string }; token: JWT }) {
            // 1. NextAuth Session Data
            if (session.user) {
                session.user.id = token.id as string;
            }

            // 2. Supabase RLS JWT (Used for frontend Supabase calls)
            const signingSecret = process.env.SUPABASE_JWT_SECRET;
            if (signingSecret) {
                const payload = {
                    aud: "authenticated",
                    exp: Math.floor(new Date(session.expires).getTime() / 1000),
                    sub: token.id,
                    email: session.user?.email,
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
    },
    // Debugging
    debug: process.env.NODE_ENV === 'development',
};
