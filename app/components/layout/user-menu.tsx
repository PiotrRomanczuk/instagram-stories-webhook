'use client';

import { signOut } from 'next-auth/react';
import { LogOut, Instagram, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Link } from '@/i18n/routing';
import { UserRole } from '@/lib/types';

interface UserMenuProps {
	user: {
		name?: string | null;
		email?: string | null;
		image?: string | null;
		role?: UserRole;
		instagramAccount?: {
			id?: string;
			username?: string;
		} | null;
	};
}

export function UserMenu({ user }: UserMenuProps) {
	const initials = user.name
		? user.name
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
		: user.email?.[0].toUpperCase() || 'U';

	const isAdminOrDev = user.role === 'admin' || user.role === 'developer';

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="relative h-10 w-10 rounded-full"
					aria-label="User menu"
				>
					<Avatar className="h-10 w-10">
						<AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
						<AvatarFallback className="bg-primary text-primary-foreground">
							{initials}
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-64" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-2">
						<p className="text-sm font-medium leading-none">{user.name}</p>
						<p className="text-xs leading-none text-muted-foreground">
							{user.email}
						</p>
						{user.role && (
							<Badge
								variant={user.role === 'developer' ? 'default' : 'secondary'}
								className="w-fit text-xs"
							>
								{user.role}
							</Badge>
						)}
						{isAdminOrDev && user.instagramAccount?.username && (
							<div className="flex items-center gap-1 text-xs text-primary">
								<Instagram className="h-3 w-3" />
								<span>@{user.instagramAccount.username}</span>
							</div>
						)}
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{isAdminOrDev && (
					<DropdownMenuItem asChild>
						<Link href="/users" className="cursor-pointer">
							<Users className="mr-2 h-4 w-4" />
							<span>Manage Users</span>
						</Link>
					</DropdownMenuItem>
				)}
				{/* MVP: Settings page hidden — re-enable post-MVP */}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="cursor-pointer text-destructive focus:text-destructive"
					onClick={() => signOut({ callbackUrl: '/auth/signin' })}
				>
					<LogOut className="mr-2 h-4 w-4" />
					<span>Sign out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
