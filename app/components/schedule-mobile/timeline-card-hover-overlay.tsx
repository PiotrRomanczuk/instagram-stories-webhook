'use client';

import { motion } from 'framer-motion';
import { Pencil, Clock, Trash2 } from 'lucide-react';

interface TimelineCardHoverOverlayProps {
	onEdit: (e: React.MouseEvent) => void;
	onReschedule: (e: React.MouseEvent) => void;
	onCancel: (e: React.MouseEvent) => void;
}

export function TimelineCardHoverOverlay({
	onEdit,
	onReschedule,
	onCancel,
}: TimelineCardHoverOverlayProps) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
			className="absolute inset-0 z-10 bg-black/70 rounded-xl flex items-center justify-center gap-4"
			style={{
				willChange: 'opacity',
			}}
			onClick={(e) => {
				// Prevent click from bubbling to card
				e.stopPropagation();
			}}
		>
			{/* Edit Button */}
			<button
				data-testid="hover-edit-btn"
				onClick={onEdit}
				className="group/btn w-11 h-11 rounded-lg bg-transparent hover:bg-[#2b6cee] transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#2b6cee] focus:ring-offset-2 focus:ring-offset-[#1a1f2e]"
				aria-label="Edit post"
			>
				<Pencil className="w-5 h-5 text-white" />
			</button>

			{/* Reschedule Button */}
			<button
				data-testid="hover-reschedule-btn"
				onClick={onReschedule}
				className="group/btn w-11 h-11 rounded-lg bg-transparent hover:bg-[#f59e0b] transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#f59e0b] focus:ring-offset-2 focus:ring-offset-[#1a1f2e]"
				aria-label="Reschedule post"
			>
				<Clock className="w-5 h-5 text-white" />
			</button>

			{/* Cancel Button */}
			<button
				data-testid="hover-cancel-btn"
				onClick={onCancel}
				className="group/btn w-11 h-11 rounded-lg bg-transparent hover:bg-[#ef4444] transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:ring-offset-2 focus:ring-offset-[#1a1f2e]"
				aria-label="Cancel post"
			>
				<Trash2 className="w-5 h-5 text-white" />
			</button>
		</motion.div>
	);
}
