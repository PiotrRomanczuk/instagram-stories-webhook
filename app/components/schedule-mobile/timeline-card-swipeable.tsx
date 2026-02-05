'use client';

/**
 * Swipeable Timeline Card Wrapper
 *
 * Mobile-only component that adds swipe-left gesture to reveal action buttons.
 * Uses @use-gesture/react for touch gestures and framer-motion for animations.
 *
 * Features:
 * - Swipe-left gesture reveals action buttons (Edit, Reschedule, Cancel)
 * - Spring animation on snap-back
 * - Haptic feedback on threshold
 * - Prevents scroll while swiping
 * - Only one card swipeable at a time
 * - Desktop: No swipe wrapper (falls back to hover)
 */

import { useRef, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Edit2, Calendar, X } from 'lucide-react';
import { TimelineCard, TimelineCardPost } from './timeline-card';

interface TimelineCardSwipeableProps {
	post: TimelineCardPost;
	onClick?: (post: TimelineCardPost) => void;
	onEdit?: (post: TimelineCardPost) => void;
	onReschedule?: (post: TimelineCardPost) => void;
	onCancel?: (post: TimelineCardPost) => void;
	isOpen?: boolean;
	onOpenChange?: (isOpen: boolean) => void;
}

// Swipe configuration
const SWIPE_THRESHOLD = 50; // px - minimum swipe to reveal buttons
const BUTTONS_WIDTH = 160; // px - total width of action buttons
const SNAP_DURATION = 0.25; // seconds
const HAPTIC_DURATION = 50; // ms

export function TimelineCardSwipeable({
	post,
	onClick,
	onEdit,
	onReschedule,
	onCancel,
	isOpen = false,
	onOpenChange,
}: TimelineCardSwipeableProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const hasFiredHaptic = useRef(false);

	// Motion value for card translation
	const x = useMotionValue(0);

	// Spring configuration for smooth snap-back
	const springX = useSpring(x, {
		stiffness: 300,
		damping: 30,
	});

	// Check if mobile
	const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

	// Sync isOpen state with x position
	useEffect(() => {
		if (isOpen) {
			x.set(-BUTTONS_WIDTH);
		} else {
			x.set(0);
			hasFiredHaptic.current = false;
		}
	}, [isOpen, x]);

	// Gesture handler
	const bind = useGesture(
		{
			onDrag: ({ movement: [mx], velocity: [vx], down, cancel }) => {
				// Only allow left swipe (negative movement)
				const clampedX = Math.min(0, Math.max(-BUTTONS_WIDTH, mx));

				if (down) {
					// While dragging
					x.set(clampedX);

					// Haptic feedback when threshold reached
					if (
						!hasFiredHaptic.current &&
						Math.abs(clampedX) >= SWIPE_THRESHOLD &&
						typeof navigator !== 'undefined' &&
						navigator.vibrate
					) {
						navigator.vibrate(HAPTIC_DURATION);
						hasFiredHaptic.current = true;
					}

					// Prevent scroll while swiping
					if (Math.abs(mx) > 10) {
						cancel();
					}
				} else {
					// Release - snap to open or closed
					const shouldOpen = Math.abs(clampedX) > SWIPE_THRESHOLD || vx < -0.5;

					if (shouldOpen) {
						x.set(-BUTTONS_WIDTH);
						onOpenChange?.(true);
					} else {
						x.set(0);
						onOpenChange?.(false);
						hasFiredHaptic.current = false;
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
		}
	);

	// Close card when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				isOpen &&
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				x.set(0);
				onOpenChange?.(false);
				hasFiredHaptic.current = false;
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isOpen, x, onOpenChange]);

	// Desktop: No swipe wrapper
	if (!isMobile) {
		return <TimelineCard post={post} onClick={onClick} />;
	}

	// Action button handlers
	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		onEdit?.(post);
		x.set(0);
		onOpenChange?.(false);
	};

	const handleReschedule = (e: React.MouseEvent) => {
		e.stopPropagation();
		onReschedule?.(post);
		x.set(0);
		onOpenChange?.(false);
	};

	const handleCancel = (e: React.MouseEvent) => {
		e.stopPropagation();
		onCancel?.(post);
		x.set(0);
		onOpenChange?.(false);
	};

	return (
		<div
			ref={containerRef}
			className="relative overflow-hidden touch-pan-y"
			data-testid="timeline-card-swipeable"
			data-post-id={post.id}
		>
			{/* Action Buttons (revealed on swipe) */}
			<div
				className="absolute right-0 top-0 bottom-0 flex items-center"
				style={{ width: `${BUTTONS_WIDTH}px` }}
			>
				{onEdit && (
					<button
						onClick={handleEdit}
						className="flex-1 h-full flex flex-col items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors"
						aria-label="Edit post"
					>
						<Edit2 className="w-4 h-4 text-white" />
						<span className="text-[10px] font-semibold text-white uppercase tracking-wide">
							Edit
						</span>
					</button>
				)}
				{onReschedule && (
					<button
						onClick={handleReschedule}
						className="flex-1 h-full flex flex-col items-center justify-center gap-1 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 transition-colors"
						aria-label="Reschedule post"
					>
						<Calendar className="w-4 h-4 text-white" />
						<span className="text-[10px] font-semibold text-white uppercase tracking-wide">
							Reschedule
						</span>
					</button>
				)}
				{onCancel && (
					<button
						onClick={handleCancel}
						className="flex-1 h-full flex flex-col items-center justify-center gap-1 bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors"
						aria-label="Cancel post"
					>
						<X className="w-4 h-4 text-white" />
						<span className="text-[10px] font-semibold text-white uppercase tracking-wide">
							Cancel
						</span>
					</button>
				)}
			</div>

			{/* Card Wrapper */}
			<motion.div
				{...(bind() as any)}
				style={{ x: springX }}
				className="relative z-10"
			>
				<TimelineCard post={post} onClick={onClick} />
			</motion.div>
		</div>
	);
}
