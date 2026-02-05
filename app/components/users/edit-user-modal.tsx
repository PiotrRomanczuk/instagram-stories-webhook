'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AllowedUser, UserRole } from '@/lib/types';
import { updateUserRoleSchema } from '@/lib/validations/user.schema';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/app/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/app/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Shield, User, Code, AlertTriangle } from 'lucide-react';

interface EditUserModalProps {
	isOpen: boolean;
	onClose: () => void;
	user: AllowedUser | null;
	allUsers: AllowedUser[];
	onUpdateRole: (
		email: string,
		newRole: UserRole
	) => Promise<{ success: boolean; error?: string }>;
}

type FormValues = z.infer<typeof updateUserRoleSchema>;

export function EditUserModal({
	isOpen,
	onClose,
	user,
	allUsers,
	onUpdateRole,
}: EditUserModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(updateUserRoleSchema),
		defaultValues: {
			role: user?.role || 'user',
		},
	});

	// Update form when user changes
	useEffect(() => {
		if (user) {
			form.reset({ role: user.role });
		}
	}, [user, form]);

	// Check if this is the last developer
	const isLastDeveloper =
		user?.role === 'developer' &&
		allUsers.filter((u) => u.role === 'developer').length === 1;

	const selectedRole = form.watch('role');
	const isRoleChanged = selectedRole !== user?.role;
	const wouldRemoveLastDeveloper = isLastDeveloper && selectedRole !== 'developer';

	const handleSubmit = async (values: FormValues) => {
		if (!user) return;

		setIsSubmitting(true);
		try {
			const result = await onUpdateRole(user.email, values.role);

			if (result.success) {
				onClose();
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		if (!isSubmitting) {
			form.reset();
			onClose();
		}
	};

	if (!user) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Edit User Role</DialogTitle>
					<DialogDescription>
						Change the role for <strong>{user.email}</strong>
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
						{wouldRemoveLastDeveloper && (
							<Alert variant="destructive">
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									Warning: This is the last developer account. Changing the role
									will prevent developer-level access to the system.
								</AlertDescription>
							</Alert>
						)}

						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
										disabled={isSubmitting}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a role" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="user">
												<div className="flex items-center gap-2">
													<User className="h-4 w-4" />
													<span>User</span>
												</div>
											</SelectItem>
											<SelectItem value="admin">
												<div className="flex items-center gap-2">
													<Shield className="h-4 w-4" />
													<span>Admin</span>
												</div>
											</SelectItem>
											<SelectItem value="developer">
												<div className="flex items-center gap-2">
													<Code className="h-4 w-4" />
													<span>Developer</span>
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={handleClose}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting || !isRoleChanged}
							>
								{isSubmitting ? 'Updating...' : 'Update Role'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
