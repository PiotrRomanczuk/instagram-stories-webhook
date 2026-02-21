'use client';

import { useGesture } from '@use-gesture/react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Check, X, SkipForward, ChevronLeft, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewCardSwipeableProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;   // Reject
    onSwipeRight?: () => void;  // Approve
    onSwipeUp?: () => void;     // Skip
    onSwipeDown?: () => void;   // Expand details
    disabled?: boolean;
}

export function ReviewCardSwipeable({
    children,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    disabled = false,
}: ReviewCardSwipeableProps) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const controls = useAnimation();
    const [activeDirection, setActiveDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);

    // Visual transformations
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const opacityRight = useTransform(x, [50, 150], [0, 1]); // Approve (green)
    const opacityLeft = useTransform(x, [-150, -50], [1, 0]); // Reject (red)
    const opacityUp = useTransform(y, [-150, -50], [1, 0]); // Skip (amber)
    const opacityDown = useTransform(y, [50, 150], [0, 1]); // Expand details (blue)

    const bind = useGesture(
        {
            onDrag: ({ movement: [mx, my], velocity: [vx, vy], down, cancel }) => {
                if (disabled) return;

                if (down) {
                    x.set(mx);
                    y.set(my);

                    // Determine primary direction for visual hints
                    if (Math.abs(mx) > Math.abs(my)) {
                        if (mx > 50) setActiveDirection('right');
                        else if (mx < -50) setActiveDirection('left');
                        else setActiveDirection(null);
                    } else {
                        if (my < -50) setActiveDirection('up');
                        else if (my > 50) setActiveDirection('down');
                        else setActiveDirection(null);
                    }
                } else {
                    setActiveDirection(null);
                    const THRESHOLD = 100;
                    const VELOCITY_THRESHOLD = 0.5;

                    // Determine release action
                    if (Math.abs(mx) > Math.abs(my)) {
                        // Horizontal
                        if ((mx > THRESHOLD || vx > VELOCITY_THRESHOLD) && onSwipeRight) {
                            controls.start({ x: 500, opacity: 0, transition: { duration: 0.2 } }).then(() => {
                                onSwipeRight();
                                // Reset position for next item (handled by key change usually, but good to reset)
                                x.set(0);
                                y.set(0);
                                controls.set({ x: 0, y: 0, opacity: 1 });
                            });
                        } else if ((mx < -THRESHOLD || vx < -VELOCITY_THRESHOLD) && onSwipeLeft) {
                            controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } }).then(() => {
                                onSwipeLeft();
                                x.set(0);
                                y.set(0);
                                controls.set({ x: 0, y: 0, opacity: 1 });
                            });
                        } else {
                            controls.start({ x: 0, y: 0, opacity: 1 });
                        }
                    } else {
                        // Vertical
                        if ((my < -THRESHOLD || vy < -VELOCITY_THRESHOLD) && onSwipeUp) {
                            controls.start({ y: -500, opacity: 0, transition: { duration: 0.2 } }).then(() => {
                                onSwipeUp();
                                x.set(0);
                                y.set(0);
                                controls.set({ x: 0, y: 0, opacity: 1 });
                            });
                        } else if ((my > THRESHOLD || vy > VELOCITY_THRESHOLD) && onSwipeDown) {
                            controls.start({ y: 500, opacity: 0, transition: { duration: 0.2 } }).then(() => {
                                onSwipeDown();
                                x.set(0);
                                y.set(0);
                                controls.set({ x: 0, y: 0, opacity: 1 });
                            });
                        } else {
                            controls.start({ x: 0, y: 0, opacity: 1 });
                        }
                    }
                }
            },
        },
        {
            drag: {
                from: () => [x.get(), y.get()],
                filterTaps: true,
                rubberband: true,
            },
        }
    );

    return (
        <motion.div
            {...(bind() as any)}
            animate={controls}
            style={{ x, y, rotate, touchAction: 'none' }}
            className="relative w-full h-full touch-none select-none"
            data-testid="swipeable-review-card"
        >
            {children}

            {/* Overlay Hints - Tinder Style */}
            {/* Swipe Up = Skip */}
            <motion.div style={{ opacity: opacityUp }} className="absolute inset-x-0 top-10 flex justify-center pointer-events-none z-50">
                <div className="bg-amber-500 text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg flex items-center gap-2 transform -rotate-6 border-4 border-white">
                    <SkipForward className="w-6 h-6" /> SKIP
                </div>
            </motion.div>

            {/* Swipe Right = Approve */}
            <motion.div style={{ opacity: opacityRight }} className="absolute inset-y-0 right-10 flex items-center pointer-events-none z-50">
                <div className="bg-green-500 text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg flex items-center gap-2 transform rotate-12 border-4 border-white">
                    <Check className="w-6 h-6" /> APPROVE
                </div>
            </motion.div>

            {/* Swipe Left = Reject */}
            <motion.div style={{ opacity: opacityLeft }} className="absolute inset-y-0 left-10 flex items-center pointer-events-none z-50">
                <div className="bg-red-500 text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg flex items-center gap-2 transform -rotate-12 border-4 border-white">
                    <X className="w-6 h-6" /> REJECT
                </div>
            </motion.div>

            {/* Swipe Down = Expand Details */}
            <motion.div style={{ opacity: opacityDown }} className="absolute inset-x-0 bottom-20 flex justify-center pointer-events-none z-50">
                <div className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg flex items-center gap-2 transform rotate-6 border-4 border-white">
                    EXPAND DETAILS
                </div>
            </motion.div>
        </motion.div>
    );
}
