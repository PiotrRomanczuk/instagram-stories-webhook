import Link from 'next/link';
import { SwipeStack } from './swipe-stack';

const CHECK = (
	<svg
		className="h-3.5 w-3.5 shrink-0 text-marszal-ink"
		viewBox="0 0 14 14"
		fill="none"
		stroke="currentColor"
		strokeWidth={2}
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<polyline points="2.5,7.5 6,10.5 11.5,4" />
	</svg>
);

const PROOF = [
	{ num: '113', tail: null, lbl: 'E2E tests against real Instagram' },
	{ num: '200', tail: '/hr', lbl: 'Quota-aware retry budget' },
	{ num: '0', tail: null, lbl: 'Double-posts since Aug 2025' },
	{ num: '1.2k', tail: '★', lbl: 'GitHub stars · open core' },
];

export function LandingHero() {
	return (
		<header className="px-7 pt-[72px] pb-10">
			<div className="mx-auto max-w-[1180px]">
				<div className="grid items-center gap-16 max-lg:grid-cols-1 max-lg:gap-10 lg:grid-cols-[1.05fr_1fr]">
					<div>
						<span className="inline-flex items-center gap-2 rounded-full border border-marszal-line bg-marszal-surface py-[5px] pr-[11px] pl-[7px] text-[12.5px] text-marszal-muted">
							<span className="marszal-pulse-dot block h-1.5 w-1.5 rounded-full bg-marszal-good" />
							<span>
								<strong className="font-semibold text-marszal-ink">v1.4</strong> &nbsp;·&nbsp; built solo, in production
							</span>
						</span>

						<h1 className="my-[22px_0_20px] mt-[22px] mb-5 text-balance text-[44px] font-bold leading-[1.02] tracking-[-0.035em] text-marszal-ink lg:text-[64px]">
							Schedule, <span className="font-bold italic text-marszal-accent">swipe</span>,
							<br />
							ship.
						</h1>

						<p className="max-w-[520px] text-pretty text-[18px] leading-[1.55] text-marszal-muted">
							A pipeline-grade scheduler for Instagram Stories &amp; TikTok. Submit, swipe-review,
							drag onto a calendar — Marszal auto-publishes through the Meta Graph API without you
							re-uploading a thing.
						</p>

						<div className="mt-7 flex items-center gap-3">
							<Link
								href="/auth/signin"
								className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-marszal-ink px-[18px] py-3 text-[14.5px] font-medium text-marszal-bg transition hover:-translate-y-px hover:bg-marszal-ink2"
							>
								Start scheduling →
							</Link>
							<Link
								href="#how"
								className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-marszal-line bg-marszal-surface px-[18px] py-3 text-[14.5px] font-medium text-marszal-ink transition hover:border-[#c0bdb5]"
							>
								<svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
									<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z" />
									<path d="M6.5 5.5l4 2.5-4 2.5v-5z" fill="currentColor" />
								</svg>
								Watch 90s demo
							</Link>
						</div>

						<div className="mt-9 flex flex-wrap gap-x-[22px] gap-y-2 text-[13px] text-marszal-muted">
							<div className="flex items-center gap-2">
								{CHECK}
								<span>No re-uploads</span>
							</div>
							<div className="flex items-center gap-2">
								{CHECK}
								<span>Self-host or hosted</span>
							</div>
							<div className="flex items-center gap-2">
								{CHECK}
								<span>14-day free trial</span>
							</div>
						</div>
					</div>

					<div className="relative grid aspect-[1/1.05] place-items-center">
						<div className="relative h-full w-full overflow-hidden rounded-[0.875rem] border border-marszal-line bg-marszal-surface shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_60px_-28px_rgba(20,18,15,0.18),0_8px_22px_-12px_rgba(20,18,15,0.10)]">
							<div className="flex h-11 items-center gap-2 border-b border-marszal-line2 bg-[linear-gradient(to_bottom,#fafaf6,#fff)] px-3.5">
								<span className="h-[9px] w-[9px] rounded-full bg-[#e2dfd6]" />
								<span className="h-[9px] w-[9px] rounded-full bg-[#e2dfd6]" />
								<span className="h-[9px] w-[9px] rounded-full bg-[#e2dfd6]" />
								<span className="font-marszal-mono ml-auto text-[11.5px] text-marszal-muted">marszal.app/queue</span>
							</div>
							<div
								className="relative grid place-items-center overflow-hidden bg-marszal-bg"
								style={{
									height: 'calc(100% - 44px - 56px)',
									backgroundImage:
										'radial-gradient(800px 400px at 50% -20%, color-mix(in oklab, oklch(0.55 0.18 295) 8%, transparent), transparent 60%)',
								}}
							>
								<SwipeStack />
							</div>
							<div className="flex h-14 items-center justify-center gap-[18px] border-t border-marszal-line2 bg-marszal-surface">
								<div className="font-marszal-mono inline-flex items-center gap-2 text-[12px] text-marszal-muted">
									<span className="font-marszal-mono inline-grid h-[22px] min-w-[22px] place-items-center rounded-md border border-b-2 border-marszal-line bg-marszal-bg2 px-1.5 text-[11px] text-marszal-ink">
										←
									</span>
									skip
								</div>
								<div className="font-marszal-mono inline-flex items-center gap-2 text-[12px] text-marszal-muted">
									<span className="font-marszal-mono inline-grid h-[22px] min-w-[22px] place-items-center rounded-md border border-b-2 border-marszal-line bg-marszal-bg2 px-1.5 text-[11px] text-marszal-ink">
										↑
									</span>
									save for later
								</div>
								<div className="font-marszal-mono inline-flex items-center gap-2 text-[12px] text-marszal-muted">
									<span className="font-marszal-mono inline-grid h-[22px] min-w-[22px] place-items-center rounded-md border border-b-2 border-marszal-line bg-marszal-bg2 px-1.5 text-[11px] text-marszal-ink">
										→
									</span>
									queue
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-9 grid grid-cols-4 border-t border-marszal-line2 px-0 pt-[42px] pb-[18px] max-md:grid-cols-2 max-md:gap-y-4">
					{PROOF.map((p, i) => (
						<div
							key={p.lbl}
							className={
								i === 0
									? 'px-4 py-1.5 first:pl-0'
									: 'border-l border-marszal-line2 px-4 py-1.5 max-md:[&:nth-child(3)]:border-l-0 max-md:[&:nth-child(3)]:pl-0'
							}
						>
							<div className="font-marszal-mono text-[28px] font-bold tracking-[-0.02em]">
								{p.num}
								{p.tail && <span className="text-marszal-muted2">{p.tail}</span>}
							</div>
							<div className="mt-1 text-[12.5px] text-marszal-muted">{p.lbl}</div>
						</div>
					))}
				</div>
			</div>
		</header>
	);
}
