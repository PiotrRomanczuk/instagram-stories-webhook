'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ActionSheetRetryButton({ itemId, onDone }: { itemId: string; onDone: () => void }) {
	const [loading, setLoading] = useState(false);
	const handleRetry = async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/content/${itemId}/retry`, { method: 'POST' });
			if (res.ok) {
				toast.success('Post queued for retry');
				onDone();
			} else {
				const data = await res.json();
				toast.error(data.error || 'Failed to retry');
			}
		} catch {
			toast.error('Failed to retry');
		} finally {
			setLoading(false);
		}
	};
	return (
		<button
			onClick={handleRetry}
			disabled={loading}
			className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 text-sm font-semibold text-orange-600 hover:bg-orange-100 transition active:scale-[0.98] min-h-[48px] disabled:opacity-50"
		>
			{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
			Retry Post
		</button>
	);
}

export function ActionSheetDeleteButton({ itemId, onDone }: { itemId: string; onDone: () => void }) {
	const [loading, setLoading] = useState(false);
	const handleDelete = async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/content/${itemId}`, { method: 'DELETE' });
			if (res.ok) {
				toast.success('Post deleted');
				onDone();
			} else {
				const data = await res.json();
				toast.error(data.error || 'Failed to delete');
			}
		} catch {
			toast.error('Failed to delete');
		} finally {
			setLoading(false);
		}
	};
	return (
		<button
			onClick={handleDelete}
			disabled={loading}
			className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 text-sm font-semibold text-red-600 hover:bg-red-50 transition active:scale-[0.98] min-h-[48px] disabled:opacity-50"
		>
			{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
			Delete Post
		</button>
	);
}
