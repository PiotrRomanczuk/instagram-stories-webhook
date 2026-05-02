import Link from 'next/link';
import { V0PageShell } from '@/app/components/v0/v0-page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
	UserPlus,
	Inbox,
	Upload,
	Heart,
	CalendarRange,
	Music2,
	Globe,
	Settings,
	Archive,
	Lock,
} from 'lucide-react';

const SURFACES: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; description: string; tag?: string }[] = [
	{
		href: '/contributor/onboarding',
		icon: UserPlus,
		title: 'Contributor onboarding',
		description: '6-step wizard: license, identity, address, tax/ZUS, bank, display.',
		tag: 'new',
	},
	{
		href: '/submit/v0',
		icon: Upload,
		title: 'Submit for review',
		description: 'Drag-drop, locked taxonomy multi-select, free-form keywords.',
	},
	{
		href: '/submissions/v0',
		icon: Inbox,
		title: 'Your queue',
		description: 'Personal submissions list + earnings card; switch personas to walk through.',
	},
	{
		href: '/review/v0',
		icon: Heart,
		title: 'Review (Tinder swipe)',
		description: 'Right approves, left rejects; arrow keys work.',
	},
	{
		href: '/schedule/v0',
		icon: CalendarRange,
		title: 'Schedule',
		description: '14 days · 85/day humanized cadence + pinned overrides.',
	},
	{
		href: '/compose',
		icon: Music2,
		title: 'Compose for TikTok',
		description: 'Multi-asset → silent MP4 → TikTok drafts.',
		tag: 'new',
	},
	{
		href: '/posted-stories/v0',
		icon: Globe,
		title: 'Published wall',
		description: 'IG + TikTok tabs with contributor attribution.',
	},
	{
		href: '/admin/v0',
		icon: Settings,
		title: 'Admin',
		description: 'Invite, set rate, contributor list, monthly payout CSV export.',
	},
	{
		href: '/memes/v0',
		icon: Archive,
		title: 'Archive (feature 4)',
		description: 'Filter the entire tagged corpus and pin into upcoming holiday slots.',
	},
	{
		href: '/admin/dm-inbox',
		icon: Lock,
		title: 'DM inbox',
		description: 'v1.2 — gated on Meta App Review for instagram_manage_messages.',
		tag: 'v1.2',
	},
];

export default function V0HubPage() {
	return (
		<V0PageShell
			title="v0 walkthrough"
			description="One link per surface. Follow the order top-to-bottom for the contributor → curator → archive walkthrough."
		>
			<ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{SURFACES.map((s) => (
					<li key={s.href}>
						<Link href={s.href} className="block group h-full">
							<Card className="h-full transition-colors group-hover:border-foreground/40">
								<CardHeader className="pb-2">
									<CardTitle className="flex items-center gap-2 text-base">
										<s.icon className="h-4 w-4" />
										{s.title}
										{s.tag && (
											<Badge variant="secondary" className="ml-auto text-[10px]">
												{s.tag}
											</Badge>
										)}
									</CardTitle>
								</CardHeader>
								<CardContent className="text-sm text-muted-foreground">
									{s.description}
								</CardContent>
							</Card>
						</Link>
					</li>
				))}
			</ul>
		</V0PageShell>
	);
}
