'use client';

/**
 * Kanban Header Component
 * Top navigation bar with logo, search, nav links, create story button
 */

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	Search,
	Bell,
	Plus,
	Filter,
	ArrowUpDown,
	ChevronDown,
	CheckSquare,
	Layers,
	LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanHeaderProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
	onCreateStory?: () => void;
	totalActive?: number;
	onBatchAction?: (action: 'approve' | 'reject' | 'schedule') => void;
	selectedCount?: number;
}

export function KanbanHeader({
	searchQuery,
	onSearchChange,
	onCreateStory,
	totalActive = 0,
	onBatchAction,
	selectedCount = 0,
}: KanbanHeaderProps) {
	const { data: session } = useSession();
	const pathname = usePathname();
	const [showBatchMenu, setShowBatchMenu] = useState(false);
	const [showUserMenu, setShowUserMenu] = useState(false);
	const batchMenuRef = useRef<HTMLDivElement>(null);
	const userMenuRef = useRef<HTMLDivElement>(null);

	// Close menus when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (batchMenuRef.current && !batchMenuRef.current.contains(event.target as Node)) {
				setShowBatchMenu(false);
			}
			if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
				setShowUserMenu(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const navLinks = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/content', label: 'Content Queue', active: true },
		{ href: '/analytics', label: 'Analytics' },
		{ href: '/users', label: 'Team' },
	];

	const userInitials = session?.user?.name
		?.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || '?';

	return (
		<header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-[#2d3a54] bg-white dark:bg-[#101622] px-6 py-3 shrink-0">
			{/* Left Section: Logo & Search */}
			<div className="flex items-center gap-8">
				{/* Logo */}
				<Link href="/" className="flex items-center gap-3 text-gray-900 dark:text-white">
					<div className="h-8 w-8 bg-[#2b6cee] rounded-lg flex items-center justify-center">
						<Layers className="h-5 w-5 text-white" />
					</div>
					<h2 className="text-gray-900 dark:text-white text-xl font-bold leading-tight tracking-tight">
						StoryFlow
					</h2>
				</Link>

				{/* Search */}
				<label className="flex flex-col min-w-40 h-10 w-80">
					<div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-gray-100 dark:bg-[#1a2234] border border-gray-200 dark:border-[#2d3a54] overflow-hidden focus-within:border-[#2b6cee]">
						<div className="text-gray-400 dark:text-[#92a4c9] flex items-center justify-center pl-4">
							<Search className="h-5 w-5" />
						</div>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							className="form-input flex w-full min-w-0 flex-1 border-none bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-[#92a4c9] px-3 text-sm font-normal"
							placeholder="Search stories, campaigns, or editors..."
						/>
					</div>
				</label>
			</div>

			{/* Right Section: Nav & Actions */}
			<div className="flex items-center gap-6">
				{/* Navigation */}
				<nav className="flex items-center gap-6">
					{navLinks.map((link) => {
						const isActive = link.active || pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								className={cn(
									'text-sm font-medium transition-colors',
									isActive
										? 'text-gray-900 dark:text-white font-bold border-b-2 border-[#2b6cee] pb-1'
										: 'text-gray-500 dark:text-[#92a4c9] hover:text-gray-900 dark:hover:text-white'
								)}
							>
								{link.label}
							</Link>
						);
					})}
				</nav>

				{/* Actions */}
				<div className="flex items-center gap-3 ml-4 border-l border-gray-200 dark:border-[#2d3a54] pl-6">
					{/* Create Story Button */}
					{onCreateStory && (
						<button
							onClick={onCreateStory}
							className="flex min-w-[120px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-[#2b6cee] hover:bg-[#2b6cee]/90 text-white text-sm font-bold transition-all gap-2"
						>
							<Plus className="h-4 w-4" />
							<span>Create Story</span>
						</button>
					)}

					{/* Notifications */}
					<button className="relative flex items-center justify-center rounded-lg h-10 w-10 bg-gray-100 dark:bg-[#1a2234] border border-gray-200 dark:border-[#2d3a54] text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-[#2d3a54] transition-colors">
						<Bell className="h-5 w-5" />
						<span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full" />
					</button>

					{/* User Avatar */}
					<div className="relative" ref={userMenuRef}>
						<button
							onClick={() => setShowUserMenu(!showUserMenu)}
							className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-10 w-10 border-2 border-gray-200 dark:border-[#2d3a54] hover:border-[#2b6cee] transition-colors overflow-hidden flex items-center justify-center bg-[#2b6cee] text-white font-bold"
							style={
								session?.user?.image
									? { backgroundImage: `url("${session.user.image}")` }
									: undefined
							}
						>
							{!session?.user?.image && userInitials}
						</button>

						{/* User dropdown menu */}
						{showUserMenu && (
							<div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-gray-200 dark:border-[#2d3a54] bg-white dark:bg-[#1a2234] py-1 shadow-xl z-50">
								<div className="px-4 py-3 border-b border-gray-200 dark:border-[#2d3a54]">
									<p className="text-sm font-medium text-gray-900 dark:text-white truncate">
										{session?.user?.name || 'User'}
									</p>
									<p className="text-xs text-gray-500 dark:text-[#92a4c9] truncate">
										{session?.user?.email}
									</p>
								</div>
								<button
									onClick={() => signOut()}
									className="w-full px-4 py-2 text-left text-sm text-gray-500 dark:text-[#92a4c9] hover:bg-gray-100 dark:hover:bg-[#232f48] hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2"
								>
									<LogOut className="h-4 w-4" />
									Sign out
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}

interface KanbanToolbarProps {
	totalActive: number;
	onFilter?: () => void;
	onSort?: () => void;
	onBatchAction?: (action: 'approve' | 'reject' | 'schedule') => void;
	selectedCount?: number;
}

export function KanbanToolbar({
	totalActive,
	onFilter,
	onSort,
	onBatchAction,
	selectedCount = 0,
}: KanbanToolbarProps) {
	const [showBatchMenu, setShowBatchMenu] = useState(false);
	const batchMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (batchMenuRef.current && !batchMenuRef.current.contains(event.target as Node)) {
				setShowBatchMenu(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2d3a54] bg-white/50 dark:bg-[#101622]/50 backdrop-blur-sm sticky top-0 z-10">
			<div className="flex items-center gap-4">
				<h1 className="text-gray-900 dark:text-white text-xl font-bold tracking-tight">Content Queue</h1>
				<span className="px-2 py-0.5 bg-gray-100 dark:bg-[#1a2234] border border-gray-200 dark:border-[#2d3a54] rounded text-[#2b6cee] text-xs font-bold">
					{totalActive} Active
				</span>
			</div>

			<div className="flex items-center gap-2">
				{/* Filter button */}
				<button
					onClick={onFilter}
					className="p-2 text-gray-400 dark:text-[#92a4c9] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a2234] rounded-lg transition-all"
				>
					<Filter className="h-5 w-5" />
				</button>

				{/* Sort button */}
				<button
					onClick={onSort}
					className="p-2 text-gray-400 dark:text-[#92a4c9] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a2234] rounded-lg transition-all"
				>
					<ArrowUpDown className="h-5 w-5" />
				</button>

				<div className="h-6 w-px bg-gray-200 dark:bg-[#2d3a54] mx-2" />

				{/* Batch Actions */}
				<div className="relative" ref={batchMenuRef}>
					<button
						onClick={() => setShowBatchMenu(!showBatchMenu)}
						className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#1a2234] border border-gray-200 dark:border-[#2d3a54] rounded-lg text-gray-900 dark:text-white text-sm font-bold hover:bg-gray-200 dark:hover:bg-[#2d3a54] transition-all"
					>
						<CheckSquare className="h-4 w-4" />
						<span>Batch Actions</span>
						{selectedCount > 0 && (
							<span className="ml-1 px-1.5 py-0.5 bg-[#2b6cee] text-white text-xs rounded">
								{selectedCount}
							</span>
						)}
						<ChevronDown className="h-4 w-4" />
					</button>

					{showBatchMenu && (
						<div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 dark:border-[#2d3a54] bg-white dark:bg-[#1a2234] py-1 shadow-xl z-20">
							<button
								onClick={() => {
									onBatchAction?.('approve');
									setShowBatchMenu(false);
								}}
								className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#232f48] transition-colors"
							>
								Approve Selected
							</button>
							<button
								onClick={() => {
									onBatchAction?.('schedule');
									setShowBatchMenu(false);
								}}
								className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#232f48] transition-colors"
							>
								Schedule Selected
							</button>
							<button
								onClick={() => {
									onBatchAction?.('reject');
									setShowBatchMenu(false);
								}}
								className="w-full px-3 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-[#232f48] transition-colors"
							>
								Reject Selected
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
