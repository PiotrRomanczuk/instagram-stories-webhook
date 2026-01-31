'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/app/components/ui/select';
import { UserRole } from '@/lib/types';

interface AddUserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (email: string, role: UserRole, displayName?: string) => Promise<void>;
}

export function AddUserDialog({
	open,
	onOpenChange,
	onConfirm,
}: AddUserDialogProps) {
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<UserRole>('user');
	const [displayName, setDisplayName] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleConfirm = async () => {
		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedEmail) {
			setError('Email is required');
			return;
		}

		// Basic email validation
		if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
			setError('Please enter a valid email address');
			return;
		}

		setError(null);
		setIsSubmitting(true);

		try {
			await onConfirm(trimmedEmail, role, displayName.trim() || undefined);
			resetForm();
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to add user');
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = () => {
		setEmail('');
		setRole('user');
		setDisplayName('');
		setError(null);
	};

	const handleCancel = () => {
		resetForm();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add User</DialogTitle>
					<DialogDescription>
						Add a new user to the whitelist to grant access.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email Address</Label>
						<Input
							id="email"
							type="email"
							placeholder="user@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="display-name">Display Name (Optional)</Label>
						<Input
							id="display-name"
							placeholder="John Doe"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="role">Role</Label>
						<Select
							value={role}
							onValueChange={(v) => setRole(v as UserRole)}
							disabled={isSubmitting}
						>
							<SelectTrigger id="role">
								<SelectValue placeholder="Select role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="user">User</SelectItem>
								<SelectItem value="admin">Admin</SelectItem>
								<SelectItem value="developer">Developer</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							{role === 'user' && 'Can submit content and view own submissions.'}
							{role === 'admin' && 'Can review submissions and manage scheduled posts.'}
							{role === 'developer' && 'Full access including user management and developer tools.'}
						</p>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={isSubmitting || !email.trim()}
					>
						{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Add User
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
