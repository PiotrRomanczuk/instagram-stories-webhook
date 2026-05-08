const CALENDAR_DAYS: Array<{ label: string; ev?: 'a1' | 'a2' | 'a3' }> = [
	{ label: 'M', ev: 'a1' }, { label: 'T', ev: 'a2' }, { label: 'W' }, { label: 'T', ev: 'a1' },
	{ label: 'F', ev: 'a3' }, { label: 'S' }, { label: 'S', ev: 'a1' },
	{ label: '8', ev: 'a1' }, { label: '9', ev: 'a2' }, { label: '10', ev: 'a1' }, { label: '11' },
	{ label: '12', ev: 'a3' }, { label: '13', ev: 'a1' }, { label: '14' },
	{ label: '15', ev: 'a2' }, { label: '16' }, { label: '17', ev: 'a1' }, { label: '18', ev: 'a1' },
	{ label: '19' }, { label: '20', ev: 'a3' }, { label: '21', ev: 'a1' },
	{ label: '22' }, { label: '23', ev: 'a1' }, { label: '24', ev: 'a2' }, { label: '25' },
	{ label: '26', ev: 'a1' }, { label: '27', ev: 'a3' }, { label: '28' },
];

const EV_BG: Record<'a1' | 'a2' | 'a3', string> = {
	a1: 'bg-marszal-ink',
	a2: 'bg-marszal-accent',
	a3: 'bg-marszal-good',
};

const FEAT_CARD =
	'flex min-h-[320px] flex-col gap-4 rounded-[0.875rem] border border-marszal-line bg-marszal-surface p-[26px] transition-colors hover:border-[#c5c1b6]';
const FEAT_TAG = 'font-marszal-mono text-[11px] tracking-[0.04em] text-marszal-muted';
const FEAT_H3 = 'mb-1.5 text-[20px] font-semibold tracking-[-0.015em] text-marszal-ink';
const FEAT_P = 'text-[14px] leading-[1.55] text-marszal-muted';
const FEAT_VIS =
	'relative min-h-[140px] flex-1 overflow-hidden rounded-md border border-marszal-line2 bg-marszal-bg';

