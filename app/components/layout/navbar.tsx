'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Home, Image as ImageIcon, Shield, Calendar, LogOut, Menu, X, Terminal, Users } from 'lucide-react';
import { useState } from 'react';
import { UserRole } from '@/lib/types';

export function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Don't show navbar on signin page
    if (pathname === '/auth/signin') return null;

    const isDev = (session?.user as { role?: UserRole })?.role === 'developer';
    const isAdmin = (session?.user as { role?: UserRole })?.role === 'admin';
    const isAdminOrDev = isAdmin || isDev;

    const navItems = [
        { href: '/', label: 'Dashboard', icon: Home },
        { href: '/memes', label: 'Memes', icon: ImageIcon },
    ];

    if (isAdminOrDev) {
        navItems.push({ href: '/schedule', label: 'Schedule', icon: Calendar });
        navItems.push({ href: '/admin/memes', label: 'Memes Admin', icon: Shield });
        navItems.push({ href: '/admin/users', label: 'Users', icon: Users });
    }

    if (isDev) {
        // We'll add developer sub-items or a single Dev icon
        navItems.push({ href: '/developer', label: 'Dev Tools', icon: Terminal });
    }

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tighter">
                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            MARSZAL
                        </span>
                        <span className="text-slate-900 dark:text-white">ARTS</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 text-sm font-bold transition-colors ${isActive(item.href)
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        {session ? (
                            <button
                                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        ) : (
                            <Link
                                href="/auth/signin"
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-slate-600 dark:text-slate-400"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive(item.href)
                                        ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-bold">{item.label}</span>
                            </Link>
                        );
                    })}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                            {session?.user?.email}
                        </span>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                                className="text-red-500"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
