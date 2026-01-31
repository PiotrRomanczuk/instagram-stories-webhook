'use client';

import { format } from 'date-fns';
import { Shield, User, Code, Trash2, MoreHorizontal } from 'lucide-react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { AllowedUser, UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UsersTableProps {
	users: AllowedUser[];
	isLoading?: boolean;
	currentUserEmail?: string;
	onChangeRole: (email: string, newRole: UserRole) => void;
	onRemove: (email: string) => void;
}

function getRoleBadge(role: UserRole) {
	switch (role) {
		case 'developer':
			return (
				<Badge variant="secondary" className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200">
					<Code className="h-3 w-3" />
					Developer
				</Badge>
			);
		case 'admin':
			return (
				<Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200">
					<Shield className="h-3 w-3" />
					Admin
				</Badge>
			);
		case 'user':
		default:
			return (
				<Badge variant="secondary" className="gap-1">
					<User className="h-3 w-3" />
					User
				</Badge>
			);
	}
}

export function UsersTable({
	users,
	isLoading = false,
	currentUserEmail,
	onChangeRole,
	onRemove,
}: UsersTableProps) {
	if (isLoading) {
		return <UsersTableSkeleton />;
	}

	if (users.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
				<User className="h-12 w-12 text-muted-foreground/50" />
				<h3 className="mt-4 text-lg font-semibold">No users yet</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					Add users to the whitelist to grant access.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Email</TableHead>
						<TableHead>Display Name</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Added</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((user) => {
						const isCurrentUser = user.email.toLowerCase() === currentUserEmail?.toLowerCase();

						return (
							<TableRow
								key={user.id || user.email}
								className={cn(isCurrentUser && 'bg-muted/50')}
							>
								<TableCell className="font-medium">
									<div className="flex items-center gap-2">
										{user.email}
										{isCurrentUser && (
											<Badge variant="outline" className="text-xs">
												You
											</Badge>
										)}
									</div>
								</TableCell>
								<TableCell>
									{user.display_name || (
										<span className="text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell>{getRoleBadge(user.role)}</TableCell>
								<TableCell>
									{user.created_at ? (
										<span className="text-sm text-muted-foreground">
											{format(new Date(user.created_at), 'MMM d, yyyy')}
										</span>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell className="text-right">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												disabled={isCurrentUser}
											>
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuLabel>Change Role</DropdownMenuLabel>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={() => onChangeRole(user.email, 'user')}
												disabled={user.role === 'user'}
											>
												<User className="mr-2 h-4 w-4" />
												Set as User
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => onChangeRole(user.email, 'admin')}
												disabled={user.role === 'admin'}
											>
												<Shield className="mr-2 h-4 w-4" />
												Set as Admin
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => onChangeRole(user.email, 'developer')}
												disabled={user.role === 'developer'}
											>
												<Code className="mr-2 h-4 w-4" />
												Set as Developer
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={() => onRemove(user.email)}
												className="text-destructive focus:text-destructive"
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Remove User
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

function UsersTableSkeleton() {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Email</TableHead>
						<TableHead>Display Name</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Added</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 5 }).map((_, i) => (
						<TableRow key={i}>
							<TableCell>
								<Skeleton className="h-4 w-48" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-32" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-6 w-20" />
							</TableCell>
							<TableCell>
								<Skeleton className="h-4 w-24" />
							</TableCell>
							<TableCell>
								<Skeleton className="ml-auto h-8 w-8" />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
