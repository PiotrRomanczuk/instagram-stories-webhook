'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
	ChevronLeft,
	Plus,
	Trash2,
	Shield,
	User,
	Loader,
	Terminal,
	Info,
	BarChart3,
	Clock,
	Calendar,
	Instagram,
	X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AllowedUser, UserRole } from '@/lib/memes-db';

export default function AdminUsersPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const isDev = (session?.user as { role?: UserRole })?.role === 'developer';

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.push('/auth/signin');
		} else if (status === 'authenticated') {
			const role = (session?.user as { role?: UserRole })?.role;
			if (role !== 'admin' && role !== 'developer') {
				router.push('/');
			}
		}
	}, [status, session, router]);

	const [users, setUsers] = useState<AllowedUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [newEmail, setNewEmail] = useState('');
	const [newRole, setNewRole] = useState<UserRole>('user');
	const [isAdding, setIsAdding] = useState(false);

	const [selectedUserDetails, setSelectedUserDetails] = useState<{
		user: AllowedUser;
		stats: {
			total: number;
			statusCounts: Record<string, number>;
			lastSubAt: string | null;
		};
		linkedAccount: {
			provider: string;
			ig_user_id: string;
			ig_username?: string;
			updated_at: string;
		} | null;
	} | null>(null);

	const fetchUsers = useCallback(async () => {
		try {
			const res = await fetch('/api/admin/users');
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			setUsers(data.users || []);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to load');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	const handleAddUser = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newEmail.trim()) return;

		setIsAdding(true);
		try {
			const res = await fetch('/api/admin/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);

			toast.success(`Added ${newEmail} as ${newRole}`);
			setNewEmail('');
			fetchUsers();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add');
		} finally {
			setIsAdding(false);
		}
	};

	const handleRoleChange = async (email: string, role: UserRole) => {
		try {
			const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);

			toast.success(`Updated ${email} to ${role}`);
			fetchUsers();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update');
		}
	};

	const handleDelete = async (email: string) => {
		if (!confirm(`Remove ${email} from whitelist?`)) return;

		try {
			const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
				method: 'DELETE',
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);

			toast.success('User removed');
			setUsers((prev) => prev.filter((u) => u.email !== email));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to remove');
		}
	};

	const handleViewDetails = async (email: string) => {
		try {
			const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			setSelectedUserDetails(data);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to load details',
			);
		}
	};

	return (
		<main className='min-h-screen bg-slate-50 p-4 md:p-8 lg:p-12'>
			<div className='max-w-4xl mx-auto'>
				{/* Header */}
				<div className='mb-8'>
					<Link
						href='/admin/memes'
						className='inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest mb-4 group'
					>
						<ChevronLeft className='w-4 h-4 transition-transform group-hover:-translate-x-1' />
						Meme Review
					</Link>
					<h1 className='text-4xl font-black text-slate-900'>
						User{' '}
						<span className='text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600'>
							Whitelist
						</span>
					</h1>
					<p className='text-slate-500 mt-1'>
						Manage who can access the meme submission system
					</p>
				</div>

				{/* Add User Form */}
				<form
					onSubmit={handleAddUser}
					className='bg-white rounded-2xl p-6 border border-slate-200 mb-8'
				>
					<h2 className='font-bold text-lg text-slate-900 mb-4 flex items-center gap-2'>
						<Plus className='w-5 h-5' />
						Add User
					</h2>
					<div className='flex flex-col sm:flex-row gap-3'>
						<input
							type='email'
							value={newEmail}
							onChange={(e) => setNewEmail(e.target.value)}
							placeholder='user@gmail.com'
							className='flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
							required
						/>
						<select
							value={newRole}
							onChange={(e) => setNewRole(e.target.value as UserRole)}
							className='px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900'
						>
							<option value='user'>User</option>
							<option value='admin'>Admin</option>
							<option value='developer'>Developer</option>
						</select>
						<button
							type='submit'
							disabled={isAdding || !isDev}
							className='px-6 py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2'
						>
							{isAdding ? (
								<Loader className='w-4 h-4 animate-spin' />
							) : (
								<Plus className='w-4 h-4' />
							)}
							{!isDev ? 'Dev Only' : 'Add'}
						</button>
					</div>
				</form>

				{/* User List */}
				<div className='bg-white rounded-2xl border border-slate-200 overflow-hidden'>
					{isLoading ? (
						<div className='flex items-center justify-center py-12'>
							<Loader className='w-8 h-8 text-indigo-500 animate-spin' />
						</div>
					) : users.length === 0 ? (
						<div className='text-center py-12 text-slate-500'>
							No users in whitelist
						</div>
					) : (
						<table className='w-full'>
							<thead className='bg-slate-50 border-b border-slate-200'>
								<tr>
									<th className='text-left px-6 py-4 text-xs font-bold uppercase text-slate-500'>
										Email
									</th>
									<th className='text-left px-6 py-4 text-xs font-bold uppercase text-slate-500'>
										Role
									</th>
									<th className='w-40 px-6 py-4'></th>
								</tr>
							</thead>
							<tbody className='divide-y divide-slate-100'>
								{users.map((user) => (
									<tr key={user.id} className='hover:bg-slate-50 group'>
										<td
											className='px-6 py-4 cursor-pointer'
											onClick={() => handleViewDetails(user.email)}
										>
											<div className='flex items-center gap-2'>
												<span className='font-medium text-slate-900 group-hover:text-indigo-600 transition-colors'>
													{user.email}
												</span>
												<Info className='w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity' />
											</div>
											{user.display_name && (
												<span className='ml-2 text-sm text-slate-500'>
													({user.display_name})
												</span>
											)}
										</td>
										<td className='px-6 py-4'>
											<select
												value={user.role}
												onChange={(e) =>
													handleRoleChange(
														user.email,
														e.target.value as UserRole,
													)
												}
												disabled={!isDev}
												className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-0 ${
													user.role === 'admin'
														? 'bg-purple-100 text-purple-700'
														: 'bg-slate-100 text-slate-700'
												} disabled:opacity-70`}
											>
												<option value='user'>User</option>
												<option value='admin'>Admin</option>
												<option value='developer'>Developer</option>
											</select>
										</td>
										<td className='px-6 py-4 text-right'>
											<div className='flex items-center justify-end gap-2'>
												<button
													onClick={() => handleViewDetails(user.email)}
													className='p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors'
													title='View Stats'
												>
													<BarChart3 className='w-4 h-4' />
												</button>
												<button
													onClick={() => handleDelete(user.email)}
													disabled={!isDev}
													className='p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent'
												>
													<Trash2 className='w-4 h-4' />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				{/* Details Side Panel / Overlay */}
				{selectedUserDetails && (
					<div className='fixed inset-0 z-50 flex justify-end'>
						<div
							className='absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity'
							onClick={() => setSelectedUserDetails(null)}
						/>
						<div className='relative w-full max-w-md bg-white h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-300'>
							{/* Panel Header */}
							<div className='p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50'>
								<div>
									<h3 className='font-black text-xl text-slate-900 tracking-tight'>
										User Details
									</h3>
									<p className='text-sm text-slate-500'>
										{selectedUserDetails.user.email}
									</p>
								</div>
								<button
									onClick={() => setSelectedUserDetails(null)}
									className='p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-400 hover:text-slate-900'
								>
									<X className='w-5 h-5' />
								</button>
							</div>

							<div className='flex-1 overflow-y-auto p-6 space-y-8'>
								{/* Roles & Status */}
								<section>
									<h4 className='text-xs font-bold text-slate-400 uppercase tracking-widest mb-4'>
										Account Information
									</h4>
									<div className='grid grid-cols-2 gap-4'>
										<div className='p-4 rounded-2xl bg-slate-50 border border-slate-100'>
											<div className='flex items-center gap-2 mb-1'>
												<Shield className='w-4 h-4 text-indigo-500' />
												<span className='text-xs font-bold text-slate-500 uppercase'>
													Role
												</span>
											</div>
											<p className='font-bold text-slate-900 capitalize'>
												{selectedUserDetails.user.role}
											</p>
										</div>
										<div className='p-4 rounded-2xl bg-slate-50 border border-slate-100'>
											<div className='flex items-center gap-2 mb-1'>
												<Calendar className='w-4 h-4 text-indigo-500' />
												<span className='text-xs font-bold text-slate-500 uppercase'>
													Whitelisted
												</span>
											</div>
											<p className='font-bold text-slate-900'>
												{new Date(
													selectedUserDetails.user.created_at || '',
												).toLocaleDateString()}
											</p>
										</div>
										{selectedUserDetails.user.added_by && (
											<div className='p-4 rounded-2xl bg-slate-50 border border-slate-100 col-span-2'>
												<div className='flex items-center gap-2 mb-1'>
													<User className='w-4 h-4 text-indigo-500' />
													<span className='text-xs font-bold text-slate-500 uppercase'>
														Added By
													</span>
												</div>
												<p className='font-bold text-slate-900'>
													{selectedUserDetails.user.added_by}
												</p>
											</div>
										)}
									</div>
								</section>

								{/* Linked Account */}
								<section>
									<h4 className='text-xs font-bold text-slate-400 uppercase tracking-widest mb-4'>
										Linked Accounts
									</h4>
									{selectedUserDetails.linkedAccount ? (
										<div className='p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between'>
											<div className='flex items-center gap-3'>
												<div className='w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm'>
													<Instagram className='w-5 h-5 text-indigo-600' />
												</div>
												<div>
													<p className='font-bold text-slate-900'>
														{selectedUserDetails.linkedAccount.ig_username
															? `@${selectedUserDetails.linkedAccount.ig_username}`
															: 'Instagram / Facebook'}
													</p>
													<p className='text-xs text-indigo-600 font-medium'>
														ID:{' '}
														{selectedUserDetails.linkedAccount.ig_user_id ||
															'N/A'}
													</p>
												</div>
											</div>
											<div className='text-right'>
												<span className='px-2 py-1 rounded-md bg-green-100 text-green-700 text-[10px] font-black uppercase'>
													Connected
												</span>
											</div>
										</div>
									) : (
										<div className='p-4 rounded-2xl bg-slate-50 border border-slate-100 border-dashed flex flex-col items-center justify-center text-center py-8'>
											<Instagram className='w-8 h-8 text-slate-300 mb-2' />
											<p className='text-sm font-bold text-slate-500'>
												No Instagram Linked
											</p>
											<p className='text-xs text-slate-400 mt-1'>
												User hasn&apos;t linked their Business account yet.
											</p>
										</div>
									)}
								</section>

								{/* Submission Stats */}
								<section>
									<h4 className='text-xs font-bold text-slate-400 uppercase tracking-widest mb-4'>
										Submission Activity
									</h4>
									<div className='bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative'>
										<div className='absolute top-0 right-0 p-4 opacity-10'>
											<BarChart3 className='w-24 h-24' />
										</div>

										<div className='relative z-10'>
											<div className='mb-6'>
												<span className='text-xs font-bold text-slate-400 uppercase tracking-widest'>
													Total Submissions
												</span>
												<p className='text-5xl font-black'>
													{selectedUserDetails.stats.total}
												</p>
											</div>

											<div className='grid grid-cols-2 gap-4'>
												<div className='bg-white/10 rounded-2xl p-3'>
													<span className='text-[10px] font-bold text-slate-400 uppercase'>
														Approved
													</span>
													<p className='text-xl font-bold text-green-400'>
														{selectedUserDetails.stats.statusCounts.approved ||
															0}
													</p>
												</div>
												<div className='bg-white/10 rounded-2xl p-3'>
													<span className='text-[10px] font-bold text-slate-400 uppercase'>
														Published
													</span>
													<p className='text-xl font-bold text-blue-400'>
														{selectedUserDetails.stats.statusCounts.published ||
															0}
													</p>
												</div>
												<div className='bg-white/10 rounded-2xl p-3'>
													<span className='text-[10px] font-bold text-slate-400 uppercase'>
														Pending
													</span>
													<p className='text-xl font-bold text-yellow-400'>
														{selectedUserDetails.stats.statusCounts.pending ||
															0}
													</p>
												</div>
												<div className='bg-white/10 rounded-2xl p-3'>
													<span className='text-[10px] font-bold text-slate-400 uppercase'>
														Rejected
													</span>
													<p className='text-xl font-bold text-red-400'>
														{selectedUserDetails.stats.statusCounts.rejected ||
															0}
													</p>
												</div>
											</div>

											{selectedUserDetails.stats.lastSubAt && (
												<div className='mt-6 flex items-center gap-2 text-xs text-slate-400'>
													<Clock className='w-3 h-3' />
													Last active:{' '}
													{new Date(
														selectedUserDetails.stats.lastSubAt,
													).toLocaleDateString()}
												</div>
											)}
										</div>
									</div>
								</section>
							</div>

							{/* Panel Footer */}
							<div className='p-6 border-t border-slate-100'>
								<Link
									href={`/admin/memes?search=${encodeURIComponent(selectedUserDetails.user.email)}`}
									className='w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200'
								>
									View Submissions
								</Link>
							</div>
						</div>
					</div>
				)}

				{/* Legend */}
				<div className='mt-6 flex gap-6 text-sm text-slate-500'>
					<div className='flex items-center gap-2'>
						<Terminal className='w-4 h-4 text-indigo-500' />
						Developer = Full access (Dev Tools + Admin)
					</div>
					<div className='flex items-center gap-2'>
						<Shield className='w-4 h-4 text-purple-500' />
						Admin = Can review + publish memes
					</div>
					<div className='flex items-center gap-2'>
						<User className='w-4 h-4 text-slate-400' />
						User = Can submit memes only
					</div>
				</div>
			</div>
		</main>
	);
}