export function LandingFeatures() {
	return (
		<section id="features" className="px-7 py-[88px]">
			<div className="mx-auto max-w-[1180px]">
				<div className="mb-12 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
					<div>
						<div className="font-marszal-mono mb-3.5 text-[12px] uppercase tracking-[0.08em] text-marszal-accent">Features</div>
						<h2 className="m-0 max-w-[720px] text-balance text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-marszal-ink lg:text-[40px]">
							A pipeline, not a posting box.
						</h2>
					</div>
					<p className="max-w-[620px] text-pretty text-[17px] text-marszal-muted">
						Six tools that together replace your &ldquo;Notes app + Drive folder + 3 Telegram threads + 11pm phone alarm&rdquo; workflow.
					</p>
				</div>

				<div className="grid gap-4 lg:grid-cols-6">
					<article className={`${FEAT_CARD} flex-col lg:col-span-6 lg:min-h-[280px] lg:flex-row`}>
						<div className="flex flex-col gap-4 lg:flex-[0_0_38%] lg:pr-6">
							<div className={FEAT_TAG}>01 / Swipe queue</div>
							<h3 className={FEAT_H3}>Tinder-style review with SHA-256 dedupe.</h3>
							<p className={FEAT_P}>
								Burn through a backlog of 200 submissions in under five minutes. Gestures on mobile, arrow keys on desktop — and a hash check that catches re-uploads before they hit your queue twice.
							</p>
							<div className="font-marszal-mono mt-auto flex gap-[18px] pt-3.5 text-[11.5px] text-marszal-muted">
								<div>→ Optimistic UI</div>
								<div>→ Undo last 20</div>
								<div>→ Bulk approve</div>
							</div>
						</div>
						<div className={`${FEAT_VIS} bg-marszal-bg lg:flex-1`}>
							<div className="absolute inset-6 grid place-items-center">
								<div className="relative aspect-[9/14] w-[180px]">
									<div
										className="marszal-scard"
										style={{ transform: 'rotate(-6deg) translateY(8px)', ['--card-bg' as string]: '#d6d0c5' } as React.CSSProperties}
									>
										<div
											className="marszal-scard-thumb"
											data-label="@nightowl.fm · 14s"
											style={{
												background:
													'repeating-linear-gradient(135deg, rgba(0,0,0,0.04) 0 8px, transparent 8px 16px), #d6d0c5',
											}}
										/>
										<div className="flex h-14 items-center gap-2.5 border-t border-marszal-line2 bg-marszal-surface px-3 py-2.5">
											<div className="h-[26px] w-[26px] rounded-full bg-[linear-gradient(135deg,#e6e3dc,#c9c5bb)]" />
											<div className="flex flex-col gap-0.5">
												<b className="text-[12.5px] font-semibold">nightowl.fm</b>
												<span className="font-marszal-mono text-[11px] text-marszal-muted">submitted 2m ago</span>
											</div>
										</div>
									</div>
									<div
										className="marszal-scard"
										style={{ transform: 'rotate(3deg)', ['--card-bg' as string]: '#c8c1d9' } as React.CSSProperties}
									>
										<div
											className="marszal-scard-thumb"
											data-label="@meme.dept · 9s"
											style={{
												background:
													'repeating-linear-gradient(135deg, rgba(0,0,0,0.04) 0 8px, transparent 8px 16px), #c8c1d9',
											}}
										/>
										<div className="flex h-14 items-center gap-2.5 border-t border-marszal-line2 bg-marszal-surface px-3 py-2.5">
											<div className="h-[26px] w-[26px] rounded-full bg-[linear-gradient(135deg,#e6e3dc,#c9c5bb)]" />
											<div className="flex flex-col gap-0.5">
												<b className="text-[12.5px] font-semibold">meme.dept</b>
												<span className="font-marszal-mono text-[11px] text-marszal-muted">submitted 11m ago</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</article>

					<article className={`${FEAT_CARD} lg:col-span-3`}>
						<div className={FEAT_TAG}>02 / Calendar</div>
						<h3 className={FEAT_H3}>Drag-and-drop across day, week, month &amp; list.</h3>
						<p className={FEAT_P}>One-click &ldquo;humanize&rdquo; jitter scatters posts ±12 minutes so your feed doesn&rsquo;t read robotic.</p>
						<div className={FEAT_VIS}>
							<div className="absolute inset-0 grid grid-rows-[auto_1fr] gap-2 p-3.5">
								<div className="font-marszal-mono flex items-center justify-between text-[11px] text-marszal-muted">
									<span>OCT 2025 · WEEK 41</span>
									<span>4 / 7 days scheduled</span>
								</div>
								<div className="grid grid-cols-7 grid-rows-4 gap-1">
									{CALENDAR_DAYS.map((d, i) => (
										<div
											key={i}
											className="font-marszal-mono relative rounded-sm border border-marszal-line2 bg-marszal-surface px-1 py-0.5 text-[9px] text-marszal-muted2"
										>
											{d.label}
											{d.ev && (
												<div
													className={`absolute right-[3px] bottom-[3px] left-[3px] h-[5px] rounded-[2px] ${EV_BG[d.ev]}`}
												/>
											)}
										</div>
									))}
								</div>
							</div>
						</div>
					</article>

					<article className={`${FEAT_CARD} lg:col-span-3`}>
						<div className={FEAT_TAG}>03 / Auto-publish</div>
						<h3 className={FEAT_H3}>Distributed locks. No double-posts.</h3>
						<p className={FEAT_P}>Vercel cron sometimes fires twice. Marszal&rsquo;s lease-based locking guarantees one publish — even on a redeploy mid-cron.</p>
						<div className={`${FEAT_VIS} grid place-items-center p-[18px]`}>
							<div className="grid w-full grid-cols-3 gap-2.5">
								<div className="marszal-core-lead font-marszal-mono relative flex min-h-[78px] flex-col gap-1.5 rounded-md border bg-marszal-surface p-3 text-[11px] text-marszal-muted">
									<span className="text-[10.5px] font-semibold text-marszal-ink">cron-iad1</span>
									<span>publishing…</span>
									<span className="mt-auto inline-flex items-center gap-1.5 text-[10px]">
										<span className="animate-marszal-pulse block h-1.5 w-1.5 rounded-full bg-marszal-good" />
										active
									</span>
									<span className="absolute top-2 right-2 text-[9px] font-semibold tracking-[0.08em] text-marszal-ink">
										LOCK
									</span>
								</div>
								<div className="font-marszal-mono flex min-h-[78px] flex-col gap-1.5 rounded-md border border-marszal-line2 bg-marszal-surface p-3 text-[11px] text-marszal-muted">
									<span className="text-[10.5px] font-semibold text-marszal-ink">cron-fra1</span>
									<span>blocked</span>
									<span className="mt-auto inline-flex items-center gap-1.5 text-[10px]">
										<span className="block h-1.5 w-1.5 rounded-full bg-marszal-muted2" />
										standby
									</span>
								</div>
								<div className="font-marszal-mono flex min-h-[78px] flex-col gap-1.5 rounded-md border border-marszal-line2 bg-marszal-surface p-3 text-[11px] text-marszal-muted">
									<span className="text-[10.5px] font-semibold text-marszal-ink">cron-sin1</span>
									<span>blocked</span>
									<span className="mt-auto inline-flex items-center gap-1.5 text-[10px]">
										<span className="block h-1.5 w-1.5 rounded-full bg-marszal-muted2" />
										standby
									</span>
								</div>
							</div>
						</div>
					</article>

					<article className={`${FEAT_CARD} lg:col-span-3`}>
						<div className={FEAT_TAG}>04 / Video pipeline</div>
						<h3 className={FEAT_H3}>Validated &amp; transcoded before it hits Meta.</h3>
						<p className={FEAT_P}>FFmpeg.wasm checks aspect, duration, codec — in your browser. Server transcodes to spec, uploads via signed URLs.</p>
						<div className={FEAT_VIS}>
							<div className="font-marszal-mono absolute inset-3.5 flex flex-col gap-2.5 text-[11px]">
								{[
									['1.', 'probe.mp4 · 1080×1920 · 14s', 'ok'],
									['2.', 'transcode H.264 · CRF 23', 'ok'],
									['3.', 'sha256 → dedupe check', 'ok'],
									['4.', 'POST /media · signed URL', 'ok'],
								].map(([n, mid, ok]) => (
									<div
										key={n}
										className="flex items-center gap-2.5 rounded-md border border-marszal-line2 bg-marszal-surface px-2.5 py-2 text-marszal-muted"
									>
										<span className="font-semibold text-marszal-ink">{n}</span> {mid}
										<span className="ml-auto font-semibold text-marszal-good">{ok}</span>
									</div>
								))}
								<div className="flex items-center gap-2.5 rounded-md border border-marszal-line2 bg-marszal-surface px-2.5 py-2 text-marszal-muted">
									<span className="text-marszal-muted2">5. publish · scheduled 18:42 UTC</span>
								</div>
							</div>
						</div>
					</article>

					<article className={`${FEAT_CARD} lg:col-span-3`}>
						<div className={FEAT_TAG}>05 / Insights</div>
						<h3 className={FEAT_H3}>Live impressions, reach &amp; replies.</h3>
						<p className={FEAT_P}>Supabase Realtime streams Meta Insights as soon as they post. No &ldquo;refresh in 24 hours&rdquo; nonsense.</p>
						<div className={FEAT_VIS}>
							<div className="absolute inset-3.5 flex flex-col gap-3">
								<div>
									<div className="font-marszal-mono text-[11px] text-marszal-muted">IMPRESSIONS · 24H</div>
									<div className="font-marszal-mono text-[24px] font-semibold tracking-[-0.02em] text-marszal-ink">
										48,210<span className="ml-2 text-[13px] text-marszal-good">+ 12.4%</span>
									</div>
								</div>
								<div className="relative flex-1">
									<svg viewBox="0 0 200 60" preserveAspectRatio="none" className="block h-full w-full">
										<defs>
											<linearGradient id="marszal-spark" x1="0" x2="0" y1="0" y2="1">
												<stop offset="0%" stopColor="oklch(0.55 0.18 295)" stopOpacity="0.25" />
												<stop offset="100%" stopColor="oklch(0.55 0.18 295)" stopOpacity="0" />
											</linearGradient>
										</defs>
										<path
											d="M0,42 L20,38 L40,46 L60,30 L80,34 L100,22 L120,28 L140,16 L160,20 L180,10 L200,14 L200,60 L0,60 Z"
											fill="url(#marszal-spark)"
										/>
										<path
											d="M0,42 L20,38 L40,46 L60,30 L80,34 L100,22 L120,28 L140,16 L160,20 L180,10 L200,14"
											stroke="oklch(0.55 0.18 295)"
											strokeWidth={1.5}
											fill="none"
										/>
									</svg>
								</div>
							</div>
						</div>
					</article>

					<article className={`${FEAT_CARD} lg:col-span-3`}>
						<div className={FEAT_TAG}>06 / Contributor workflows</div>
						<h3 className={FEAT_H3}>Roles, payouts, onboarding wizard.</h3>
						<p className={FEAT_P}>For agencies running 6 personas with 4 contributors. Monthly payout CSV exports included.</p>
						<div className={FEAT_VIS}>
							<div className="absolute inset-3.5 flex flex-col gap-2 text-[12px]">
								{[
									{ av: 'bg-[linear-gradient(135deg,#e6e3dc,#c9c5bb)]', name: 'Lena K.', tag: 'EDITOR' },
									{ av: 'bg-[linear-gradient(135deg,#d8d3e8,#a99fc4)]', name: 'Vikram J.', tag: 'CONTRIBUTOR' },
									{ av: 'bg-[linear-gradient(135deg,#e8e0d3,#c4b69f)]', name: 'Marszal Bot', tag: 'PUBLISHER' },
								].map((r) => (
									<div
										key={r.name}
										className="flex items-center gap-2.5 rounded-md border border-marszal-line2 bg-marszal-surface px-2.5 py-2"
									>
										<span className={`h-[22px] w-[22px] shrink-0 rounded-full ${r.av}`} />
										<span className="font-medium">{r.name}</span>
										<span className="font-marszal-mono ml-auto rounded-sm border border-marszal-line2 bg-marszal-bg px-2 py-0.5 text-[10px] text-marszal-muted">
											{r.tag}
										</span>
									</div>
								))}
								<div className="flex items-center gap-2.5 rounded-md border border-dashed border-marszal-line2 bg-marszal-bg px-2.5 py-2">
									<span className="h-[22px] w-[22px] shrink-0 rounded-full bg-[repeating-linear-gradient(45deg,#e6e3dc_0_4px,transparent_4px_8px)]" />
									<span className="font-medium text-marszal-muted">+ invite contributor</span>
								</div>
							</div>
						</div>
					</article>
				</div>
			</div>
		</section>
	);
}
