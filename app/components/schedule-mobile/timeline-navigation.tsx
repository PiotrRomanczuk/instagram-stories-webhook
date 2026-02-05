'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Calendar, LayoutGrid, Plus, BarChart3, User } from 'lucide-react';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { cn } from '@/lib/utils';

export type NavItem = 'queue' | 'calendar' | 'add' | 'insights' | 'profile';

interface NavigationItem {
    id: NavItem;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    isCenter?: boolean;
}

const navigationItems: NavigationItem[] = [
    {
        id: 'queue',
        label: 'Queue',
        icon: LayoutGrid,
        href: '/schedule',
    },
    {
        id: 'calendar',
        label: 'Calendar',
        icon: Calendar,
        href: '/calendar',
    },
    {
        id: 'add',
        label: 'Add',
        icon: Plus,
        href: '/schedule/new',
        isCenter: true,
    },
    {
        id: 'insights',
        label: 'Insights',
        icon: BarChart3,
        href: '/insights',
    },
    {
        id: 'profile',
        label: 'Profile',
        icon: User,
        href: '/profile',
    },
];

/**
 * Responsive navigation component
 *
 * Mobile (<768px):
 * - Bottom navigation bar
 * - 5 icons: Queue | Calendar | + (center, elevated) | Insights | Profile
 * - Fixed to bottom, 60px height
 * - Current page highlighted in blue
 *
 * Desktop (≥768px):
 * - Sidebar navigation
 * - Same 5 items as vertical list
 * - Icons + labels
 * - 240px wide, fixed left
 * - Smooth transitions between layouts
 */
export function TimelineNavigation() {
    const pathname = usePathname();
    const isDesktop = useMediaQuery('(min-width: 768px)');

    const isActive = (href: string) => {
        if (href === '/schedule') {
            return pathname === '/schedule' || pathname === '/';
        }
        return pathname?.startsWith(href);
    };

    if (isDesktop) {
        // Desktop: Sidebar navigation
        return (
            <nav
                className="fixed left-0 top-0 h-screen w-60 bg-gray-900 border-r border-gray-800 z-40"
                data-testid="desktop-navigation"
            >
                <div className="flex flex-col h-full">
                    {/* Logo/Brand */}
                    <div className="p-6 border-b border-gray-800">
                        <h1 className="text-xl font-bold text-white">Stories</h1>
                    </div>

                    {/* Navigation Items */}
                    <div className="flex-1 py-6 space-y-2">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    data-testid={`nav-${item.id}`}
                                    className={cn(
                                        'flex items-center gap-3 px-6 py-3 mx-3 rounded-xl',
                                        'transition-all duration-200',
                                        'hover:bg-gray-800',
                                        active
                                            ? 'bg-[#2b6cee] text-white shadow-lg shadow-blue-500/20'
                                            : 'text-gray-400 hover:text-white'
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            'w-5 h-5',
                                            item.isCenter && !active && 'text-blue-400'
                                        )}
                                    />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        );
    }

    // Mobile: Bottom navigation bar
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 z-50"
            data-testid="mobile-navigation"
        >
            <div className="flex items-center justify-around h-full px-2">
                {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    if (item.isCenter) {
                        // Center "Add" button - elevated and larger
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                data-testid={`nav-${item.id}`}
                                className="relative -top-4"
                            >
                                <div
                                    className={cn(
                                        'w-14 h-14 rounded-full flex items-center justify-center',
                                        'bg-[#2b6cee] text-white shadow-xl shadow-blue-500/30',
                                        'hover:scale-110 active:scale-95 transition-transform'
                                    )}
                                >
                                    <Icon className="w-6 h-6" />
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            data-testid={`nav-${item.id}`}
                            className="flex flex-col items-center gap-1 px-3 py-2"
                        >
                            <Icon
                                className={cn(
                                    'w-6 h-6 transition-colors',
                                    active ? 'text-[#2b6cee]' : 'text-gray-500'
                                )}
                            />
                            <span
                                className={cn(
                                    'text-xs font-medium transition-colors',
                                    active ? 'text-[#2b6cee]' : 'text-gray-500'
                                )}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
