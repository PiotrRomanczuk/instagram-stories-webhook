'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

interface ConnectionStatusProps {
	isConnected: boolean;
	className?: string;
}

/**
 * Connection status indicator for real-time updates
 * Shows a small dot with tooltip indicating connection state
 */
export function ConnectionStatus({ isConnected, className = '' }: ConnectionStatusProps) {
	const [state, setState] = useState<ConnectionState>('connecting');
	const [showTooltip, setShowTooltip] = useState(false);

	useEffect(() => {
		if (isConnected) {
			setState('connected');
		} else {
			// Show connecting briefly before disconnected
			setState('connecting');
			const timer = setTimeout(() => {
				if (!isConnected) {
					setState('disconnected');
				}
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [isConnected]);

	const statusConfig = {
		connected: {
			color: 'bg-green-500',
			label: 'Connected',
			description: 'Real-time updates active',
		},
		connecting: {
			color: 'bg-yellow-500',
			label: 'Connecting',
			description: 'Establishing connection...',
		},
		disconnected: {
			color: 'bg-red-500',
			label: 'Disconnected',
			description: 'Reconnecting...',
		},
	};

	const config = statusConfig[state];

	return (
		<div className={`relative inline-block ${className}`}>
			{/* Status Dot */}
			<button
				type="button"
				onMouseEnter={() => setShowTooltip(true)}
				onMouseLeave={() => setShowTooltip(false)}
				onClick={() => setShowTooltip(!showTooltip)}
				className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
				aria-label={`Connection status: ${config.label}`}
			>
				<motion.div
					className={`w-2 h-2 rounded-full ${config.color}`}
					animate={
						state === 'connecting'
							? { scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }
							: { scale: 1, opacity: 1 }
					}
					transition={
						state === 'connecting'
							? { duration: 1.5, repeat: Infinity }
							: { duration: 0 }
					}
				/>
				<span className="text-xs text-slate-300 hidden md:inline">{config.label}</span>
			</button>

			{/* Tooltip */}
			<AnimatePresence>
				{showTooltip && (
					<motion.div
						initial={{ opacity: 0, y: 5 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 5 }}
						transition={{ duration: 0.15 }}
						className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 whitespace-nowrap"
					>
						<div className="text-xs">
							<div className="font-medium text-white mb-0.5">{config.label}</div>
							<div className="text-slate-400">{config.description}</div>
						</div>
						{/* Arrow */}
						<div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
