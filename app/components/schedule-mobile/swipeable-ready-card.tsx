'use client';

/**
 * SwipeableReadyCard - Bidirectional swipe wrapper for ReadyCard
 *
 * Swipe RIGHT → Auto-schedule to next available 30-min slot
 * Swipe LEFT → Reveals Edit + Archive buttons
 * Full swipe (70% width) → Auto-triggers action
 * Select mode → Swipe disabled
 */

import { useRef, useEffect, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { Calendar, Edit2, Archive } from 'lucide-react';
import { ContentItem } from '@/lib/types/posts';
import { ReadyCard } from './ready-card';
import type { SwipeDirection } from '@/app/hooks/use-swipe-manager';

interface SwipeableReadyCardProps {
	item: ContentItem;
	isSelected: boolean;
	selectMode: boolean;
	imageError: boolean;
	onImageError: () => void;
	onClick: () => void;
	onSchedule: (item: ContentItem) => void;
	onEdit: (item: ContentItem) => void;
	onArchive: (item: ContentItem) => void;
	isOpen: boolean;
	openDirection: SwipeDirection | null;
	onOpenChange: (isOpen: boolean, direction: SwipeDirection | null) => void;
	isDismissing: boolean;
	isFirst?: boolean;
}

// Swipe configuration
const RIGHT_BUTTON_WIDTH = 100; // px - Schedule button
const LEFT_BUTTONS_WIDTH = 160; // px - Edit + Archive buttons
const SNAP_THRESHOLD = 50; // px - minimum swipe to reveal buttons
const VELOCITY_THRESHOLD = 0.5; // velocity to snap open
const FULL_SWIPE_RATIO = 0.7; // 70% of card width for auto-trigger
const FULL_SWIPE_VELOCITY = 2; // velocity for instant full swipe
const HAPTIC_THRESHOLD = 50; // ms
const HAPTIC_FULL = 80; // ms

export function SwipeableReadyCard({
	item,
	isSelected,
	selectMode,
	imageError,
	onImageError,
	onClick,
	onSchedule,
	onEdit,
	onArchive,
	isOpen,
	openDirection,
	onOpenChange,
	isDismissing,
	isFirst,
}: SwipeableReadyCardProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const hasFiredHaptic = useRef(false);
	const hasFiredFullHaptic = useRef(false);
	const [cardWidth, setCardWidth] = useState(0);

	const x = useMotionValue(0);
	const springX = useSpring(x, { stiffness: 300, damping: 30 });

	// Measure card width for full-swipe calculation
	useEffect(() => {
		if (containerRef.current) {
			setCardWidth(containerRef.current.offsetWidth);
		}
	}, []);

	// Sync isOpen state with position
	useEffect(() => {
		if (isDismissing) return; // Don't fight dismissal animation
		if (isOpen && openDirection === 'right') {
			x.set(RIGHT_BUTTON_WIDTH);
		} else if (isOpen && openDirection === 'left') {
			x.set(-LEFT_BUTTONS_WIDTH);
		} else if (!isOpen) {
			x.set(0);
			hasFiredHaptic.current = false;
			hasFiredFullHaptic.current = false;
		}
	}, [isOpen, openDirection, x, isDismissing]);

	const fullSwipeThreshold = cardWidth * FULL_SWIPE_RATIO;

	const bind = useGesture(
		{
			onDrag: ({ movement: [mx], velocity: [vx], down, cancel, direction: [dx] }) => {
				// Disable swipe in select mode
				if (selectMode) {
					cancel();
					return;
				}

				if (down) {
					// Clamp based on direction
					let clampedX: number;
					if (mx > 0) {
						// Right swipe - reveal schedule
						clampedX = Math.min(RIGHT_BUTTON_WIDTH * 1.2, mx); // slight rubber band
					} else {
						// Left swipe - reveal edit/archive
						clampedX = Math.max(-LEFT_BUTTONS_WIDTH * 1.2, mx);
					}
					x.set(clampedX);

					const absMx = Math.abs(clampedX);

					// Haptic at threshold
					if (
						!hasFiredHaptic.current &&
						absMx >= SNAP_THRESHOLD &&
						typeof navigator !== 'undefined' &&
						navigator.vibrate
					) {
						navigator.vibrate(HAPTIC_THRESHOLD);
						hasFiredHaptic.current = true;
					}

					// Haptic at full-swipe threshold
					if (
						!hasFiredFullHaptic.current &&
						fullSwipeThreshold > 0 &&
						absMx >= fullSwipeThreshold &&
						typeof navigator !== 'undefined' &&
						navigator.vibrate
					) {
						navigator.vibrate(HAPTIC_FULL);
						hasFiredFullHaptic.current = true;
					}
				} else {
					// Release
					const absMx = Math.abs(mx);
					const absVx = Math.abs(vx);
					const isRightSwipe = mx > 0;

					// Full swipe detection
					if (
						fullSwipeThreshold > 0 &&
						(absMx >= fullSwipeThreshold || absVx > FULL_SWIPE_VELOCITY)
					) {
						const offscreenX = isRightSwipe ? cardWidth + 100 : -(cardWidth + 100);
						x.set(offscreenX);
						if (isRightSwipe) {
							onSchedule(item);
						} else {
							onArchive(item);
						}
						return;
					}

					// Partial swipe - snap to buttons or back
					const shouldOpen = absMx > SNAP_THRESHOLD || absVx > VELOCITY_THRESHOLD;

					if (shouldOpen) {
						if (isRightSwipe) {
							x.set(RIGHT_BUTTON_WIDTH);
							onOpenChange(true, 'right');
						} else {
							x.set(-LEFT_BUTTONS_WIDTH);
							onOpenChange(true, 'left');
						}
					} else {
						x.set(0);
						onOpenChange(false, null);
						hasFiredHaptic.current = false;
						hasFiredFullHaptic.current = false;
					}
				}
			},
		},
		{
			drag: {
				axis: 'x',
				filterTaps: true,
				threshold: 5,
			},
		},
	);

	// Close on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				isOpen &&
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				x.set(0);
				onOpenChange(false, null);
				hasFiredHaptic.current = false;
				hasFiredFullHaptic.current = false;
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isOpen, x, onOpenChange]);

	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		x.set(0);
		onOpenChange(false, null);
		onEdit(item);
	};

	const handleArchive = (e: React.MouseEvent) => {
		e.stopPropagation();
		onArchive(item);
	};

	const handleSchedule = (e: React.MouseEvent) => {
		e.stopPropagation();
		onSchedule(item);
	};

	const shouldPeek = isFirst && !selectMode;

	return (
		<motion.div
			layout
			initial={shouldPeek ? { opacity: 1, height: 'auto', x: 40 } : { opacity: 1, height: 'auto' }}
			animate={{ opacity: 1, height: 'auto', x: 0 }}
			exit={{ opacity: 0, height: 0, marginBottom: 0 }}
			transition={shouldPeek
				? { duration: 0.6, ease: 'easeOut', delay: 0.5, x: { duration: 0.6, ease: 'easeOut', delay: 0.5 } }
				: { duration: 0.3, ease: 'easeInOut' }
			}
			className="relative mb-3 px-4"
		>
			<div
				ref={containerRef}
				className="relative overflow-hidden rounded-xl touch-pan-y"
			>
				{/* LEFT action layer (revealed on RIGHT swipe) — Schedule */}
				<div
					className="absolute left-0 top-0 bottom-0 flex items-center"
					style={{ width: `${RIGHT_BUTTON_WIDTH}px` }}
				>
					<button
						onClick={handleSchedule}
						className="flex h-full w-full flex-col items-center justify-center gap-1 bg-emerald-500 transition-colors hover:bg-emerald-400 active:bg-emerald-600"
						aria-label="Schedule post"
					>
						<Calendar className="h-5 w-5 text-white" />
						<span className="text-[10px] font-semibold uppercase tracking-wide text-white">
							Schedule
						</span>
					</button>
				</div>

				{/* RIGHT action layer (revealed on LEFT swipe) — Edit + Archive */}
				<div
					className="absolute right-0 top-0 bottom-0 flex items-center"
					style={{ width: `${LEFT_BUTTONS_WIDTH}px` }}
				>
					<button
						onClick={handleEdit}
						className="flex h-full flex-1 flex-col items-center justify-center gap-1 bg-blue-600 transition-colors hover:bg-blue-500 active:bg-blue-700"
						aria-label="Edit post"
					>
						<Edit2 className="h-4 w-4 text-white" />
						<span className="text-[10px] font-semibold uppercase tracking-wide text-white">
							Edit
						</span>
					</button>
					<button
						onClick={handleArchive}
						className="flex h-full flex-1 flex-col items-center justify-center gap-1 bg-red-600 transition-colors hover:bg-red-500 active:bg-red-700"
						aria-label="Archive post"
					>
						<Archive className="h-4 w-4 text-white" />
						<span className="text-[10px] font-semibold uppercase tracking-wide text-white">
							Archive
						</span>
					</button>
				</div>

				{/* Sliding card */}
				<motion.div
					{...(bind() as Record<string, unknown>)}
					style={{ x: springX }}
					className="relative"
				>
					<ReadyCard
						item={item}
						isSelected={isSelected}
						selectMode={selectMode}
						imageError={imageError}
						onImageError={onImageError}
						onClick={onClick}
					/>
				</motion.div>
			</div>
		</motion.div>
	);
}
