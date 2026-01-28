'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Trash2, Shield, User, Loader, Terminal } from 'lucide-react';
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
                body: JSON.stringify({ email: newEmail.trim(), role: newRole })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(`Added ${newEmail} as ${newRole}`);
            setNewEmail('');
            setNewRole('user'); // Reset role selector to default
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
                body: JSON.stringify({ role })
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
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('User removed');
            setUsers(prev => prev.filter(u => u.email !== email));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to remove');
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 md:p-8 lg:p-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/admin/memes"
                        className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest mb-4 group"
                    >
                        <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Meme Review
                    </Link>
                    <h1 className="text-4xl font-black text-slate-900">
                        User <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Whitelist</span>
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage who can access the meme submission system
                    </p>
                </div>

                {/* Add User Form */}
                <form onSubmit={handleAddUser} className="bg-white rounded-2xl p-6 border border-slate-200 mb-8">
                    <h2 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add User
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="user@gmail.com"
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                            required
                        />
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as UserRole)}
                            className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="developer">Developer</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isAdding || !isDev}
                            className="px-6 py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isAdding ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {!isDev ? 'Dev Only' : 'Add'}
                        </button>
                    </div>
                </form>

                {/* User List */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            No users in whitelist
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-bold uppercase text-slate-500">Email</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold uppercase text-slate-500">Role</th>
                                    <th className="w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-900">
                                                {user.email}
                                            </span>
                                            {user.display_name && (
                                                <span className="ml-2 text-sm text-slate-500">
                                                    ({user.display_name})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.email, e.target.value as UserRole)}
                                                disabled={!isDev}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-0 ${user.role === 'admin'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-slate-100 text-slate-700'
                                                    } disabled:opacity-70`}
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                                <option value="developer">Developer</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleDelete(user.email)}
                                                disabled={!isDev}
                                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Legend */}
                <div className="mt-6 flex gap-6 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-indigo-500" />
                        Developer = Full access (Dev Tools + Admin)
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-500" />
                        Admin = Can review + publish memes
                    </div>
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        User = Can submit memes only
                    </div>
                </div>
            </div>
        </main>
    );
}
