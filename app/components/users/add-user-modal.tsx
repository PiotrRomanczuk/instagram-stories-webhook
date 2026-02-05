'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserRole } from '@/lib/types';
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
import { Input } from '@/app/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Shield, User, Code } from 'lucide-react';

interface AddUserModalProps {
	isOpen: boolean;
	onClose: () => void;
	onAddUser: (
		email: string,
		role: UserRole,
		displayName?: string
	) => Promise<{ success: boolean; error?: string }>;
}

// Define form schema inline to avoid type conflicts
const formSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Invalid email format')
		.toLowerCase()
		.trim(),
	role: z.enum(['developer', 'admin', 'user']),
	display_name: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddUserModal({ isOpen, onClose, onAddUser }: AddUserModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: '',
			role: 'user' as const,
			display_name: '',
		},
	});

	const handleSubmit = async (values: FormValues) => {
		setIsSubmitting(true);
		try {
			const result = await onAddUser(
				values.email,
				values.role as UserRole,
				values.display_name || undefined
			);

			if (result.success) {
				form.reset();
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

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add User to Whitelist</DialogTitle>
					<DialogDescription>
						Grant access to a new user by adding their email to the whitelist.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email Address</FormLabel>
									<FormControl>
										<Input
											placeholder="user@example.com"
											type="email"
											autoComplete="email"
											disabled={isSubmitting}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="display_name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Display Name (Optional)</FormLabel>
									<FormControl>
										<Input
											placeholder="John Doe"
											disabled={isSubmitting}
											{...field}
											value={field.value || ''}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

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
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? 'Adding...' : 'Add User'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
