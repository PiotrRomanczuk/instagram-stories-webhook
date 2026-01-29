'use client';

import { MemeSubmission } from '@/lib/types';
import { MemeCard } from './meme-card';
import { Loader2, PlusCircle } from 'lucide-react';

interface MemeListProps {
	memes: MemeSubmission[];
	isLoading: boolean;
	onEdit?: (meme: MemeSubmission) => void;
	onDelete?: (id: string) => void;
	onPreview?: (meme: MemeSubmission) => void;
}

export function MemeList({
	memes,
	isLoading,
	onEdit,
	onDelete,
	onPreview,
}: MemeListProps) {
	if (isLoading) {
		return (
			<div className='flex flex-col items-center justify-center py-24 space-y-4'>
				<Loader2 className='w-8 h-8 text-indigo-600 animate-spin' />
				<p className='text-sm font-medium text-slate-500'>
					Loading your submissions...
				</p>
			</div>
		);
	}

	if (memes.length === 0) {
		return (
			<div
				className='bg-white border border-dashed border-slate-200 rounded-[2rem] py-24 flex flex-col items-center justify-center text-center px-6'
				data-testid='empty-state'
			>
				<div className='p-4 bg-slate-50 text-slate-400 rounded-2xl mb-4'>
					<PlusCircle className='w-8 h-8' />
				</div>
				<h3
					className='text-lg font-bold text-slate-900'
					data-testid='empty-state-title'
				>
					No submissions yet
				</h3>
				<p
					className='mt-2 text-sm text-slate-500 max-w-xs'
					data-testid='empty-state-message'
				>
					Your meme submissions will appear here after you upload them.
				</p>
			</div>
		);
	}

	return (
		<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
			{memes.map((meme) => (
				<MemeCard
					key={meme.id}
					meme={meme}
					onEdit={onEdit}
					onDelete={onDelete}
					onPreview={onPreview}
				/>
			))}
		</div>
	);
}
