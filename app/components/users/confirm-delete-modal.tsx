'use client';

import { useState } from 'react';
import { AllowedUser } from '@/lib/types';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
	isOpen: boolean;
	onClose: () => void;
	user: AllowedUser | null;
	onDeleteUser: (
		email: string
	) => Promise<{ success: boolean; error?: string }>;
}

export function ConfirmDeleteModal({
	isOpen,
	onClose,
	user,
	onDeleteUser,
}: ConfirmDeleteModalProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		if (!user) return;

		setIsDeleting(true);
		try {
			const result = await onDeleteUser(user.email);

			if (result.success) {
				onClose();
			}
		} finally {
			setIsDeleting(false);
		}
	};

	const handleClose = () => {
		if (!isDeleting) {
			onClose();
		}
	};

	if (!user) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Remove User from Whitelist</DialogTitle>
					<DialogDescription>
						Are you sure you want to remove this user?
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							<strong>{user.email}</strong> will lose access to the application.
							This action cannot be undone.
						</AlertDescription>
					</Alert>

					{user.display_name && (
						<div className="rounded-lg border p-3">
							<div className="text-sm text-muted-foreground">Display Name</div>
							<div className="font-medium">{user.display_name}</div>
						</div>
					)}

					<div className="rounded-lg border p-3">
						<div className="text-sm text-muted-foreground">Role</div>
						<div className="font-medium capitalize">{user.role}</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						disabled={isDeleting}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleDelete}
						disabled={isDeleting}
					>
						{isDeleting ? 'Removing...' : 'Remove User'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
