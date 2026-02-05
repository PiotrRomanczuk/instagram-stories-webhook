'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Search, UserPlus, Filter } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/app/components/ui/select';
import { UserRole, AllowedUser } from '@/lib/types';
import { useUsers } from '@/app/hooks/use-users';
import { UsersTable } from './users-table';
import { AddUserModal } from './add-user-modal';
import { EditUserModal } from './edit-user-modal';
import { ConfirmDeleteModal } from './confirm-delete-modal';
import { useDebounce } from '@/app/hooks/use-debounce';

export function UsersManagementLayout() {
	const { data: session } = useSession();
	const [searchQuery, setSearchQuery] = useState('');
	const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

	// Debounce search for performance
	const debouncedSearch = useDebounce(searchQuery, 300);

	// Fetch users with filters
	const {
		users,
		allUsers,
		isLoading,
		error,
		addUser,
		updateUserRole,
		deleteUser,
	} = useUsers({
		search: debouncedSearch,
		roleFilter,
	});

	// Modal states
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<AllowedUser | null>(null);

	// Get current user's email
	const currentUserEmail = session?.user?.email || '';

	// Stats for header
	const stats = useMemo(() => {
		const developerCount = allUsers.filter((u) => u.role === 'developer').length;
		const adminCount = allUsers.filter((u) => u.role === 'admin').length;
		const userCount = allUsers.filter((u) => u.role === 'user').length;

		return {
			total: allUsers.length,
			developer: developerCount,
			admin: adminCount,
			user: userCount,
		};
	}, [allUsers]);

	// Handlers
	const handleAddUser = () => {
		setIsAddModalOpen(true);
	};

	const handleEditRole = (user: AllowedUser) => {
		setSelectedUser(user);
		setIsEditModalOpen(true);
	};

	const handleRemoveUser = (user: AllowedUser) => {
		setSelectedUser(user);
		setIsDeleteModalOpen(true);
	};

	// Convert email string to AllowedUser for handlers
	const handleChangeRole = (email: string, newRole: UserRole) => {
		const user = allUsers.find((u) => u.email === email);
		if (user) {
			handleEditRole(user);
		}
	};

	const handleRemove = (email: string) => {
		const user = allUsers.find((u) => u.email === email);
		if (user) {
			handleRemoveUser(user);
		}
	};

	return (
		<>
			<div className="flex min-h-[calc(100vh-8rem)] flex-col space-y-6">
				{/* Page Header */}
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-col gap-1">
						<h2 className="text-3xl font-bold tracking-tight">
							User Whitelist Management
						</h2>
						<p className="text-base text-muted-foreground">
							Manage user access and roles for the application.
						</p>
					</div>
					<Button onClick={handleAddUser} className="gap-2">
						<UserPlus className="h-4 w-4" />
						Add User
					</Button>
				</div>

				{/* Stats Cards */}
				<div className="grid gap-4 md:grid-cols-4">
					<div className="rounded-lg border bg-card p-4">
						<div className="text-sm font-medium text-muted-foreground">
							Total Users
						</div>
						<div className="mt-2 text-2xl font-bold">{stats.total}</div>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<div className="text-sm font-medium text-muted-foreground">
							Developers
						</div>
						<div className="mt-2 text-2xl font-bold text-purple-600">
							{stats.developer}
						</div>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<div className="text-sm font-medium text-muted-foreground">
							Admins
						</div>
						<div className="mt-2 text-2xl font-bold text-blue-600">
							{stats.admin}
						</div>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<div className="text-sm font-medium text-muted-foreground">
							Users
						</div>
						<div className="mt-2 text-2xl font-bold text-gray-600">
							{stats.user}
						</div>
					</div>
				</div>

				{/* Search and Filter */}
				<div className="flex flex-col gap-4 sm:flex-row">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search by email or name..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select
						value={roleFilter}
						onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}
					>
						<SelectTrigger className="w-full sm:w-[200px]">
							<Filter className="mr-2 h-4 w-4" />
							<SelectValue placeholder="Filter by role" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Roles</SelectItem>
							<SelectItem value="developer">Developer</SelectItem>
							<SelectItem value="admin">Admin</SelectItem>
							<SelectItem value="user">User</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Error Display */}
				{error && (
					<div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
						{error}
					</div>
				)}

				{/* Users Table */}
				<UsersTable
					users={users}
					isLoading={isLoading}
					currentUserEmail={currentUserEmail}
					onChangeRole={handleChangeRole}
					onRemove={handleRemove}
				/>
			</div>

			{/* Modals */}
			<AddUserModal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				onAddUser={addUser}
			/>

			<EditUserModal
				isOpen={isEditModalOpen}
				onClose={() => {
					setIsEditModalOpen(false);
					setSelectedUser(null);
				}}
				user={selectedUser}
				allUsers={allUsers}
				onUpdateRole={updateUserRole}
			/>

			<ConfirmDeleteModal
				isOpen={isDeleteModalOpen}
				onClose={() => {
					setIsDeleteModalOpen(false);
					setSelectedUser(null);
				}}
				user={selectedUser}
				onDeleteUser={deleteUser}
			/>
		</>
	);
}
