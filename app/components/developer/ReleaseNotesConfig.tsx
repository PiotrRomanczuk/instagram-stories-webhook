'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { Loader2, Megaphone, Save } from 'lucide-react';
import { toast } from 'sonner';
import { RELEASE_NOTES } from '@/lib/release-notes/release-notes-data';
import { type AudienceType } from '@/lib/release-notes/release-notes-config';

interface User {
	email: string;
	role: string;
	name?: string;
}

export function ReleaseNotesConfig() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [audienceType, setAudienceType] = useState<AudienceType>('all');
	const [targetEmails, setTargetEmails] = useState<string[]>([]);
	const [users, setUsers] = useState<User[]>([]);

	const fetchConfig = useCallback(async () => {
		try {
			const [configRes, usersRes] = await Promise.all([
				fetch('/api/settings/whats-new'),
				fetch('/api/users'),
			]);

			if (configRes.ok) {
				const configData = await configRes.json();
				setAudienceType(configData.audienceType ?? 'all');
				setTargetEmails(configData.targetEmails ?? []);
			}

			if (usersRes.ok) {
				const usersData = await usersRes.json();
				setUsers(usersData.users ?? []);
			}
		} catch {
			toast.error('Failed to load configuration');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchConfig();
	}, [fetchConfig]);

	async function handleSave() {
		setSaving(true);
		try {
			const response = await fetch('/api/settings/whats-new', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ audienceType, targetEmails }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to save');
			}

			toast.success('What\'s New targeting updated');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save configuration');
		} finally {
			setSaving(false);
		}
	}

	function handleEmailToggle(email: string, checked: boolean) {
		setTargetEmails((prev) =>
			checked ? [...prev, email] : prev.filter((e) => e !== email)
		);
	}

	const latestVersion = RELEASE_NOTES[0]?.version ?? 'unknown';

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Megaphone className="h-5 w-5" />
					What&apos;s New Targeting
				</CardTitle>
				<CardDescription>
					Control who sees the What&apos;s New dialog for v{latestVersion}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{loading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
						<span className="ml-2 text-sm text-gray-500">
							Loading configuration...
						</span>
					</div>
				) : (
					<>
						{/* Audience Type Select */}
						<div className="space-y-2">
							<Label htmlFor="audience-type">Audience</Label>
							<Select
								value={audienceType}
								onValueChange={(value: AudienceType) => setAudienceType(value)}
							>
								<SelectTrigger id="audience-type" className="w-full">
									<SelectValue placeholder="Select audience" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Users</SelectItem>
									<SelectItem value="admin">Admins &amp; Developers</SelectItem>
									<SelectItem value="developer">Developers Only</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Override Emails */}
						<div className="space-y-3">
							<Label>Override Emails</Label>
							<p className="text-xs text-muted-foreground">
								Selected users will always see the dialog, regardless of audience setting.
							</p>
							<div className="space-y-2">
								{users.map((user) => (
									<div key={user.email} className="flex items-center gap-2">
										<Checkbox
											id={`user-${user.email}`}
											checked={targetEmails.includes(user.email)}
											onCheckedChange={(checked) =>
												handleEmailToggle(user.email, checked === true)
											}
										/>
										<Label
											htmlFor={`user-${user.email}`}
											className="text-sm font-normal cursor-pointer"
										>
											{user.email}
										</Label>
									</div>
								))}
								{users.length === 0 && (
									<p className="text-sm text-muted-foreground">No users found.</p>
								)}
							</div>
						</div>

						{/* Save Button */}
						<Button onClick={handleSave} disabled={saving} className="gap-2">
							{saving ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Save className="h-4 w-4" />
							)}
							Save Targeting
						</Button>
					</>
				)}
			</CardContent>
		</Card>
	);
}
