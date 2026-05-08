'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin'],
	weight: ['400', '500', '600', '700', '800'],
});

const GOOGLE_ICON = (
	<svg width={18} height={18} viewBox="0 0 24 24" aria-hidden>
		<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
		<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
		<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
		<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
	</svg>
);

const SPINNER = (
	<svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
		<circle cx={12} cy={12} r={9} stroke="currentColor" strokeOpacity={0.2} strokeWidth={2.5} />
		<path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
	</svg>
);

const BTN_PRIMARY =
	'inline-flex w-full items-center justify-center gap-2 rounded-md bg-marszal-ink px-[18px] py-3 text-[14.5px] font-medium text-marszal-bg transition hover:-translate-y-px hover:bg-marszal-ink2 disabled:pointer-events-none disabled:opacity-60';
const BTN_OUTLINE =
	'inline-flex w-full items-center justify-center gap-2 rounded-md border border-marszal-line bg-marszal-surface px-[18px] py-3 text-[14.5px] font-medium text-marszal-ink transition hover:border-[#c0bdb5] disabled:pointer-events-none disabled:opacity-60';
const BTN_OUTLINE_SM =
	'inline-flex items-center justify-center gap-2 rounded-md border border-marszal-line bg-marszal-surface px-3 py-2 text-[13px] font-medium text-marszal-ink transition hover:border-[#c0bdb5]';

const BULLETS = [
	{ mark: '→', strong: 'One Google sign-in.', tail: ' No password to forget. Connect Meta + TikTok from your dashboard after.' },
	{ mark: '↺', strong: 'Stateful by default.', tail: ' Your draft queue, scheduled posts and contributor invites are restored on every login.' },
	{ mark: '⌘', strong: 'Keyboard-first review.', tail: ' ←/→ to swipe, ↑ to defer. The same shortcuts work the moment you’re in.' },
];

