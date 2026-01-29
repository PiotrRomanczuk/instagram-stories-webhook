'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import {
	LayoutGrid,
	List,
	Plus,
	ChevronLeft,
	ChevronRight,
	CheckSquare,
	Square,
	CheckCircle,
	XCircle,
	Calendar,
	Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { MemeSubmission, UserRole } from '@/lib/types/posts';
import { MemeSubmitForm } from './meme-submit-form';
import { MemeList } from './meme-list';
import { MemeListView } from './meme-list-view';
import { MemeSearchFilter } from './meme-search-filter';
import { MemeEditModal } from './meme-edit-modal';
import { MemeQueueBuilder } from './meme-queue-builder';
import { useUserMemes } from './use-user-memes';
import { logError } from '@/lib/actions/log';

type ViewMode = 'card' | 'list';
type TabMode = 'memes' | 'queue';

export function MemesDashboard() {
	const { data: session } = useSession();
	const searchParams = useSearchParams();
	const userRole = (session?.user as { role?: UserRole })?.role;
	const isAdmin = userRole === 'admin' || userRole === 'developer';

	// View mode state with URL param support
	const [viewMode, setViewMode] = useState<ViewMode>(
		(searchParams.get('view') as ViewMode) || 'card',
	);
	const [activeTab, setActiveTab] = useState<TabMode>('memes');
	const [showForm, setShowForm] = useState(false);
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState('');
	const [page, setPage] = useState(1);
	const [editingMeme, setEditingMeme] = useState<MemeSubmission | null>(null);

	// Admin-only features
	const [selectedMemes, setSelectedMemes] = useState<Set<string>>(new Set());
	const [bulkRejectionModalOpen, setBulkRejectionModalOpen] = useState(false);
	const [bulkRejectionReason, setBulkRejectionReason] = useState('');
	const [bulkScheduleModalOpen, setBulkScheduleModalOpen] = useState(false);
	const [bulkScheduleDate, setBulkScheduleDate] = useState('');

	const { memes, pagination, isLoading, refresh } = useUserMemes({
		search,
		status,
		page,
		limit: 12,
	});

	// Update URL when view mode changes
	useEffect(() => {
		const url = new URL(window.location.href);
		url.searchParams.set('view', viewMode);
		window.history.replaceState({}, '', url.toString());
	}, [viewMode]);

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
			logError('memes-dashboard:edit', message, error);
		}
	};

	const handleDeleteMeme = async (id: string) => {
		if (!confirm('Are you sure you want to delete this meme submission?'))
			return;

		try {
			const response = await fetch(`/api/memes/${id}`, {
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
			logError('memes-dashboard:delete', message, error);
		}
	};

	// Admin-only handlers
	const toggleMemeSelection = (id: string) => {
		setSelectedMemes((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	};

	const toggleSelectAll = () => {
		if (selectedMemes.size === memes.length) {
			setSelectedMemes(new Set());
		} else {
			setSelectedMemes(new Set(memes.map((m) => m.id!)));
		}
	};

	const clearSelection = () => {
		setSelectedMemes(new Set());
	};

	const handleAction = async (
		id: string,
		action: 'approve' | 'reject' | 'schedule',
		data?: { rejectionReason?: string; scheduledFor?: string },
	) => {
		try {
			const res = await fetch(`/api/memes/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, ...data }),
			});
			const result = await res.json();
			if (!res.ok) {
				const errorMsg = result.details
					? `${result.error}: ${result.details}`
					: result.error;
				throw new Error(errorMsg);
			}

			toast.success(`Meme ${action}ed successfully`);
			refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : `Failed to ${action}`,
			);
		}
	};

	const handleBulkApprove = async () => {
		if (selectedMemes.size === 0) return;

		const confirmMsg = `Approve ${selectedMemes.size} meme(s)?`;
		if (!confirm(confirmMsg)) return;

		try {
			const res = await fetch('/api/memes/bulk', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ids: Array.from(selectedMemes),
					action: 'approve',
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Bulk approve failed');
			}

			toast.success(`${selectedMemes.size} meme(s) approved`);
			clearSelection();
			refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Bulk approve failed',
			);
		}
	};

	const handleBulkReject = async () => {
		if (selectedMemes.size === 0) return;
		setBulkRejectionModalOpen(true);
	};

	const confirmBulkReject = async () => {
		if (!bulkRejectionReason.trim()) {
			toast.error('Please provide a rejection reason');
			return;
		}

		try {
			const res = await fetch('/api/memes/bulk', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ids: Array.from(selectedMemes),
					action: 'reject',
					rejectionReason: bulkRejectionReason,
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Bulk reject failed');
			}

			toast.success(`${selectedMemes.size} meme(s) rejected`);
			clearSelection();
			setBulkRejectionModalOpen(false);
			setBulkRejectionReason('');
			refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Bulk reject failed',
			);
		}
	};

	return (
		<div className='space-y-12'>
			{/* Header Section with View Toggle */}
			<div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
				<div className='flex items-center gap-4'>
					<div className='p-3 bg-white rounded-2xl shadow-sm border border-slate-100'>
						<LayoutGrid className='w-6 h-6 text-indigo-600' />
					</div>
					<div>
						<h2 className='text-2xl font-black text-slate-900 tracking-tight'>
							{isAdmin ? 'Meme Dashboard' : 'Your Submissions'}
						</h2>
						<p className='text-sm font-medium text-slate-500'>
							{isAdmin
								? 'Review and manage all community submissions'
								: 'Manage and track your community meme contributions.'}
						</p>
					</div>
				</div>

				<div className='flex items-center gap-3'>
					{/* View Mode Toggle */}
					<div className='flex items-center gap-1 p-1 bg-slate-100 rounded-xl'>
						<button
							onClick={() => setViewMode('card')}
							className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
								viewMode === 'card'
									? 'bg-white text-indigo-600 shadow-sm'
									: 'text-slate-500 hover:text-slate-700'
							}`}
						>
							<LayoutGrid className='w-4 h-4' />
							<span className='hidden sm:inline'>Cards</span>
						</button>
						<button
							onClick={() => setViewMode('list')}
							className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
								viewMode === 'list'
									? 'bg-white text-indigo-600 shadow-sm'
									: 'text-slate-500 hover:text-slate-700'
							}`}
						>
							<List className='w-4 h-4' />
							<span className='hidden sm:inline'>List</span>
						</button>
					</div>

					{/* Submit Button */}
					<button
						onClick={() => setShowForm(!showForm)}
						className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg ${
							showForm
								? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
								: 'bg-indigo-600 text-white hover:bg-slate-900 shadow-indigo-100'
						}`}
					>
						{showForm ? (
							'Cancel Submission'
						) : (
							<>
								<Plus className='w-4 h-4' /> Submit New Meme
							</>
						)}
					</button>
				</div>
			</div>

			{/* Admin Tabs */}
			{isAdmin && (
				<div className='flex items-center gap-2 border-b border-slate-200'>
					<button
						onClick={() => setActiveTab('memes')}
						className={`px-6 py-3 font-bold text-sm transition-all relative ${
							activeTab === 'memes'
								? 'text-indigo-600'
								: 'text-slate-500 hover:text-slate-700'
						}`}
					>
						<span className='flex items-center gap-2'>
							<LayoutGrid className='w-4 h-4' />
							All Memes
						</span>
						{activeTab === 'memes' && (
							<div className='absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600' />
						)}
					</button>
					<button
						onClick={() => setActiveTab('queue')}
						className={`px-6 py-3 font-bold text-sm transition-all relative ${
							activeTab === 'queue'
								? 'text-indigo-600'
								: 'text-slate-500 hover:text-slate-700'
						}`}
					>
						<span className='flex items-center gap-2'>
							<Clock className='w-4 h-4' />
							Queue
						</span>
						{activeTab === 'queue' && (
							<div className='absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600' />
						)}
					</button>
				</div>
			)}

			{/* Form Section */}
			{showForm && activeTab === 'memes' && (
				<div className='animate-in fade-in slide-in-from-top-4 duration-500'>
					<MemeSubmitForm onSubmitted={handleSubmissionSuccess} />
				</div>
			)}

			{/* Queue Builder View */}
			{isAdmin && activeTab === 'queue' && (
				<MemeQueueBuilder onRefresh={refresh} />
			)}

			{/* Search & Filter Section */}
			{activeTab === 'memes' && !showForm && memes.length > 0 && (
				<MemeSearchFilter
					query={search}
					status={status}
					onSearchChange={handleSearchChange}
					onStatusChange={handleStatusChange}
				/>
			)}

			{/* Admin Bulk Actions Toolbar */}
			{isAdmin && activeTab === 'memes' && selectedMemes.size > 0 && (
				<div className='mb-6 bg-indigo-600 rounded-2xl p-4 shadow-lg shadow-indigo-500/30 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 fade-in duration-300'>
					<div className='flex items-center gap-3'>
						<CheckSquare className='w-5 h-5 text-white' />
						<span className='text-white font-bold'>
							{selectedMemes.size} meme{selectedMemes.size > 1 ? 's' : ''}{' '}
							selected
						</span>
						<button
							onClick={clearSelection}
							className='text-indigo-200 hover:text-white text-sm font-medium transition'
						>
							Clear
						</button>
					</div>
					<div className='flex items-center gap-2 flex-wrap'>
						<button
							onClick={handleBulkApprove}
							className='px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition flex items-center gap-2'
						>
							<CheckCircle className='w-4 h-4' />
							Approve ({selectedMemes.size})
						</button>
						<button
							onClick={handleBulkReject}
							className='px-4 py-2 bg-rose-500 text-white rounded-lg font-bold text-sm hover:bg-rose-600 transition flex items-center gap-2'
						>
							<XCircle className='w-4 h-4' />
							Reject
						</button>
					</div>
				</div>
			)}

			{/* Select All (Admin only) */}
			{isAdmin && activeTab === 'memes' && memes.length > 0 && !isLoading && (
				<div className='flex items-center gap-3'>
					<button
						onClick={toggleSelectAll}
						className='flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 hover:border-indigo-400 transition text-sm font-medium text-slate-700 hover:text-indigo-600'
					>
						{selectedMemes.size === memes.length ? (
							<CheckSquare className='w-4 h-4' />
						) : (
							<Square className='w-4 h-4' />
						)}
						{selectedMemes.size === memes.length
							? 'Deselect All'
							: 'Select All'}
					</button>
					<span className='text-xs text-slate-400 font-medium'>
						Keyboard: Ctrl+A to select all, Esc to clear
					</span>
				</div>
			)}

			{/* Content Area */}
			{activeTab === 'memes' && (
				<div className='space-y-6'>
					{!showForm && memes.length > 0 && (
						<div className='flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl w-fit text-[10px] font-black uppercase tracking-widest border border-indigo-100/50'>
							<span className='relative flex h-2 w-2'>
								<span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75'></span>
								<span className='relative inline-flex rounded-full h-2 w-2 bg-indigo-500'></span>
							</span>
							Page {page} - {memes.length}{' '}
							{memes.length === 1 ? 'Meme' : 'Memes'} Displayed
						</div>
					)}

					{viewMode === 'card' ? (
						<MemeList
							memes={memes}
							isLoading={isLoading}
							onEdit={handleEditMeme}
							onDelete={handleDeleteMeme}
						/>
					) : (
						<MemeListView
							memes={memes}
							isLoading={isLoading}
							selectedMemes={selectedMemes}
							onToggleSelect={isAdmin ? toggleMemeSelection : undefined}
							onEdit={!isAdmin ? handleEditMeme : undefined}
							onDelete={handleDeleteMeme}
							onAction={isAdmin ? handleAction : undefined}
							isAdmin={isAdmin}
						/>
					)}

					{/* Pagination Controls */}
					{!showForm && memes.length > 0 && (
						<div className='flex items-center justify-center gap-4 mt-8'>
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1 || isLoading}
								className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
							>
								<ChevronLeft className='w-4 h-4' />
								Previous
							</button>

							<div className='text-sm font-medium text-slate-600'>
								Page <span className='font-black text-indigo-600'>{page}</span>
							</div>

							<button
								onClick={() => setPage((p) => p + 1)}
								disabled={!pagination.hasMore || isLoading}
								className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
							>
								Next
								<ChevronRight className='w-4 h-4' />
							</button>
						</div>
					)}
				</div>
			)}

			{/* Edit Modal */}
			{editingMeme && (
				<MemeEditModal
					isOpen={!!editingMeme}
					onClose={() => setEditingMeme(null)}
					meme={editingMeme}
					onSave={handleSaveEdit}
				/>
			)}

			{/* Bulk Rejection Modal */}
			{bulkRejectionModalOpen && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
					<div className='bg-white rounded-3xl shadow-2xl max-w-md w-full p-6'>
						<h3 className='text-2xl font-bold text-slate-900 mb-4'>
							Reject {selectedMemes.size} Meme
							{selectedMemes.size > 1 ? 's' : ''}
						</h3>
						<p className='text-slate-600 mb-4'>
							Please provide a reason for rejecting these memes.
						</p>
						<textarea
							value={bulkRejectionReason}
							onChange={(e) => setBulkRejectionReason(e.target.value)}
							placeholder='Enter rejection reason...'
							className='w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none'
							rows={4}
						/>
						<div className='flex gap-3 mt-6'>
							<button
								onClick={() => {
									setBulkRejectionModalOpen(false);
									setBulkRejectionReason('');
								}}
								className='flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition'
							>
								Cancel
							</button>
							<button
								onClick={confirmBulkReject}
								disabled={!bulkRejectionReason.trim()}
								className='flex-1 px-4 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition disabled:opacity-50 disabled:cursor-not-allowed'
							>
								Reject All
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
