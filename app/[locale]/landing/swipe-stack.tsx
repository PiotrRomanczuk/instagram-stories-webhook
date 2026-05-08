'use client';

import { useEffect, useRef, useState } from 'react';

type Card = { handle: string; meta: string; label: string; bg: string };

const CARDS: Card[] = [
	{ handle: '@nightowl.fm', meta: 'submitted 2m ago', label: '@nightowl.fm · 14s', bg: '#d6d0c5' },
	{ handle: '@meme.dept', meta: 'submitted 11m ago', label: '@meme.dept · 9s', bg: '#c8c1d9' },
	{ handle: '@studio.atlas', meta: 'submitted 22m ago', label: '@studio.atlas · 15s', bg: '#d3c4b8' },
	{ handle: '@hot.takes', meta: 'submitted 31m ago', label: '@hot.takes · 8s', bg: '#b8c4d3' },
	{ handle: '@late.shift', meta: 'submitted 47m ago', label: '@late.shift · 12s', bg: '#c5d3b8' },
];

export function SwipeStack() {
	const stackRef = useRef<HTMLDivElement | null>(null);
	const badgeLeftRef = useRef<HTMLDivElement | null>(null);
	const badgeRightRef = useRef<HTMLDivElement | null>(null);
	const orderRef = useRef<Card[]>([...CARDS]);
	const [, force] = useState(0);
	const animatingRef = useRef(false);

	const renderStack = () => {
		const stack = stackRef.current;
		if (!stack) return;
		stack.innerHTML = '';
		const slice = orderRef.current.slice(0, 3);
		const reversed = [...slice].reverse();
		reversed.forEach((c, i) => {
			const idxFromTop = slice.length - 1 - i;
			const el = document.createElement('div');
			el.className = 'marszal-scard';
			el.innerHTML = `
				<div class="marszal-scard-thumb" data-label="${c.label}" style="--card-bg:${c.bg}; background:
					repeating-linear-gradient(135deg, rgba(0,0,0,0.04) 0 8px, transparent 8px 16px),
					${c.bg};"></div>
				<div class="flex h-14 items-center gap-2.5 border-t border-marszal-line2 bg-marszal-surface px-3 py-2.5">
					<div class="h-[26px] w-[26px] rounded-full bg-[linear-gradient(135deg,#e6e3dc,#c9c5bb)]"></div>
					<div class="flex flex-col gap-0.5">
						<b class="text-[12.5px] font-semibold">${c.handle}</b>
						<span class="font-marszal-mono text-[11px] text-marszal-muted">${c.meta}</span>
					</div>
				</div>`;
			const scale = 1 - idxFromTop * 0.04;
			const ty = idxFromTop * 8;
			const rot = idxFromTop === 0 ? 0 : idxFromTop % 2 === 0 ? -2 : 2;
			el.style.transform = `translate(0, ${ty}px) scale(${scale}) rotate(${rot}deg)`;
			el.style.opacity = String(1 - idxFromTop * 0.18);
			el.style.zIndex = String(10 - idxFromTop);
			el.style.transition = 'transform 380ms cubic-bezier(.2,.8,.2,1), opacity 380ms';
			stack.appendChild(el);
		});
	};

	const animateOut = (direction: 'left' | 'right') => {
		const stack = stackRef.current;
		if (!stack || animatingRef.current) return;
		const front =
			stack.querySelector<HTMLDivElement>('.marszal-scard[style*="z-index: 10"]') ??
			(stack.lastElementChild as HTMLDivElement | null);
		if (!front) return;
		animatingRef.current = true;
		const dx = direction === 'right' ? 360 : -360;
		const rot = direction === 'right' ? 22 : -22;
		const badge = direction === 'right' ? badgeRightRef.current : badgeLeftRef.current;
		if (badge) badge.style.opacity = '1';
		front.style.transition = 'transform 480ms cubic-bezier(.6,.2,.4,1), opacity 480ms';
		front.style.transform = `translate(${dx}px, -20px) rotate(${rot}deg)`;
		front.style.opacity = '0';
		setTimeout(() => {
			if (badgeLeftRef.current) badgeLeftRef.current.style.opacity = '0';
			if (badgeRightRef.current) badgeRightRef.current.style.opacity = '0';
		}, 320);
		setTimeout(() => {
			const next = orderRef.current.shift();
			if (next) orderRef.current.push(next);
			animatingRef.current = false;
			renderStack();
			force((n) => n + 1);
		}, 480);
	};

	useEffect(() => {
		renderStack();
		let timer: ReturnType<typeof setInterval> | null = null;
		const start = () => {
			if (timer) return;
			timer = setInterval(() => {
				const dir: 'left' | 'right' = Math.random() > 0.35 ? 'right' : 'left';
				animateOut(dir);
			}, 2400);
		};
		const stop = () => {
			if (timer) clearInterval(timer);
			timer = null;
		};
		const target = stackRef.current?.parentElement?.parentElement;
		const io = target
			? new IntersectionObserver(
					(entries) => {
						entries.forEach((e) => (e.isIntersecting ? start() : stop()));
					},
					{ threshold: 0.2 },
				)
			: null;
		if (io && target) io.observe(target);
		const t = setTimeout(start, 800);
		return () => {
			stop();
			clearTimeout(t);
			if (io) io.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<>
			<div className="relative aspect-[9/14] w-[70%] max-w-[280px]" ref={stackRef} />
			<div
				ref={badgeLeftRef}
				className="font-marszal-mono pointer-events-none absolute top-[18px] left-[14px] rotate-[-12deg] rounded-md border-2 border-current px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.06em] text-[#b94a4a] opacity-0 transition-opacity duration-150"
			>
				SKIP
			</div>
			<div
				ref={badgeRightRef}
				className="font-marszal-mono pointer-events-none absolute top-[18px] right-[14px] rotate-[12deg] rounded-md border-2 border-current px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.06em] text-[#2f8a52] opacity-0 transition-opacity duration-150"
			>
				QUEUE
			</div>
		</>
	);
}
