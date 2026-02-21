import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Clock, FileText, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/app/components/ui/table';
import {
	RELEASE_NOTES,
	CATEGORY_CONFIG,
} from '@/lib/release-notes/release-notes-data';

interface CostResponse {
	version: string;
	user_email: string;
	response: 'accepted' | 'declined';
	created_at: string;
}

export default async function ReleaseNotesPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect('/auth/signin');
	}

	const role = getUserRole(session);

	if (role !== 'developer' && role !== 'admin') {
		redirect('/');
	}

	const { data: rawResponses } = await supabaseAdmin
		.from('release_cost_responses')
		.select('version, user_email, response, created_at');

	const responses: CostResponse[] = (rawResponses ?? []) as CostResponse[];

	const responsesByVersion = new Map<string, CostResponse[]>();
	for (const r of responses) {
		const existing = responsesByVersion.get(r.version) ?? [];
		existing.push(r);
		responsesByVersion.set(r.version, existing);
	}

	return (
		<main className="min-h-screen bg-gray-50 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="space-y-6">
				<PageHeader
					title="Release Notes"
					description="Browse all release history and development cost approvals."
					badge={
						<Badge variant="secondary" className="gap-1">
							<FileText className="h-3 w-3" />
							Admin
						</Badge>
					}
				/>

				{RELEASE_NOTES.map((release) => {
					const versionResponses =
						responsesByVersion.get(release.version) ?? [];
					const acceptedCount = versionResponses.filter(
						(r) => r.response === 'accepted'
					).length;
					const declinedCount = versionResponses.filter(
						(r) => r.response === 'declined'
					).length;

					return (
						<Card key={release.version}>
							<CardContent className="pt-6">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
									<div>
										<div className="flex items-center gap-2">
											<h2 className="text-lg font-semibold">
												v{release.version}
											</h2>
											<Badge variant="outline">
												{release.date}
											</Badge>
										</div>
										<p className="text-sm text-muted-foreground">
											{release.title}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge
											variant="secondary"
											className="gap-1"
										>
											<Clock className="h-3 w-3" />
											{release.totalDevHours}h
										</Badge>
										{acceptedCount > 0 && (
											<Badge
												variant="outline"
												className="gap-1 border-green-300 text-green-700"
											>
												<CheckCircle className="h-3 w-3" />
												{acceptedCount} accepted
											</Badge>
										)}
										{declinedCount > 0 && (
											<Badge
												variant="outline"
												className="gap-1 border-red-300 text-red-700"
											>
												<XCircle className="h-3 w-3" />
												{declinedCount} declined
											</Badge>
										)}
									</div>
								</div>

								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Feature</TableHead>
											<TableHead className="w-24">
												Category
											</TableHead>
											<TableHead className="w-20 text-right">
												Hours
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{release.highlights.map((item) => {
											const catConfig =
												CATEGORY_CONFIG[item.category];
											const Icon = catConfig.icon;
											return (
												<TableRow key={item.title}>
													<TableCell>
														<div className="font-medium">
															{item.title}
														</div>
														<div className="text-sm text-muted-foreground">
															{item.description}
														</div>
													</TableCell>
													<TableCell>
														<Badge
															variant="outline"
															className="gap-1"
														>
															<Icon
																className={`h-3 w-3 ${catConfig.color}`}
															/>
															{item.category}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														{item.devHours}h
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>

								{versionResponses.length > 0 && (
									<div className="mt-4 pt-4 border-t">
										<h3 className="text-sm font-medium mb-2">
											Responses
										</h3>
										<div className="flex flex-wrap gap-2">
											{versionResponses.map((r) => (
												<div
													key={`${r.version}-${r.user_email}`}
													className="flex items-center gap-1.5"
												>
													<Badge variant="secondary">
														{r.user_email}
													</Badge>
													{r.response ===
													'accepted' ? (
														<Badge
															variant="outline"
															className="gap-1 border-green-300 text-green-700"
														>
															<CheckCircle className="h-3 w-3" />
															accepted
														</Badge>
													) : (
														<Badge
															variant="outline"
															className="gap-1 border-red-300 text-red-700"
														>
															<XCircle className="h-3 w-3" />
															declined
														</Badge>
													)}
													<span className="text-xs text-muted-foreground">
														{new Date(
															r.created_at
														).toLocaleDateString()}
													</span>
												</div>
											))}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>
		</main>
	);
}
