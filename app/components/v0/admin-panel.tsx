'use client';

import { useState } from 'react';
import {
	V0_CONTRIBUTORS,
	V0_PAYOUT_PERIODS,
	V0_CADENCE,
	contributorDisplayName,
} from '@/lib/fixtures/v0';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { UserPlus, Download, UserMinus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const PERIODS = ['2026-03', '2026-04', '2026-05'];

export function V0AdminPanel() {
	const [inviteEmail, setInviteEmail] = useState('');
	const [rate, setRate] = useState<string>(
		V0_CADENCE.defaultPayoutRateZl?.toString() ?? ''
	);
	const [period, setPeriod] = useState('2026-04');

	const onInvite = () => {
		if (!inviteEmail.includes('@')) return;
		toast.success('Invite sent', { description: `Demo only — ${inviteEmail} added to email_whitelist in v1.` });
		setInviteEmail('');
	};
	const onSetRate = () => {
		toast.success('Rate updated', { description: `${rate} zł / accepted-and-published. Demo only.` });
	};
	const onExport = () => {
		toast.success('CSV ready', {
			description: `${period} payout rows · grouped by contributor. Email-to-accountant link in v1.`,
		});
	};
	const onOffboard = (id: string) => {
		toast(`Offboarded ${id}`, {
			description:
				'Demo only — sets users.deleted_at, cancels pending submissions, schedules PII purge in 5 years.',
		});
	};

	const periodTotals = V0_PAYOUT_PERIODS.filter((p) => p.period === period);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<UserPlus className="h-4 w-4" /> Invite contributor
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Label>Email</Label>
					<div className="flex gap-2">
						<Input
							type="email"
							value={inviteEmail}
							onChange={(e) => setInviteEmail(e.target.value)}
							placeholder="contributor@example.com"
						/>
						<Button onClick={onInvite}>Invite</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						Adds to email_whitelist with role=contributor. They sign in via Google then complete onboarding.
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Per-post rate</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Label>Rate (zł per accepted-and-published)</Label>
					<div className="flex gap-2">
						<Input
							type="number"
							inputMode="decimal"
							value={rate}
							onChange={(e) => setRate(e.target.value)}
							placeholder="not set"
						/>
						<Button onClick={onSetRate} disabled={!rate}>
							Update
						</Button>
					</div>
					{!V0_CADENCE.defaultPayoutRateZl && (
						<div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
							<AlertTriangle className="h-4 w-4 shrink-0" />
							Rate not set yet. Contributor onboarding is blocked until you set this.
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="lg:col-span-2">
				<CardHeader>
					<CardTitle>Contributors ({V0_CONTRIBUTORS.length})</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="divide-y text-sm">
						{V0_CONTRIBUTORS.map((c) => (
							<li key={c.id} className="flex items-center gap-4 py-2.5">
								<div className="flex-1 min-w-0">
									<div className="font-medium truncate">{contributorDisplayName(c)}</div>
									<div className="text-xs text-muted-foreground truncate">
										{c.email} · {c.legalName} · {c.addressCity}
									</div>
								</div>
								<Badge variant="outline" className="shrink-0">
									{c.role}
								</Badge>
								{c.deletedAt ? (
									<Badge variant="secondary" className="shrink-0 text-xs">
										offboarded {c.deletedAt.slice(0, 10)}
									</Badge>
								) : (
									<>
										{c.isStudentUnder26 && <Badge variant="outline" className="shrink-0">student</Badge>}
										{!c.hasOtherEmploymentAboveMinWage && !c.isStudentUnder26 && (
											<Badge variant="outline" className="shrink-0 border-amber-400 text-amber-800 gap-1">
												<AlertTriangle className="h-3 w-3" /> ZUS risk
											</Badge>
										)}
										{c.role === 'contributor' && (
											<Button variant="ghost" size="sm" onClick={() => onOffboard(c.id)}>
												<UserMinus className="h-3 w-3" /> Offboard
											</Button>
										)}
									</>
								)}
							</li>
						))}
					</ul>
				</CardContent>
			</Card>

			<Card className="lg:col-span-2">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Download className="h-4 w-4" /> Monthly payout export
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center gap-2">
						<select
							className="h-9 rounded-md border bg-background px-3 text-sm"
							value={period}
							onChange={(e) => setPeriod(e.target.value)}
						>
							{PERIODS.map((p) => (
								<option key={p} value={p}>
									{p}
								</option>
							))}
						</select>
						<Button onClick={onExport}>Export CSV</Button>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b text-left">
									<th className="py-2">Contributor</th>
									<th className="py-2 text-right">Posts</th>
									<th className="py-2 text-right">Total zł</th>
									<th className="py-2">Status</th>
									<th className="py-2">Invoice #</th>
								</tr>
							</thead>
							<tbody>
								{periodTotals.length === 0 ? (
									<tr>
										<td colSpan={5} className="py-6 text-center text-muted-foreground">
											No payouts for {period}.
										</td>
									</tr>
								) : (
									periodTotals.map((p) => {
										const c = V0_CONTRIBUTORS.find((x) => x.id === p.contributorId);
										return (
											<tr key={p.contributorId} className="border-b">
												<td className="py-2">{c ? contributorDisplayName(c) : '—'}</td>
												<td className="py-2 text-right font-mono">{p.postCount}</td>
												<td className="py-2 text-right font-mono">{p.totalZl.toFixed(2)}</td>
												<td className="py-2">
													{p.paidAt ? (
														<Badge variant="outline" className="bg-emerald-100 border-emerald-300 text-emerald-900">
															paid
														</Badge>
													) : (
														<Badge variant="outline" className="bg-amber-100 border-amber-300 text-amber-900">
															pending
														</Badge>
													)}
												</td>
												<td className="py-2 text-xs font-mono">{p.invoiceNumber ?? '—'}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
