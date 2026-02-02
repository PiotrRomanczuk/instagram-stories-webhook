'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Star, ShieldCheck, MoreVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UserRole = 'manager' | 'senior-creator' | 'creator';
export type UserStatus = 'active' | 'deactivated';

export interface TeamUser {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string;
	role: UserRole;
	workload: { pending: number; total: number };
	performance: number;
	status: UserStatus;
}

interface UsersDataTableProps {
	users: TeamUser[];
	isLoading?: boolean;
	onEdit?: (user: TeamUser) => void;
	onViewProfile?: (user: TeamUser) => void;
}

type SortField = 'name' | 'role' | 'workload' | 'performance' | 'status';
type SortDirection = 'asc' | 'desc';

function getRoleBadgeStyles(role: UserRole) {
	switch (role) {
		case 'manager':
			return 'bg-[#3e4a6d] text-white';
		case 'senior-creator':
			return 'bg-[#1a2333] border border-[#3e4a6d] text-[#92a4c9]';
		case 'creator':
			return 'bg-[#111722] border border-[#2a3649] text-[#6b7ba1]';
	}
}

function getRoleLabel(role: UserRole) {
	switch (role) {
		case 'manager':
			return 'Manager';
		case 'senior-creator':
			return 'Senior Creator';
		case 'creator':
			return 'Creator';
	}
}

