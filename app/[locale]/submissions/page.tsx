'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { SubmissionStats } from '@/app/components/submissions/submission-stats';
import { SubmissionList } from '@/app/components/submissions/submission-list';
import { EditSubmissionDialog } from '@/app/components/submissions/edit-submission-dialog';
import { ContentItem } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'pending' | 'approved' | 'scheduled' | 'archived';

const TABS: { value: FilterTab; label: string }[] = [
	{ value: 'all', label: 'All Submissions' },
	{ value: 'pending', label: 'Pending Review' },
	{ value: 'approved', label: 'Ready for Sync' },
	{ value: 'scheduled', label: 'Scheduled' },
	{ value: 'archived', label: 'Archived' },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SubmissionsPage() {
	const [filter, setFilter] = useState<FilterTab>('all');
	const [editingSubmission, setEditingSubmission] = useState<ContentItem | null>(null);

	const { data, error, isLoading, mutate } = useSWR<{ items: ContentItem[] }>(
		'/api/content?source=submission',
		fetcher
	);

	const submissions = data?.items || [];

	// Calculate stats
	const stats = {
		pending: submissions.filter((s) => s.submissionStatus === 'pending').length,
		approved: submissions.filter(
			(s) => s.submissionStatus === 'approved' && s.publishingStatus === 'draft'
		).length,
		scheduled: submissions.filter((s) => s.publishingStatus === 'scheduled').length,
		published: submissions.filter((s) => s.publishingStatus === 'published').length,
	};

	// Filter submissions based on selected tab
	const filteredSubmissions = submissions.filter((s) => {
		switch (filter) {
			case 'pending':
				return s.submissionStatus === 'pending';
			case 'approved':
				return s.submissionStatus === 'approved' && s.publishingStatus === 'draft';
			case 'scheduled':
				return s.publishingStatus === 'scheduled';
			case 'archived':
				return s.submissionStatus === 'rejected' || s.publishingStatus === 'published';
			default:
				return true;
		}
	});

	const handleEdit = useCallback((submission: ContentItem) => {
		setEditingSubmission(submission);
	}, []);

	const handleSave = useCallback(
		async (submission: ContentItem, caption: string) => {
			const response = await fetch(`/api/content/${submission.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ caption }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to update');
			}

			mutate();
		},
		[mutate]
	);

	return (
		<main className="min-h-screen bg-[var(--sf-bg-dark)]">
			<div className="max-w-[1200px] mx-auto px-4 lg:px-10 py-8">
				{/* Page Header */}
				<div className="flex flex-wrap justify-between items-end gap-3 mb-8">
					<div className="flex flex-col gap-2">
						<h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">
							My Submissions
						</h1>
						<p className="text-[var(--sf-text-secondary)] text-base font-normal leading-normal">
							Manage and track your Instagram story content workflow
						</p>
					</div>
					<Button
						asChild
						className="bg-[var(--sf-primary)] hover:bg-[var(--sf-primary-hover)] text-white"
					>
						<Link href="/submit">
							<Plus className="mr-2 h-4 w-4" />
							New Submission
						</Link>
					</Button>
				</div>

				{/* Stats Cards */}
				<div className="mb-10">
					<SubmissionStats
						pending={stats.pending}
						approved={stats.approved}
						scheduled={stats.scheduled}
						published={stats.published}
						isLoading={isLoading}
					/>
				</div>

				{/* Tab Filters */}
				<div className="mb-6 border-b border-[var(--sf-border-dark)]">
					<div className="flex gap-8 px-2 overflow-x-auto no-scrollbar">
						{TABS.map((tab) => (
							<button
								key={tab.value}
								onClick={() => setFilter(tab.value)}
								className={cn(
									'flex flex-col items-center justify-center pb-3 pt-2 transition-colors whitespace-nowrap',
									'border-b-2',
									filter === tab.value
										? 'border-[var(--sf-primary)] text-white'
										: 'border-transparent text-[var(--sf-text-secondary)] hover:text-white'
								)}
							>
								<span className="text-sm font-bold leading-normal tracking-[0.015em]">
									{tab.label}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Submissions List */}
				<SubmissionList
					submissions={filteredSubmissions}
					isLoading={isLoading}
					onEdit={handleEdit}
				/>

				{/* Load More Button */}
				{filteredSubmissions.length > 0 && (
					<div className="mt-12 flex justify-center">
						<Button
							variant="outline"
							className="px-8 py-3 rounded-xl bg-[var(--sf-card-dark)] border-[var(--sf-border-dark)] text-[var(--sf-text-secondary)] font-bold text-sm hover:text-white hover:border-[var(--sf-primary)] transition-all"
						>
							Load More Submissions
						</Button>
					</div>
				)}

				{/* Edit Dialog */}
				<EditSubmissionDialog
					submission={editingSubmission}
					open={!!editingSubmission}
					onOpenChange={(open) => !open && setEditingSubmission(null)}
					onSave={handleSave}
				/>
			</div>
		</main>
	);
}
