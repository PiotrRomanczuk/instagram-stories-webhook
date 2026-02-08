'use client';

import { MemeSubmitForm } from './meme-submit-form';
import { MemeList } from './meme-list';
import { MemeSearchFilter } from './meme-search-filter';
import { MemeEditModal } from './meme-edit-modal';
import { useUserMemes } from './use-user-memes';
import { LayoutGrid, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { MemeSubmission } from '@/lib/types';
import { logError } from '@/lib/actions/log';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

export function MemeManager() {
	const [showForm, setShowForm] = useState(false);
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('');
	const [page, setPage] = useState(1);
	const [editingMeme, setEditingMeme] = useState<MemeSubmission | null>(null);
	const [deletingMemeId, setDeletingMemeId] = useState<string | null>(null);

	const { memes, pagination, isLoading, refresh } = useUserMemes({
		search,
		status,
		page,
		limit: 12,
	});

	const handleSubmissionSuccess = () => {
		setPage(1);
		refresh();
		setShowForm(false);
	};

	const handleSearchChange = (query: string) => {
		setSearch(query);
		setPage(1);
	};

	const handleStatusChange = (newStatus: string) => {
		setStatus(newStatus);
		setPage(1);
	};

	const handleEditMeme = (meme: MemeSubmission) => {
		setEditingMeme(meme);
	};

	const handleSaveEdit = async (updates: {
		title?: string;
		caption?: string;
		version?: number;
	}) => {
		if (!editingMeme) return;

		try {
			const response = await fetch(`/api/memes/${editingMeme.id}/edit`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				const error = await response.json();

				if (response.status === 409 || error.code === 'CONFLICT') {
					toast.error(
						'This meme was modified in another tab or session. Please refresh to see the latest version.',
						{ duration: 5000 },
					);
					setEditingMeme(null);
					refresh();
					return;
				}

				throw new Error(error.error || 'Failed to update meme');
			}

			toast.success('Meme updated successfully');
			setEditingMeme(null);
			refresh();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Failed to update meme';
			toast.error(message);
			logError('meme-manager:edit', message, error);
		}
	};

	const handleDeleteMeme = async (id: string) => {
		setDeletingMemeId(id);
	};

	const confirmDeleteMeme = async () => {
		if (!deletingMemeId) return;

		try {
			const response = await fetch(`/api/memes/${deletingMemeId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete meme');
			}

			toast.success('Meme deleted successfully');
			refresh();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Failed to delete meme';
			toast.error(message);
			logError('meme-manager:delete', message, error);
		} finally {
			setDeletingMemeId(null);
		}
	};

	return (
		<div className='space-y-12'>
			{/* Header Section with Toggle */}
			<div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
				<div className='flex items-center gap-4'>
					<div className='p-3 bg-white rounded-2xl shadow-sm border border-slate-100'>
						<LayoutGrid className='w-6 h-6 text-indigo-600' />
					</div>
					<div>
						<h2 className='text-2xl font-black text-slate-900 tracking-tight'>
							Your Submissions
						</h2>
						<p className='text-sm font-medium text-slate-500'>
							Manage and track your community meme contributions.
						</p>
					</div>
				</div>

				<Button
					onClick={() => setShowForm(!showForm)}
					variant={showForm ? 'secondary' : 'default'}
					className={`rounded-2xl font-black text-xs uppercase tracking-widest ${
						showForm
							? ''
							: 'bg-indigo-600 hover:bg-slate-900 shadow-lg shadow-indigo-100'
					}`}
				>
					{showForm ? (
						'Cancel Submission'
					) : (
						<>
							<Plus className='w-4 h-4' /> Submit New Meme
						</>
					)}
				</Button>
			</div>

			{/* Form Section */}
			{showForm && (
				<div className='animate-in fade-in slide-in-from-top-4 duration-500'>
					<MemeSubmitForm onSubmitted={handleSubmissionSuccess} />
				</div>
			)}

			{/* Search & Filter Section */}
			{!showForm && memes.length > 0 && (
				<MemeSearchFilter
					query={search}
					status={status}
					onSearchChange={handleSearchChange}
					onStatusChange={handleStatusChange}
				/>
			)}

			{/* List Section */}
			<div className='space-y-6'>
				{!showForm && memes.length > 0 && (
					<div className='flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl w-fit text-[10px] font-black uppercase tracking-widest border border-indigo-100/50'>
						<span className='relative flex h-2 w-2'>
							<span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75'></span>
							<span className='relative inline-flex rounded-full h-2 w-2 bg-indigo-500'></span>
						</span>
						Page {page} - {memes.length} {memes.length === 1 ? 'Meme' : 'Memes'}{' '}
						Displayed
					</div>
				)}
				<MemeList
					memes={memes}
					isLoading={isLoading}
					onEdit={handleEditMeme}
					onDelete={handleDeleteMeme}
				/>

				{/* Pagination Controls */}
				{!showForm && memes.length > 0 && (
					<div className='flex items-center justify-center gap-4 mt-8'>
						<Button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1 || isLoading}
							variant='outline'
						>
							<ChevronLeft className='w-4 h-4' />
							Previous
						</Button>

						<div className='text-sm font-medium text-slate-600'>
							Page <span className='font-black text-indigo-600'>{page}</span>
						</div>

						<Button
							onClick={() => setPage((p) => p + 1)}
							disabled={!pagination.hasMore || isLoading}
						>
							Next
							<ChevronRight className='w-4 h-4' />
						</Button>
					</div>
				)}
			</div>

			{/* Edit Modal */}
			{editingMeme && (
				<MemeEditModal
					isOpen={!!editingMeme}
					onClose={() => setEditingMeme(null)}
					meme={editingMeme}
					onSave={handleSaveEdit}
				/>
			)}

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={!!deletingMemeId} onOpenChange={(open) => { if (!open) setDeletingMemeId(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Meme Submission</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this meme submission? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDeleteMeme} className="bg-red-600 hover:bg-red-700">
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
