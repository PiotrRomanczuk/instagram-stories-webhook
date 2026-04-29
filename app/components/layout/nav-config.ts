import type { LucideIcon } from 'lucide-react';
import {
	Home,
	Archive,
	Film,
	Music,
	Send,
	ClipboardCheck,
	Calendar,
	CheckCircle2,
	Activity,
	Heart,
	Users,
	Settings,
	Plug,
	Inbox,
	FileText,
	Sparkles,
	Bug,
	BellRing,
	Code,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';

export interface NavItem {
	href: string;
	labelKey: string;
	icon: LucideIcon;
	roles?: UserRole[];
	hideForDemo?: boolean;
}

export interface NavGroup {
	id: string;
	labelKey: string;
	items: NavItem[];
	roles?: UserRole[];
	defaultCollapsed?: boolean;
}

const ADMIN_DEV: UserRole[] = ['admin', 'developer'];
const ADMIN_DEV_DEMO: UserRole[] = ['admin', 'developer', 'demo'];

export const NAV_GROUPS: NavGroup[] = [
	{
		id: 'pipeline',
		labelKey: 'pipeline',
		items: [
			{ href: '/', labelKey: 'dashboard', icon: Home },
			{ href: '/story-archive', labelKey: 'storyArchive', icon: Archive, roles: ADMIN_DEV },
			{ href: '/compositions', labelKey: 'compositions', icon: Film, roles: ADMIN_DEV },
			{ href: '/audio', labelKey: 'audio', icon: Music, roles: ADMIN_DEV },
			{ href: '/posted-tiktok', labelKey: 'postedTiktok', icon: CheckCircle2, roles: ADMIN_DEV },
		],
	},
	{
		id: 'insights',
		labelKey: 'insights',
		roles: ADMIN_DEV,
		items: [
			{ href: '/insights', labelKey: 'engagement', icon: Heart },
			{ href: '/analytics', labelKey: 'pipelineHealth', icon: Activity },
		],
	},
	{
		id: 'connections',
		labelKey: 'connections',
		roles: ADMIN_DEV,
		items: [
			{ href: '/settings', labelKey: 'linkedAccounts', icon: Plug },
		],
	},
	{
		id: 'tools',
		labelKey: 'tools',
		roles: ADMIN_DEV_DEMO,
		defaultCollapsed: true,
		items: [
			{ href: '/submit', labelKey: 'submit', icon: Send, hideForDemo: true },
			{ href: '/submissions', labelKey: 'submissions', icon: FileText, hideForDemo: true },
			{ href: '/review', labelKey: 'review', icon: ClipboardCheck, roles: ADMIN_DEV_DEMO },
			{ href: '/schedule', labelKey: 'schedule', icon: Calendar, roles: ADMIN_DEV_DEMO },
			{ href: '/posted-stories', labelKey: 'postedStories', icon: CheckCircle2, roles: ADMIN_DEV_DEMO },
			{ href: '/memes', labelKey: 'memes', icon: Sparkles, roles: ADMIN_DEV },
		],
	},
	{
		id: 'admin',
		labelKey: 'admin',
		roles: ADMIN_DEV,
		items: [
			{ href: '/users', labelKey: 'users', icon: Users },
			{ href: '/content', labelKey: 'content', icon: FileText },
			{ href: '/inbox', labelKey: 'inbox', icon: Inbox },
			{ href: '/settings', labelKey: 'settings', icon: Settings },
		],
	},
	{
		id: 'developer',
		labelKey: 'developer',
		roles: ['developer'],
		defaultCollapsed: true,
		items: [
			{ href: '/debug', labelKey: 'debug', icon: Bug },
			{ href: '/developer/cron-debug', labelKey: 'cronDebug', icon: Code },
			{ href: '/release-notes', labelKey: 'releaseNotes', icon: BellRing },
		],
	},
];

export function filterNavByRole(
	groups: NavGroup[],
	role: UserRole | undefined,
): NavGroup[] {
	return groups
		.filter((g) => !g.roles || (role !== undefined && g.roles.includes(role)))
		.map((g) => ({
			...g,
			items: g.items.filter((item) => {
				if (item.hideForDemo && role === 'demo') return false;
				if (!item.roles) return true;
				return role !== undefined && item.roles.includes(role);
			}),
		}))
		.filter((g) => g.items.length > 0);
}

export const HIDDEN_PATHS = ['/auth/signin', '/landing', '/terms', '/privacy'];
