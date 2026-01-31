'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { UserPlus, AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
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
import { PageHeader } from '@/app/components/layout/page-header';
import { UsersTable } from './users-table';
import { AddUserDialog } from './add-user-dialog';
import { AllowedUser, UserRole } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UsersManagerProps {
	currentUserEmail?: string;
}

export function UsersManager({ currentUserEmail }: UsersManagerProps) {
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [removingEmail, setRemovingEmail] = useState<string | null>(null);
	const [roleChange, setRoleChange] = useState<{ email: string; newRole: UserRole } | null>(null);

	const { data, isLoading, error } = useSWR<{ users: AllowedUser[] }>(
		'/api/users',
		fetcher
	);

	const users = data?.users || [];

	const refreshUsers = useCallback(() => {
		mutate('/api/users');
	}, []);

	const handleAddUser = async (email: string, role: UserRole, displayName?: string) => {
		try {
			const response = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					role,
					display_name: displayName,
				}),
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to add user');
			}

			toast.success(`Added ${email} to whitelist`);
			refreshUsers();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add user');
			throw err;
		}
	};

	const handleChangeRole = async () => {
		if (!roleChange) return;

		try {
			const response = await fetch(`/api/users/${encodeURIComponent(roleChange.email)}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: roleChange.newRole }),
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to update role');
			}

			toast.success(`Updated ${roleChange.email} to ${roleChange.newRole}`);
			refreshUsers();
			setRoleChange(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update role');
		}
	};

	const handleRemoveUser = async () => {
		if (!removingEmail) return;

		try {
			const response = await fetch(`/api/users/${encodeURIComponent(removingEmail)}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to remove user');
			}

			toast.success(`Removed ${removingEmail} from whitelist`);
			refreshUsers();
			setRemovingEmail(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to remove user');
		}
	};

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-12 text-center">
				<AlertTriangle className="h-12 w-12 text-destructive" />
				<h3 className="mt-4 text-lg font-semibold">Failed to load users</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					{error.message || 'An error occurred while fetching users.'}
				</p>
				<Button variant="outline" className="mt-4" onClick={refreshUsers}>
					Try Again
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="User Management"
				description="Manage whitelisted users and their roles."
				badge={
					users.length > 0 ? (
						<Badge variant="secondary">{users.length} users</Badge>
					) : undefined
				}
				actions={
					<Button onClick={() => setIsAddDialogOpen(true)}>
						<UserPlus className="mr-2 h-4 w-4" />
						Add User
					</Button>
				}
			/>

			<UsersTable
				users={users}
				isLoading={isLoading}
				currentUserEmail={currentUserEmail}
				onChangeRole={(email, newRole) => setRoleChange({ email, newRole })}
				onRemove={(email) => setRemovingEmail(email)}
			/>

			{/* Add User Dialog */}
			<AddUserDialog
				open={isAddDialogOpen}
				onOpenChange={setIsAddDialogOpen}
				onConfirm={handleAddUser}
			/>

			{/* Change Role Confirmation */}
			<AlertDialog open={!!roleChange} onOpenChange={(open) => !open && setRoleChange(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Change User Role?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to change {roleChange?.email} to {roleChange?.newRole}?
							{roleChange?.newRole === 'developer' && (
								<span className="mt-2 block text-yellow-600">
									Warning: Developers have full access to all features including user management.
								</span>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleChangeRole}>
							Change Role
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Remove User Confirmation */}
			<AlertDialog open={!!removingEmail} onOpenChange={(open) => !open && setRemovingEmail(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove User?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove {removingEmail} from the whitelist?
							They will no longer be able to access the system.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRemoveUser}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Remove User
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