export default function SignIn() {
	const [isLoading, setIsLoading] = useState(false);
	const [isDev, setIsDev] = useState(false);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe browser detection
		setIsDev(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
	}, []);

	const handleGoogle = async () => {
		try {
			setIsLoading(true);
			await signIn('google', { callbackUrl: '/', redirect: true });
		} catch (error) {
			console.error('Sign In Error:', error);
			setIsLoading(false);
		}
	};

	const handleTest = (email: string, role: string) => {
		signIn('test-credentials', { email, role, callbackUrl: '/', redirect: true });
	};

	const isTestEnv =
		isDev ||
		process.env.NODE_ENV !== 'production' ||
		process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH === 'true';

	return (
		<div
			className={`${inter.variable} font-marszal min-h-screen bg-marszal-bg text-marszal-ink antialiased [font-feature-settings:'cv11','ss01']`}
		>
			<nav className="sticky top-0 z-50 border-b border-marszal-line2 bg-marszal-bg/85 backdrop-blur-md">
				<div className="mx-auto flex h-[60px] max-w-[1180px] items-center justify-between px-7">
					<Link href="/" className="flex items-center gap-2.5 text-[16px] font-bold tracking-[-0.01em]">
						<span className="grid h-[26px] w-[26px] place-items-center rounded-md bg-marszal-ink text-[13px] font-extrabold tracking-[-0.02em] text-marszal-bg">
							M
						</span>
						<span>Marszal</span>
					</Link>
					<div className="hidden gap-7 text-[14px] text-marszal-muted lg:flex">
						<Link href="/#features" className="hover:text-marszal-ink">Features</Link>
						<Link href="/#how" className="hover:text-marszal-ink">How it works</Link>
						<Link href="/#pricing" className="hover:text-marszal-ink">Pricing</Link>
					</div>
					<Link
						href="/"
						className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-[14px] font-medium text-marszal-ink hover:bg-black/5"
					>
						← Back to home
					</Link>
				</div>
			</nav>

			<div className="mx-auto max-w-[1180px] px-7 py-14 lg:py-[88px]">
				<div className="grid items-center gap-8 lg:grid-cols-[1fr_460px] lg:gap-16">
					<div>
						<span className="inline-flex items-center gap-2 rounded-full border border-marszal-line bg-marszal-surface py-[5px] pr-[11px] pl-[7px] text-[12.5px] text-marszal-muted">
							<span className="marszal-pulse-dot block h-1.5 w-1.5 rounded-full bg-marszal-good" />
							<span>
								<strong className="font-semibold text-marszal-ink">v1.4</strong> &nbsp;·&nbsp; built solo, in production
							</span>
						</span>
						<h1 className="mt-6 mb-4 text-balance text-[36px] font-bold leading-[1.04] tracking-[-0.035em] text-marszal-ink lg:text-[52px]">
							Welcome <span className="font-bold italic text-marszal-accent">back</span>.
						</h1>
						<p className="mb-7 max-w-[460px] text-[17px] leading-[1.55] text-marszal-muted">
							Sign in to your Marszal workspace. The queue, calendar, and Insights stream are right where you left them.
						</p>
						<ul className="m-0 flex max-w-[460px] flex-col gap-3.5 p-0">
							{BULLETS.map((b) => (
								<li key={b.strong} className="flex items-start gap-3 text-[14px] text-marszal-ink2">
									<span className="font-marszal-mono mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border border-marszal-line bg-marszal-bg2 text-[10.5px] text-marszal-ink">
										{b.mark}
									</span>
									<span>
										<b className="font-semibold text-marszal-ink">{b.strong}</b>
										{b.tail}
									</span>
								</li>
							))}
						</ul>
					</div>

					<div className="rounded-[0.875rem] border border-marszal-line bg-marszal-surface p-8 shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_60px_-28px_rgba(20,18,15,0.18),0_8px_22px_-12px_rgba(20,18,15,0.10)]">
						<div className="mb-6">
							<div className="font-marszal-mono mb-1.5 text-[12px] uppercase tracking-[0.08em] text-marszal-accent">
								/auth · sign in
							</div>
							<h2 className="m-0 mb-1.5 text-[24px] font-bold tracking-[-0.02em] text-marszal-ink">
								Sign in to Marszal
							</h2>
							<p className="m-0 text-[14px] text-marszal-muted">
								Use your Google account to access your queue and connected channels.
							</p>
						</div>

						<button type="button" onClick={handleGoogle} disabled={isLoading} aria-busy={isLoading} className={BTN_OUTLINE}>
							{isLoading ? (
								<>
									{SPINNER}
									Connecting…
								</>
							) : (
								<>
									{GOOGLE_ICON}
									Continue with Google
								</>
							)}
						</button>
						<p className="mt-2.5 text-center text-[12px] leading-[1.5] text-marszal-muted">
							Facebook &amp; Instagram connections are linked from your dashboard after sign-in.
						</p>

						<div className="font-marszal-mono my-5 flex items-center gap-3.5 text-[11px] uppercase tracking-[0.08em] text-marszal-muted2 before:h-px before:flex-1 before:bg-marszal-line2 before:content-[''] after:h-px after:flex-1 after:bg-marszal-line2 after:content-['']">
							or
						</div>

						<button
							type="button"
							onClick={() => signIn('test-credentials', { email: 'demo@demo.com', callbackUrl: '/', redirect: true })}
							className={BTN_PRIMARY}
						>
							Try the demo →
						</button>
						<p className="mt-2.5 text-center text-[12px] leading-[1.5] text-marszal-muted">
							Read-only sample data. No account, no Meta credentials, no commitment.
						</p>

						{isTestEnv && (
							<div className="mt-6 border-t border-dashed border-marszal-line pt-6">
								<p className="font-marszal-mono mb-2.5 text-center text-[11px] uppercase tracking-[0.06em] text-marszal-muted">
									Test mode · localhost
								</p>
								<div className="grid grid-cols-2 gap-2">
									<button type="button" className={BTN_OUTLINE_SM} onClick={() => handleTest('user@test.com', 'user')}>
										Test User
									</button>
									<button type="button" className={BTN_OUTLINE_SM} onClick={() => handleTest('admin@test.com', 'admin')}>
										Test Admin
									</button>
								</div>
								<button
									type="button"
									className={`${BTN_OUTLINE_SM} mt-2 w-full`}
									onClick={() => handleTest('p.romanczuk@gmail.com', 'admin')}
								>
									Test Real IG
								</button>
							</div>
						)}

						<p className="font-marszal-mono mt-7 text-center text-[11px] uppercase tracking-[0.08em] text-marszal-muted2">
							Protected by NextAuth · Google OAuth 2.0
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