export function UsersDataTable({
	users,
	isLoading,
	onEdit,
	onViewProfile,
}: UsersDataTableProps) {
	const [sortField, setSortField] = useState<SortField>('name');
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDirection('asc');
		}
	};

	const sortedUsers = [...users].sort((a, b) => {
		const modifier = sortDirection === 'asc' ? 1 : -1;
		switch (sortField) {
			case 'name':
				return modifier * a.name.localeCompare(b.name);
			case 'role':
				return modifier * a.role.localeCompare(b.role);
			case 'workload':
				return modifier * (a.workload.pending - b.workload.pending);
			case 'performance':
				return modifier * (a.performance - b.performance);
			case 'status':
				return modifier * a.status.localeCompare(b.status);
			default:
				return 0;
		}
	});

	const SortIcon = ({ field }: { field: SortField }) => {
		if (sortField !== field) return null;
		return sortDirection === 'asc' ? (
			<ChevronUp className="ml-1 inline h-3 w-3" />
		) : (
			<ChevronDown className="ml-1 inline h-3 w-3" />
		);
	};

	if (isLoading) {
		return <UsersDataTableSkeleton />;
	}

	return (
		<div className="overflow-hidden rounded-xl border border-[#2a3649] bg-[#111722]">
			<Table>
				<TableHeader>
					<TableRow className="border-[#2a3649] bg-[#1a2333]/50 hover:bg-[#1a2333]/50">
						<TableHead
							onClick={() => handleSort('name')}
							className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[#92a4c9]"
						>
							Creator
							<SortIcon field="name" />
						</TableHead>
						<TableHead
							onClick={() => handleSort('role')}
							className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[#92a4c9]"
						>
							Role
							<SortIcon field="role" />
						</TableHead>
						<TableHead
							onClick={() => handleSort('workload')}
							className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[#92a4c9]"
						>
							Workload
							<SortIcon field="workload" />
						</TableHead>
						<TableHead
							onClick={() => handleSort('performance')}
							className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[#92a4c9]"
						>
							Performance
							<SortIcon field="performance" />
						</TableHead>
						<TableHead
							onClick={() => handleSort('status')}
							className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[#92a4c9]"
						>
							Status
							<SortIcon field="status" />
						</TableHead>
						<TableHead className="text-right text-xs font-bold uppercase tracking-wider text-[#92a4c9]">
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sortedUsers.map((user) => (
						<TableRow
							key={user.id}
							className="border-[#2a3649] transition-colors hover:bg-[#1a2333]/30"
						>
							<TableCell>
								<div className="flex items-center gap-3">
									<div className="relative h-10 w-10 overflow-hidden rounded-full border border-[#324467]">
										{user.avatarUrl ? (
											<Image
												src={user.avatarUrl}
												alt={user.name}
												fill
												className="object-cover"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center bg-[#2a3649] text-sm font-medium text-white">
												{user.name.charAt(0)}
											</div>
										)}
									</div>
									<div className="flex flex-col">
										<p className="text-sm font-bold text-white">{user.name}</p>
										<p className="text-xs text-[#92a4c9]">{user.email}</p>
									</div>
								</div>
							</TableCell>
							<TableCell>
								<span
									className={cn(
										'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold',
										getRoleBadgeStyles(user.role)
									)}
								>
									{getRoleLabel(user.role)}
								</span>
							</TableCell>
							<TableCell>
								<div className="flex min-w-[120px] flex-col gap-1.5">
									<div className="flex justify-between text-[11px] font-medium">
										<span className="text-white">{user.workload.pending} Pending</span>
										<span className="text-[#92a4c9]">{user.workload.total} Total</span>
									</div>
									<Progress
										value={(user.workload.pending / user.workload.total) * 100}
										className="h-1.5 bg-[#2a3649]"
									/>
								</div>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-1">
									<Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
									<span className="text-sm font-bold text-white">
										{user.performance.toFixed(1)}
									</span>
								</div>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-1.5">
									<div
										className={cn(
											'h-2 w-2 rounded-full',
											user.status === 'active' ? 'bg-[#0bda5e]' : 'bg-slate-500'
										)}
									/>
									<span
										className={cn(
											'text-xs font-medium',
											user.status === 'active'
												? 'text-white'
												: 'text-slate-500'
										)}
									>
										{user.status === 'active' ? 'Active' : 'Deactivated'}
									</span>
								</div>
							</TableCell>
							<TableCell className="text-right">
								<div className="flex items-center justify-end gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onEdit?.(user)}
										className="h-9 w-9 p-0 text-[#92a4c9] hover:bg-[#2a3649] hover:text-white"
										title="Edit Permissions"
									>
										<ShieldCheck className="h-5 w-5" />
									</Button>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												className="h-9 w-9 p-0 text-[#92a4c9] hover:bg-[#2a3649] hover:text-white"
											>
												<MoreVertical className="h-5 w-5" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align="end"
											className="border-[#2a3649] bg-[#1a2332]"
										>
											<DropdownMenuItem
												onClick={() => onViewProfile?.(user)}
												className="text-[#92a4c9] focus:bg-[#2a3649] focus:text-white"
											>
												View Profile
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => onEdit?.(user)}
												className="text-[#92a4c9] focus:bg-[#2a3649] focus:text-white"
											>
												Edit Permissions
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function UsersDataTableSkeleton() {
	return (
		<div className="overflow-hidden rounded-xl border border-[#2a3649] bg-[#111722]">
			<Table>
				<TableHeader>
					<TableRow className="border-[#2a3649] bg-[#1a2333]/50">
						<TableHead className="text-xs font-bold uppercase text-[#92a4c9]">
							Creator
						</TableHead>
						<TableHead className="text-xs font-bold uppercase text-[#92a4c9]">
							Role
						</TableHead>
						<TableHead className="text-xs font-bold uppercase text-[#92a4c9]">
							Workload
						</TableHead>
						<TableHead className="text-xs font-bold uppercase text-[#92a4c9]">
							Performance
						</TableHead>
						<TableHead className="text-xs font-bold uppercase text-[#92a4c9]">
							Status
						</TableHead>
						<TableHead className="text-right text-xs font-bold uppercase text-[#92a4c9]">
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 4 }).map((_, i) => (
						<TableRow key={i} className="border-[#2a3649]">
							<TableCell>
								<div className="flex items-center gap-3">
									<Skeleton className="h-10 w-10 rounded-full bg-[#2a3649]" />
									<div className="space-y-2">
										<Skeleton className="h-4 w-24 bg-[#2a3649]" />
										<Skeleton className="h-3 w-32 bg-[#2a3649]" />
									</div>
								</div>
							</TableCell>
							<TableCell>
								<Skeleton className="h-6 w-20 bg-[#2a3649]" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-6 w-28 bg-[#2a3649]" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-12 bg-[#2a3649]" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-16 bg-[#2a3649]" />
							</TableCell>
							<TableCell>
								<Skeleton className="ml-auto h-8 w-20 bg-[#2a3649]" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
