import { AuthOptions, Session, User, Account } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import * as jwt from 'jsonwebtoken';
import { Logger } from './utils/logger';
import { recordAuthEvent } from './utils/auth-events';
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
		// Test/Demo credentials provider - always registered.
		// The signIn callback controls who actually gets through.
		CredentialsProvider({
			id: 'test-credentials',
			name: 'Test Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
			},
			async authorize(credentials) {
				if (!credentials?.email) return null;
				return {
					id: 'test-' + credentials.email.replace(/[^a-z0-9]/g, '-'),
					email: credentials.email,
					name: credentials.email.split('@')[0],
					image: '',
				};
			},
		}),
	],
	...(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
		? {
				adapter: SupabaseAdapter({
					url: process.env.NEXT_PUBLIC_SUPABASE_URL,
					secret: process.env.SUPABASE_SERVICE_ROLE_KEY,
				}),
			}
		: {}),
	callbacks: {
		async signIn({ user, account }: { user: User; account: Account | null }) {
			await Logger.info(MODULE, '--- Auth Attempt ---', {
				provider: account?.provider,
				email: user.email,
			});

			const userEmail = user.email?.toLowerCase() || '';
			const provider = account?.provider || 'unknown';

			// Demo login — always allowed, no whitelist needed
			const DEMO_EMAIL = 'demo@demo.com';
			if (provider === 'test-credentials' && userEmail === DEMO_EMAIL) {
				await Logger.info(MODULE, `✅ DEMO ACCESS GRANTED: ${userEmail}`);
				await recordAuthEvent({ email: userEmail, provider, outcome: 'granted' });
				return true;
			}

			// Allow test credentials in development/test mode
			if (provider === 'test-credentials') {
				// Emails from env var (comma-separated); empty list means whitelist-only
				const testEmailsEnv = process.env.TEST_AUTH_EMAILS;
				const testEmails = testEmailsEnv
					? testEmailsEnv.split(',').map(e => e.trim().toLowerCase())
					: [];
				await Logger.warn(MODULE, '⚠️ Test auth provider active', { emailCount: testEmails.length });
				if (testEmails.includes(userEmail)) {
					await Logger.info(MODULE, `✅ TEST ACCESS GRANTED (dev mode): ${userEmail}`);
					await recordAuthEvent({ email: userEmail, provider, outcome: 'granted' });
					return true;
				}
				const isWhitelisted = await isEmailAllowed(userEmail);
				if (isWhitelisted) {
					await Logger.info(MODULE, `✅ TEST ACCESS GRANTED: ${userEmail}`);
					await recordAuthEvent({ email: userEmail, provider, outcome: 'granted' });
					return true;
				}
				await Logger.warn(MODULE, `❌ TEST ACCESS DENIED: ${userEmail} not in whitelist`);
				await recordAuthEvent({ email: userEmail, provider, outcome: 'denied', denyReason: 'not_in_whitelist' });
				return false;
			}

			if (provider === 'google') {
				const isWhitelisted = await isEmailAllowed(userEmail);
				if (isWhitelisted) {
					await Logger.info(MODULE, `✅ GOOGLE ACCESS GRANTED (whitelist): ${userEmail}`);
					await recordAuthEvent({ email: userEmail, provider, outcome: 'granted' });
					return true;
				}

				const adminEmail = process.env.ADMIN_EMAIL || '';
				const envAllowedEmails = adminEmail
					.split(',')
					.map((e) => e.trim().toLowerCase())
					.filter((e) => e);

				if (envAllowedEmails.includes(userEmail)) {
					await Logger.info(MODULE, `✅ GOOGLE ACCESS GRANTED (env fallback): ${userEmail}`);
					await recordAuthEvent({ email: userEmail, provider, outcome: 'granted' });
					return true;
				}

				await Logger.warn(MODULE, `❌ GOOGLE ACCESS DENIED: ${userEmail} not in whitelist`);
				await recordAuthEvent({ email: userEmail, provider, outcome: 'denied', denyReason: 'not_in_whitelist' });
				return false;
			}

			// We no longer allow Facebook sign-ins for login
			if (provider === 'facebook') {
				await Logger.warn(MODULE, `❌ Facebook Login Blocked (Use Link Feature instead): ${userEmail}`);
				await recordAuthEvent({ email: userEmail, provider, outcome: 'denied', denyReason: 'facebook_blocked' });
				return false;
			}

			await recordAuthEvent({ email: userEmail, provider, outcome: 'denied', denyReason: 'unknown_provider' });
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

				// Demo user always gets demo role
				if (email === 'demo@demo.com') {
					token.role = 'demo';
				} else {
					// Handle known test emails in dev/test mode
					const testUserRoles: Record<string, UserRole> = {
						'user@test.com': 'user',
						'admin@test.com': 'admin',
						'user2@test.com': 'user',
						'p.romanczuk@gmail.com': 'admin',
					};
					if ((process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_AUTH === 'true') && testUserRoles[email]) {
						token.role = testUserRoles[email];
					} else {
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
					}
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
						// Check if account exists AND token is not expired
						const isTokenValid =
							linkedAccount &&
							linkedAccount.access_token &&
							(!linkedAccount.expires_at ||
								linkedAccount.expires_at > Date.now());

						if (linkedAccount && linkedAccount.ig_user_id && isTokenValid) {
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

							// NEW: Update DB if username was found but not stored or changed
							if (username && username !== linkedAccount.ig_username) {
								const { saveLinkedFacebookAccount } =
									await import('@/lib/database/linked-accounts');
								await saveLinkedFacebookAccount({
									...linkedAccount,
									ig_username: username,
								});
							}
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
	debug: process.env.NODE_ENV === 'development',
};
