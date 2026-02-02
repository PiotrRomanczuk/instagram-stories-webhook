'use client';

import { useState, useMemo } from 'react';
import { Search, UserPlus, Settings2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { UsersHeader } from './users-header';
import { UsersTabFilter, UserFilterTab } from './users-tab-filter';
import { UsersDataTable, TeamUser, UserRole as TeamUserRole } from './users-data-table';

interface UsersLayoutProps {
	initialUsers?: TeamUser[];
	onAddUser?: () => void;
	onEditUser?: (user: TeamUser) => void;
	onViewProfile?: (user: TeamUser) => void;
	isLoading?: boolean;
}

// Demo data for development
const DEMO_USERS: TeamUser[] = [
	{
		id: '1',
		name: 'Sarah Jenkins',
		email: 'sarah.j@storypro.com',
		role: 'manager',
		workload: { pending: 12, total: 45 },
		performance: 4.9,
		status: 'active',
	},
	{
		id: '2',
		name: 'Michael Chen',
		email: 'm.chen@storypro.com',
		role: 'senior-creator',
		workload: { pending: 28, total: 32 },
		performance: 4.7,
		status: 'active',
	},
	{
		id: '3',
		name: 'Emma Wilson',
		email: 'emma.w@storypro.com',
		role: 'creator',
		workload: { pending: 5, total: 50 },
		performance: 4.2,
		status: 'deactivated',
	},
	{
		id: '4',
		name: 'David Miller',
		email: 'david.m@storypro.com',
		role: 'creator',
		workload: { pending: 15, total: 25 },
		performance: 4.8,
		status: 'active',
	},
];

function mapTabToRole(tab: UserFilterTab): TeamUserRole | null {
	switch (tab) {
		case 'managers':
			return 'manager';
		case 'senior-creators':
			return 'senior-creator';
		case 'creators':
			return 'creator';
		default:
			return null;
	}
}

export function UsersLayout({
	initialUsers = DEMO_USERS,
	onAddUser,
	onEditUser,
	onViewProfile,
	isLoading = false,
}: UsersLayoutProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [activeTab, setActiveTab] = useState<UserFilterTab>('all');

	const filteredUsers = useMemo(() => {
		let users = initialUsers;

		// Filter by role/tab
		const roleFilter = mapTabToRole(activeTab);
		if (roleFilter) {
			users = users.filter((user) => user.role === roleFilter);
		}

		// Filter by search
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			users = users.filter(
				(user) =>
					user.name.toLowerCase().includes(query) ||
					user.email.toLowerCase().includes(query)
			);
		}

		return users;
	}, [initialUsers, activeTab, searchQuery]);

	const counts = useMemo(
		() => ({
			all: initialUsers.length,
			managers: initialUsers.filter((u) => u.role === 'manager').length,
			seniorCreators: initialUsers.filter((u) => u.role === 'senior-creator')
				.length,
			creators: initialUsers.filter((u) => u.role === 'creator').length,
		}),
		[initialUsers]
	);

	const stats = useMemo(() => {
		const activeUsers = initialUsers.filter((u) => u.status === 'active');
		const totalPending = initialUsers.reduce(
			(sum, u) => sum + u.workload.pending,
			0
		);
		const avgPerformance =
			initialUsers.reduce((sum, u) => sum + u.performance, 0) /
			initialUsers.length;

		return {
			totalCreators: initialUsers.length,
			activeStories: totalPending,
			avgPerformance: Math.round(avgPerformance * 10) / 10,
		};
	}, [initialUsers]);

	const totalPages = Math.ceil(filteredUsers.length / 10);
	const [currentPage, setCurrentPage] = useState(1);
	const paginatedUsers = filteredUsers.slice(
		(currentPage - 1) * 10,
		currentPage * 10
	);

	return (
		<div className="flex min-h-[calc(100vh-8rem)] flex-col space-y-6 rounded-xl bg-[#0a0f18] p-8">
			{/* Page header */}
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h2 className="text-3xl font-black tracking-tight text-white">
						Team & User Management
					</h2>
					<p className="text-base text-[#92a4c9]">
						Monitor creator performance, roles, and story workloads.
					</p>
				</div>
				<div className="flex gap-3">
					<Button
						variant="outline"
						className="gap-2 border-[#2a3649] bg-[#2a3649] text-white hover:bg-[#3a4a69] hover:text-white"
					>
						<Settings2 className="h-4 w-4" />
						Global Permissions
					</Button>
					<Button
						onClick={onAddUser}
						className="gap-2 bg-[#2b6cee] shadow-lg shadow-[#2b6cee]/20 hover:bg-[#2b6cee]/90"
					>
						<UserPlus className="h-4 w-4" />
						Add User
					</Button>
				</div>
			</div>

			{/* Stats cards */}
			<UsersHeader
				totalCreators={stats.totalCreators}
				activeStories={stats.activeStories}
				avgPerformance={stats.avgPerformance}
				creatorsChange={2}
				storiesChange={12}
				performanceChange={-1}
			/>

			{/* Tabs and search */}
			<div className="flex flex-col gap-4">
				<UsersTabFilter
					activeTab={activeTab}
					onTabChange={setActiveTab}
					counts={counts}
				/>
				<div className="relative">
					<Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#92a4c9]" />
					<Input
						placeholder="Search by name, email, or role..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-12 border-[#2a3649] bg-[#111722] pl-12 text-white placeholder:text-[#92a4c9] focus-visible:ring-[#2b6cee]/50"
					/>
				</div>
			</div>

			{/* Data table */}
			<UsersDataTable
				users={paginatedUsers}
				isLoading={isLoading}
				onEdit={onEditUser}
				onViewProfile={onViewProfile}
			/>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between rounded-xl border border-[#2a3649] bg-[#1a2333]/30 px-6 py-4">
					<p className="text-xs font-medium text-[#92a4c9]">
						Showing {(currentPage - 1) * 10 + 1} to{' '}
						{Math.min(currentPage * 10, filteredUsers.length)} of{' '}
						{filteredUsers.length} team members
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							className="border-[#2a3649] text-[#92a4c9] hover:bg-[#2a3649] hover:text-white disabled:opacity-50"
						>
							Previous
						</Button>
						{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
							<Button
								key={page}
								variant={page === currentPage ? 'default' : 'outline'}
								size="sm"
								onClick={() => setCurrentPage(page)}
								className={
									page === currentPage
										? 'border-[#2b6cee] bg-[#2b6cee]/10 text-[#2b6cee]'
										: 'border-[#2a3649] text-[#92a4c9] hover:bg-[#2a3649] hover:text-white'
								}
							>
								{page}
							</Button>
						))}
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							className="border-[#2a3649] text-[#92a4c9] hover:bg-[#2a3649] hover:text-white disabled:opacity-50"
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
