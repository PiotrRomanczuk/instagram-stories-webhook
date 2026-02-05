'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import { AllowedUser, UserRole } from '@/lib/types';

interface UseUsersOptions {
	search?: string;
	roleFilter?: UserRole | 'all';
}

interface UsersResponse {
	users: AllowedUser[];
}

const fetcher = async (url: string): Promise<UsersResponse> => {
	const res = await fetch(url);
	if (!res.ok) {
		const error = await res.json().catch(() => ({ error: 'Failed to fetch users' }));
		throw new Error(error.error || 'Failed to fetch users');
	}
	return res.json();
};

export function useUsers(options: UseUsersOptions = {}) {
	const { search = '', roleFilter = 'all' } = options;

	// Fetch users with SWR
	const { data, error, isLoading, mutate } = useSWR<UsersResponse>(
		'/api/users',
		fetcher,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
		}
	);

	// Filter users based on search and role
	const filteredUsers = (data?.users || []).filter((user) => {
		// Search filter
		const matchesSearch =
			!search ||
			user.email.toLowerCase().includes(search.toLowerCase()) ||
			user.display_name?.toLowerCase().includes(search.toLowerCase());

		// Role filter
		const matchesRole = roleFilter === 'all' || user.role === roleFilter;

		return matchesSearch && matchesRole;
	});

	// Add user
	const addUser = async (
		email: string,
		role: UserRole,
		displayName?: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			// Optimistic update
			const newUser: AllowedUser = {
				id: `temp-${Date.now()}`,
				email,
				role,
				display_name: displayName,
				created_at: new Date().toISOString(),
			};

			await mutate(
				async () => {
					const res = await fetch('/api/users', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email, role, display_name: displayName }),
					});

					if (!res.ok) {
						const errorData = await res.json().catch(() => ({
							error: 'Failed to add user',
						}));
						throw new Error(errorData.error || 'Failed to add user');
					}

					const result = await res.json();
					return result;
				},
				{
					optimisticData: {
						users: [...(data?.users || []), newUser],
					},
					rollbackOnError: true,
					populateCache: true,
					revalidate: true,
				}
			);

			toast.success('User added successfully');
			return { success: true };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Failed to add user';
			toast.error(message);
			return { success: false, error: message };
		}
	};

	// Update user role
	const updateUserRole = async (
		email: string,
		newRole: UserRole
	): Promise<{ success: boolean; error?: string }> => {
		try {
			// Find user for optimistic update
			const userToUpdate = data?.users.find(
				(u) => u.email.toLowerCase() === email.toLowerCase()
			);

			if (!userToUpdate) {
				throw new Error('User not found');
			}

			await mutate(
				async () => {
					const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ role: newRole }),
					});

					if (!res.ok) {
						const errorData = await res.json().catch(() => ({
							error: 'Failed to update role',
						}));
						throw new Error(errorData.error || 'Failed to update role');
					}

					const result = await res.json();
					return result;
				},
				{
					optimisticData: {
						users: data!.users.map((u) =>
							u.email.toLowerCase() === email.toLowerCase()
								? { ...u, role: newRole }
								: u
						),
					},
					rollbackOnError: true,
					populateCache: true,
					revalidate: true,
				}
			);

			toast.success('Role updated successfully');
			return { success: true };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Failed to update role';
			toast.error(message);
			return { success: false, error: message };
		}
	};

	// Delete user
	const deleteUser = async (
		email: string
	): Promise<{ success: boolean; error?: string }> => {
		try {
			await mutate(
				async () => {
					const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
						method: 'DELETE',
					});

					if (!res.ok) {
						const errorData = await res.json().catch(() => ({
							error: 'Failed to remove user',
						}));
						throw new Error(errorData.error || 'Failed to remove user');
					}

					return {
						users: data!.users.filter(
							(u) => u.email.toLowerCase() !== email.toLowerCase()
						),
					};
				},
				{
					optimisticData: {
						users: data!.users.filter(
							(u) => u.email.toLowerCase() !== email.toLowerCase()
						),
					},
					rollbackOnError: true,
					populateCache: true,
					revalidate: false, // No need to revalidate after successful delete
				}
			);

			toast.success('User removed successfully');
			return { success: true };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Failed to remove user';
			toast.error(message);
			return { success: false, error: message };
		}
	};

	return {
		users: filteredUsers,
		allUsers: data?.users || [],
		isLoading,
		error: error?.message,
		addUser,
		updateUserRole,
		deleteUser,
		refresh: mutate,
	};
}
