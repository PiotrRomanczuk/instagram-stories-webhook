'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { useRouter } from '@/i18n/routing';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { SubmissionStats } from '@/app/components/submissions/submission-stats';
import { SubmissionList } from '@/app/components/submissions/submission-list';
import { EditSubmissionDialog } from '@/app/components/submissions/edit-submission-dialog';
import { ContentItem, SubmissionStatus, PublishingStatus } from '@/lib/types';
import { Link } from '@/i18n/routing';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected' | 'published';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SubmissionsPage() {
	const router = useRouter();
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
				return s.submissionStatus === 'approved';
			case 'rejected':
				return s.submissionStatus === 'rejected';
			case 'published':
				return s.publishingStatus === 'published';
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
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<PageHeader
				title="My Submissions"
				description="Track your submissions and their review status."
				actions={
					<Button asChild>
						<Link href="/submit">
							<Plus className="mr-2 h-4 w-4" />
							New Submission
						</Link>
					</Button>
				}
				className="mb-8"
			/>

			{/* Stats */}
			<SubmissionStats
				pending={stats.pending}
				approved={stats.approved}
				scheduled={stats.scheduled}
				published={stats.published}
				isLoading={isLoading}
			/>

			{/* Filter Tabs */}
			<Tabs
				value={filter}
				onValueChange={(v) => setFilter(v as FilterTab)}
				className="mt-8"
			>
				<TabsList>
					<TabsTrigger value="all">All</TabsTrigger>
					<TabsTrigger value="pending">Pending</TabsTrigger>
					<TabsTrigger value="approved">Approved</TabsTrigger>
					<TabsTrigger value="rejected">Rejected</TabsTrigger>
					<TabsTrigger value="published">Published</TabsTrigger>
				</TabsList>
			</Tabs>

			{/* Submissions List */}
			<div className="mt-6">
				<SubmissionList
					submissions={filteredSubmissions}
					isLoading={isLoading}
					onEdit={handleEdit}
				/>
			</div>

			{/* Edit Dialog */}
			<EditSubmissionDialog
				submission={editingSubmission}
				open={!!editingSubmission}
				onOpenChange={(open) => !open && setEditingSubmission(null)}
				onSave={handleSave}
			/>
		</main>
	);
}
