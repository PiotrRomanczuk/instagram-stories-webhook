import Link from 'next/link';

const ARROW = (
	<svg width={10} height={10} viewBox="0 0 10 10">
		<path
			d="M2 5h6M5 2l3 3-3 3"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

const STEPS = [
	{ num: '01 — SUBMIT', title: 'Drop it in.', body: 'Contributors upload via web, link, or a private contributor portal. Drag, paste, or share-sheet from mobile.' },
	{ num: '02 — SWIPE', title: 'Approve in batches.', body: 'Editors burn through the queue with gestures. Dedupe and basic moderation run before anything reaches you.' },
	{ num: '03 — SCHEDULE', title: 'Drag onto the calendar.', body: 'Day / week / month / list views. Apply a humanize jitter so your queue doesn’t post like a bot.' },
	{ num: '04 — PUBLISH', title: 'Auto-shipped, retried, observed.', body: 'Distributed cron, quota-aware retries, real-time Insights piped back into your dashboard within seconds.' },
];

type Mark = 'yes' | 'partial' | 'no';
const MARK_CLASS: Record<Mark, string> = {
	yes: 'marszal-mark-yes inline-flex items-center gap-2 text-[13px] font-medium text-marszal-ink',
	partial: 'marszal-mark-partial inline-flex items-center gap-2 text-[13px] text-marszal-muted',
	no: 'marszal-mark-no inline-flex items-center gap-2 text-[13px] text-marszal-muted',
};

const COMPARE: Array<{ cap: string; m: [Mark, string]; a: [Mark, string]; b: [Mark, string] }> = [
	{ cap: 'Native Stories auto-publish (no push notif)', m: ['yes', 'Yes'], a: ['partial', 'Push only'], b: ['no', 'No'] },
	{ cap: 'Distributed cron locking', m: ['yes', 'Lease-based'], a: ['no', 'N/A'], b: ['no', 'N/A'] },
	{ cap: 'Tinder-style swipe review', m: ['yes', 'Yes'], a: ['no', 'List only'], b: ['no', 'List only'] },
	{ cap: 'Real-time multi-admin editing', m: ['yes', 'Websockets'], a: ['partial', 'Polling'], b: ['no', 'No'] },
	{ cap: 'Self-host option', m: ['yes', 'MIT, one-click'], a: ['no', 'No'], b: ['no', 'No'] },
	{ cap: 'Quota-aware retries (200 calls/hr)', m: ['yes', 'Token bucket'], a: ['partial', 'Best-effort'], b: ['partial', 'Best-effort'] },
];

const SECTION_HEAD = 'mb-12 flex flex-wrap items-end justify-between gap-x-8 gap-y-6';
const EYEBROW = 'font-marszal-mono mb-3.5 text-[12px] uppercase tracking-[0.08em] text-marszal-accent';
const SECTION_TITLE = 'm-0 max-w-[720px] text-balance text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-marszal-ink lg:text-[40px]';
const SECTION_SUB = 'max-w-[620px] text-pretty text-[17px] text-marszal-muted';

const PRICE_CHECK = (dark = false) => (
	<svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke={dark ? '#f0eee9' : '#0d0d0e'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0">
		<polyline points="2.5,7.5 6,10.5 11.5,4" />
	</svg>
);

const OPEN_FEATURES = [
	'All features, no asterisks',
	'1-click Vercel template + Postgres schema',
	'MIT licensed source on GitHub',
	'Community support · Discord',
	'Bring your own Meta app credentials',
];

const STUDIO_FEATURES = [
	'Everything in Open Core',
	'Managed infra · 99.95% SLA',
	'Up to 12 connected accounts per workspace',
	'Realtime Insights with 90-day history',
	'Priority email support · 1 business day',
	'SOC 2 audit trail (Q2 2026)',
];

export function LandingHowItWorks() {
	return (
		<section id="how" className="px-7 pt-8 pb-[88px]">
			<div className="mx-auto max-w-[1180px]">
				<div className={SECTION_HEAD}>
					<div>
						<div className={EYEBROW}>How it works</div>
						<h2 className={SECTION_TITLE}>Four stops between idea and posted.</h2>
					</div>
				</div>

				<div className="grid overflow-hidden rounded-[0.875rem] border border-marszal-line bg-marszal-surface lg:grid-cols-4">
					{STEPS.map((s, i) => (
						<div
							key={s.num}
							className="relative flex min-h-[220px] flex-col gap-3 border-t border-marszal-line2 p-7 first:border-t-0 lg:border-t-0 lg:border-l lg:first:border-l-0"
						>
							<span className="font-marszal-mono text-[11px] tracking-[0.05em] text-marszal-muted">{s.num}</span>
							<h4 className="m-0 text-[18px] font-semibold tracking-[-0.015em] text-marszal-ink">{s.title}</h4>
							<p className="m-0 text-[13.5px] leading-[1.55] text-marszal-muted">{s.body}</p>
							{i < STEPS.length - 1 && (
								<div className="absolute -right-2.5 top-8 z-10 hidden h-5 w-5 place-items-center rounded-full border border-marszal-line2 bg-marszal-surface text-marszal-muted lg:grid">
									{ARROW}
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

export function LandingCompare() {
	const cellBase = 'border-t border-marszal-line2 px-[22px] py-4 text-[14px] lg:border-t-0 lg:border-l';
	return (
		<section id="compare" className="px-7 pt-8 pb-[88px]">
			<div className="mx-auto max-w-[1180px]">
				<div className={SECTION_HEAD}>
					<div>
						<div className={EYEBROW}>Why Marszal</div>
						<h2 className={SECTION_TITLE}>For people who post like a pipeline, not a person.</h2>
					</div>
					<p className={SECTION_SUB}>
						Mainstream schedulers optimize for one-person, one-account simplicity. Marszal optimizes for everyone else — the agencies, the meme labs, the prolific.
					</p>
				</div>

				<div className="overflow-hidden rounded-[0.875rem] border border-marszal-line bg-marszal-surface">
					<div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
						<div className={`font-marszal-mono bg-marszal-bg px-[22px] py-3.5 text-[12px] font-medium uppercase tracking-[0.04em] text-marszal-muted`}>
							Capability
						</div>
						<div className={`font-marszal-mono bg-[color-mix(in_oklab,var(--color-marszal-accent-soft)_60%,white)] px-[22px] py-3.5 text-[12px] font-medium uppercase tracking-[0.04em] text-marszal-ink lg:border-l lg:border-marszal-line2`}>
							Marszal
						</div>
						<div className={`font-marszal-mono bg-marszal-bg px-[22px] py-3.5 text-[12px] font-medium uppercase tracking-[0.04em] text-marszal-muted lg:border-l lg:border-marszal-line2`}>
							Tool A
						</div>
						<div className={`font-marszal-mono bg-marszal-bg px-[22px] py-3.5 text-[12px] font-medium uppercase tracking-[0.04em] text-marszal-muted lg:border-l lg:border-marszal-line2`}>
							Tool B
						</div>

						{COMPARE.map((row) => (
							<div key={row.cap} className="contents">
								<div className={`${cellBase} font-medium text-marszal-ink lg:border-l-0`}>{row.cap}</div>
								<div className={`${cellBase} bg-[color-mix(in_oklab,var(--color-marszal-accent-soft)_60%,white)]`}>
									<span className={MARK_CLASS[row.m[0]]}>{row.m[1]}</span>
								</div>
								<div className={cellBase}>
									<span className={MARK_CLASS[row.a[0]]}>{row.a[1]}</span>
								</div>
								<div className={cellBase}>
									<span className={MARK_CLASS[row.b[0]]}>{row.b[1]}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

export function LandingPricing() {
	return (
		<section id="pricing" className="px-7 pt-8 pb-[88px]">
			<div className="mx-auto max-w-[1180px]">
				<div className={SECTION_HEAD}>
					<div>
						<div className={EYEBROW}>Pricing</div>
						<h2 className={SECTION_TITLE}>Self-host free. Or skip the ops.</h2>
					</div>
					<p className={SECTION_SUB}>Same code on both sides — just decide whether you want to operate it yourself.</p>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<div className="flex min-h-[460px] flex-col rounded-[0.875rem] border border-marszal-line bg-marszal-surface p-8">
						<span className="font-marszal-mono mb-4 inline-block w-fit rounded-full border border-marszal-line bg-marszal-bg px-2.5 py-1 text-[11px] text-marszal-ink">
							SELF-HOST · FREE
						</span>
						<h3 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]">Open Core</h3>
						<p className="m-0 mb-6 text-[14px] text-marszal-muted">Deploy to Vercel + Supabase in 10 minutes. The exact same engine we ship.</p>
						<div className="mb-1.5 flex items-baseline gap-1.5 text-[44px] font-bold leading-none tracking-[-0.03em] text-marszal-ink">
							$0<small className="text-[14px] font-normal text-marszal-muted"> /forever</small>
						</div>
						<ul className="my-6 flex flex-col gap-2.5 p-0">
							{OPEN_FEATURES.map((f) => (
								<li key={f} className="flex items-start gap-2.5 text-[13.5px] text-marszal-ink">
									{PRICE_CHECK(false)}
									{f}
								</li>
							))}
						</ul>
						<div className="mt-auto">
							<a
								href="https://github.com/PiotrRomanczuk/instagram-stories-webhook"
								className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-marszal-line bg-marszal-surface px-[18px] py-3 text-[14.5px] font-medium text-marszal-ink transition hover:border-[#c0bdb5]"
							>
								View on GitHub →
							</a>
						</div>
					</div>

					<div className="relative flex min-h-[460px] flex-col rounded-[0.875rem] border border-marszal-ink bg-marszal-ink p-8 text-marszal-bg">
						<span className="font-marszal-mono mb-4 inline-block w-fit rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px]">
							HOSTED
						</span>
						<h3 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]">Studio</h3>
						<p className="m-0 mb-6 text-[14px] text-marszal-bg/60">Hosted, monitored, on-call. We keep the cron running so you don&rsquo;t.</p>
						<div className="mb-1.5 flex items-baseline gap-1.5 text-[44px] font-bold leading-none tracking-[-0.03em]">
							$24<small className="text-[14px] font-normal text-marszal-bg/60"> /seat / month</small>
						</div>
						<ul className="my-6 flex flex-col gap-2.5 p-0">
							{STUDIO_FEATURES.map((f) => (
								<li key={f} className="flex items-start gap-2.5 text-[13.5px]">
									{PRICE_CHECK(true)}
									{f}
								</li>
							))}
						</ul>
						<div className="mt-auto">
							<Link
								href="/auth/signin"
								className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-marszal-bg px-[18px] py-3 text-[14.5px] font-medium text-marszal-ink transition hover:bg-white"
							>
								Start 14-day trial →
							</Link>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export function LandingCta() {
	return (
		<section className="px-7 pt-8 pb-8">
			<div className="mx-auto max-w-[1180px]">
				<div
					className="rounded-[0.875rem] border border-marszal-line bg-marszal-surface px-12 py-16 text-center max-md:p-11"
					style={{
						backgroundImage:
							'radial-gradient(700px 300px at 80% 10%, color-mix(in oklab, oklch(0.55 0.18 295) 12%, transparent), transparent 70%)',
					}}
				>
					<div className="font-marszal-mono mb-3.5 inline-block text-[12px] uppercase tracking-[0.08em] text-marszal-accent">
						Ready when you are
					</div>
					<h2 className="m-0 mb-3.5 text-[30px] font-bold leading-[1.05] tracking-[-0.03em] text-marszal-ink lg:text-[44px]">
						Stop re-uploading every story by hand.
					</h2>
					<p className="mx-auto mb-7 max-w-[540px] text-[17px] text-marszal-muted">
						Free to self-host. 14 days free on Studio. No credit card. Cancel by deleting the repo.
					</p>
					<div className="inline-flex gap-3">
						<Link
							href="/auth/signin"
							className="inline-flex items-center gap-2 rounded-md bg-marszal-ink px-[18px] py-3 text-[14.5px] font-medium text-marszal-bg transition hover:-translate-y-px hover:bg-marszal-ink2"
						>
							Start free →
						</Link>
						<a
							href="https://github.com/PiotrRomanczuk/instagram-stories-webhook"
							className="inline-flex items-center gap-2 rounded-md border border-marszal-line bg-marszal-surface px-[18px] py-3 text-[14.5px] font-medium text-marszal-ink transition hover:border-[#c0bdb5]"
						>
							Read the docs
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}

export function LandingFooter({ version }: { version: string }) {
	const colTitle = 'font-marszal-mono mb-3.5 text-[12px] font-medium uppercase tracking-[0.06em] text-marszal-muted';
	const colLink = 'block py-1 text-[14px] text-marszal-ink2 hover:text-marszal-accent';
	return (
		<footer className="mt-20 border-t border-marszal-line2 px-7 pt-14 pb-9">
			<div className="mx-auto max-w-[1180px]">
				<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
					<div>
						<div className="mb-3.5 flex items-center gap-2.5 text-[16px] font-bold tracking-[-0.01em]">
							<span className="grid h-[26px] w-[26px] place-items-center rounded-md bg-marszal-ink text-[13px] font-extrabold tracking-[-0.02em] text-marszal-bg">
								M
							</span>
							<span>Marszal</span>
						</div>
						<p className="m-0 max-w-[320px] text-[14px] text-marszal-muted">
							A pipeline-grade scheduler for Instagram Stories &amp; TikTok. Built solo, built well.
						</p>
					</div>
					<div>
						<h5 className={colTitle}>Product</h5>
						<a href="#features" className={colLink}>Features</a>
						<a href="#pricing" className={colLink}>Pricing</a>
						<Link href="/release-notes" className={colLink}>Changelog</Link>
						<a href="#how" className={colLink}>Roadmap</a>
					</div>
					<div>
						<h5 className={colTitle}>Developers</h5>
						<a href="https://github.com/PiotrRomanczuk/instagram-stories-webhook" className={colLink}>Self-host guide</a>
						<a href="https://github.com/PiotrRomanczuk/instagram-stories-webhook" className={colLink}>API reference</a>
						<a href="https://github.com/PiotrRomanczuk/instagram-stories-webhook" className={colLink}>GitHub</a>
						<Link href="/debug" className={colLink}>Status</Link>
					</div>
					<div>
						<h5 className={colTitle}>Company</h5>
						<a href="#" className={colLink}>About</a>
						<a href="#" className={colLink}>Contact</a>
						<Link href="/privacy" className={colLink}>Privacy</Link>
						<Link href="/terms" className={colLink}>Terms</Link>
					</div>
				</div>
				<div className="font-marszal-mono mt-12 flex items-center justify-between border-t border-marszal-line2 pt-6 text-[12.5px] text-marszal-muted">
					<div>© 2026 Marszal · Built solo in Warsaw &amp; Lisbon</div>
					<div>v{version}</div>
				</div>
			</div>
		</footer>
	);
}
