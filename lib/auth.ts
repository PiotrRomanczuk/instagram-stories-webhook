import { AuthOptions, Session, User, Account } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import * as jwt from 'jsonwebtoken';
import { Logger } from './utils/logger';
import { isEmailAllowed, getUserRole } from './memes-db';
import { UserRole } from '@/lib/types';

const MODULE = 'auth:next-auth';

// Extend the session type to include our custom fields
declare module 'next-auth' {
	interface Session {
		user: User & {
			id: string;
			role: UserRole;
			instagramAccount?: {
				id: string;
				username?: string;
			};
		};
		supabaseAccessToken?: string;
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		id: string;
		role: UserRole;
		instagramAccount?: {
			id: string;
			username?: string;
		};
	}
}

export const authOptions: AuthOptions = {
	providers: [
		// Primary Layer: Google Auth is now the ONLY login method
		GoogleProvider({
			clientId: process.env.AUTH_GOOGLE_ID || '',
			clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
		}),
	],
	adapter: SupabaseAdapter({
		url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
		secret: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
	}),
	callbacks: {
		async signIn({ user, account }: { user: User; account: Account | null }) {
			await Logger.info(MODULE, '--- Auth Attempt ---', {
				provider: account?.provider,
				email: user.email,
			});

			const userEmail = user.email?.toLowerCase() || '';

			if (account?.provider === 'google') {
				// Check database whitelist first
				const isWhitelisted = await isEmailAllowed(userEmail);

				if (isWhitelisted) {
					await Logger.info(
						MODULE,
						`✅ GOOGLE ACCESS GRANTED (whitelist): ${userEmail}`,
					);
					return true;
				}

				// Fallback: Also check ADMIN_EMAIL env variable for backwards compatibility
				const adminEmail = process.env.ADMIN_EMAIL || '';
				const envAllowedEmails = adminEmail
					.split(',')
					.map((e) => e.trim().toLowerCase())
					.filter((e) => e);

				if (envAllowedEmails.includes(userEmail)) {
					await Logger.info(
						MODULE,
						`✅ GOOGLE ACCESS GRANTED (env fallback): ${userEmail}`,
					);
					return true;
				}

				await Logger.warn(
					MODULE,
					`❌ GOOGLE ACCESS DENIED: ${userEmail} not in whitelist`,
				);
				return false;
			}

			// We no longer allow Facebook sign-ins for login
			if (account?.provider === 'facebook') {
				await Logger.warn(
					MODULE,
					`❌ Facebook Login Blocked (Use Link Feature instead): ${userEmail}`,
				);
				return false;
			}

			return false;
		},
		async jwt({
			token,
			user,
			trigger,
		}: {
			token: JWT;
			account: Account | null;
			user?: User;
			trigger?: 'signIn' | 'signUp' | 'update';
		}) {
			// Identity Layer: Initial sign-in
			if (user) {
				token.id = user.id;
				token.email = user.email;

				// Get role from database
				const email = user.email?.toLowerCase() || '';
				const role = await getUserRole(email);

				// If in DB whitelist, use that role. Otherwise check if in ADMIN_EMAIL (treat as admin)
				if (role) {
					token.role = role as UserRole;
				} else {
					// Fallback for ADMIN_EMAIL users not yet in whitelist
					const adminEmail = process.env.ADMIN_EMAIL || '';
					const envAdmins = adminEmail
						.split(',')
						.map((e) => e.trim().toLowerCase())
						.filter((e) => e);
					token.role = envAdmins.includes(email) ? 'admin' : 'user';
				}

				await Logger.info(MODULE, `👤 User JWT Created: ${user.email}`, {
					userId: user.id,
					role: token.role,
				});
			}

			// Check for Instagram connection on Sign In or Update
			// We check this when:
			// 1. Initial sign in (user is present)
			// 2. Trigger is 'update' (client asked for update)
			// 3. Token doesn't have instagram info yet (optional, maybe too expensive to check every time?)

			if (user || trigger === 'update' || !token.instagramAccount) {
				try {
					const { getLinkedFacebookAccount } =
						await import('@/lib/database/linked-accounts');
					const { getInstagramUsername } =
						await import('@/lib/instagram/account');

					const userId = token.id as string;
					if (userId) {
						const linkedAccount = await getLinkedFacebookAccount(userId);
						if (
							linkedAccount &&
							linkedAccount.ig_user_id &&
							linkedAccount.access_token
						) {
							// If we already have it in token and it matches, skipping might be good, but
							// for now we'll refresh it to be safe, or check if it's missing

							const username = await getInstagramUsername(
								linkedAccount.ig_user_id,
								linkedAccount.access_token,
							);

							token.instagramAccount = {
								id: linkedAccount.ig_user_id,
								username: username || undefined,
							};
						}
					}
				} catch (err) {
					console.error('Error fetching linked account in JWT callback:', err);
				}
			}

			return token;
		},
		async session({ session, token }: { session: Session; token: JWT }) {
			// 1. NextAuth Session Data
			if (session.user) {
				session.user.id = token.id as string;
				session.user.role = token.role as UserRole;
				session.user.instagramAccount = token.instagramAccount;
			}

			// 2. Supabase RLS JWT (Used for frontend Supabase calls)
			const signingSecret = process.env.SUPABASE_JWT_SECRET;
			if (signingSecret) {
				const payload = {
					aud: 'authenticated',
					exp: Math.floor(new Date(session.expires).getTime() / 1000),
					sub: token.id,
					email: session.user?.email,
					role: 'authenticated',
				};
				session.supabaseAccessToken = jwt.sign(payload, signingSecret);
			}

			return session;
		},
	},
	secret: process.env.NEXTAUTH_SECRET,
	session: {
		strategy: 'jwt',
	},
	pages: {
		signIn: '/auth/signin',
		verifyRequest: '/auth/verify-request',
	},
	// Debugging
	debug: true, // process.env.NODE_ENV === 'development',
};
