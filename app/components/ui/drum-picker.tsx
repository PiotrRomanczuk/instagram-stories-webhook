'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface DrumPickerProps {
	items: string[];
	selectedIndex: number;
	onSelect: (index: number) => void;
	itemHeight?: number;
	visibleItems?: number;
	className?: string;
	label?: string;
}

export function DrumPicker({
	items,
	selectedIndex,
	onSelect,
	itemHeight = 44,
	visibleItems = 5,
	className,
	label,
}: DrumPickerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const isScrollingRef = useRef(false);
	const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const [isInteracting, setIsInteracting] = useState(false);

	const containerHeight = itemHeight * visibleItems;
	const paddingItems = Math.floor(visibleItems / 2);

	// Scroll to selected index
	const scrollToIndex = useCallback(
		(index: number, behavior: ScrollBehavior = 'smooth') => {
			if (!containerRef.current) return;
			const scrollTop = index * itemHeight;
			containerRef.current.scrollTo({ top: scrollTop, behavior });
		},
		[itemHeight]
	);

	// Initial scroll position
	useEffect(() => {
		scrollToIndex(selectedIndex, 'instant');
	}, [selectedIndex, scrollToIndex]);

	// Handle scroll end - snap to nearest item
	const handleScroll = useCallback(() => {
		if (!containerRef.current) return;

		if (scrollTimeoutRef.current) {
			clearTimeout(scrollTimeoutRef.current);
		}

		isScrollingRef.current = true;

		scrollTimeoutRef.current = setTimeout(() => {
			if (!containerRef.current) return;
			const scrollTop = containerRef.current.scrollTop;
			const nearestIndex = Math.round(scrollTop / itemHeight);
			const clampedIndex = Math.max(0, Math.min(nearestIndex, items.length - 1));

			if (clampedIndex !== selectedIndex) {
				onSelect(clampedIndex);
			}
			scrollToIndex(clampedIndex);
			isScrollingRef.current = false;
			setIsInteracting(false);
		}, 100);
	}, [itemHeight, items.length, selectedIndex, onSelect, scrollToIndex]);

	return (
		<div className={cn('flex flex-col items-center', className)}>
			{label && (
				<span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
					{label}
				</span>
			)}
			<div
				className="relative overflow-hidden rounded-xl"
				style={{ height: containerHeight }}
			>
				{/* Selection indicator */}
				<div
					className="pointer-events-none absolute left-0 right-0 z-10 rounded-lg border border-[#2b6cee]/30 bg-[#2b6cee]/5"
					style={{
						top: paddingItems * itemHeight,
						height: itemHeight,
					}}
				/>

				{/* Fade masks */}
				<div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-white" />
				<div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-12 bg-gradient-to-t from-white" />

				{/* Scrollable list */}
				<div
					ref={containerRef}
					onScroll={handleScroll}
					onTouchStart={() => setIsInteracting(true)}
					onMouseDown={() => setIsInteracting(true)}
					className="h-full snap-y snap-mandatory overflow-y-auto scrollbar-none"
					style={{
						scrollSnapType: 'y mandatory',
						WebkitOverflowScrolling: 'touch',
					}}
				>
					{/* Top padding */}
					<div style={{ height: paddingItems * itemHeight }} />

					{items.map((item, index) => {
						const distance = Math.abs(index - selectedIndex);
						const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25;
						const scale = distance === 0 ? 1 : distance === 1 ? 0.9 : 0.85;

						return (
							<div
								key={`${item}-${index}`}
								onClick={() => {
									onSelect(index);
									scrollToIndex(index);
								}}
								className="flex cursor-pointer items-center justify-center snap-center select-none transition-all duration-150"
								style={{
									height: itemHeight,
									opacity,
									transform: `scale(${scale})`,
								}}
							>
								<span
									className={cn(
										'text-lg font-bold transition-colors',
										index === selectedIndex
											? 'text-gray-900'
											: 'text-gray-400'
									)}
								>
									{item}
								</span>
							</div>
						);
					})}

					{/* Bottom padding */}
					<div style={{ height: paddingItems * itemHeight }} />
				</div>
			</div>
		</div>
	);
}
