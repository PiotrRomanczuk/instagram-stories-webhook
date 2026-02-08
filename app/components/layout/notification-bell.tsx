'use client';

import {
	Bell,
	CheckCircle2,
	XCircle,
	Calendar,
	Rocket,
	Info,
	Check,
} from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/app/components/ui/popover';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Notification {
	id: string;
	type: string;
	title: string;
	message: string | null;
	created_at: string;
	read_at: string | null;
	related_id: string | null;
}

export function NotificationBell() {
	const { data, mutate } = useSWR<{ notifications: Notification[] }>(
		'/api/notifications?limit=20',
		fetcher,
		{ refreshInterval: 30000 }, // Poll every 30 seconds
	);

	const notifications = data?.notifications || [];
	const unreadCount = notifications.filter((n) => !n.read_at).length;

	const markAsRead = async (id: string) => {
		try {
			const res = await fetch('/api/notifications', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notificationId: id }),
			});
			if (res.ok) {
				mutate();
			}
		} catch (error) {
			console.error('Failed to mark notification as read', error);
		}
	};

	const markAllAsRead = async () => {
		try {
			const res = await fetch('/api/notifications', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ all: true }),
			});
			if (res.ok) {
				mutate();
				toast.success('All notifications marked as read');
			}
		} catch (error) {
			console.error('Failed to mark all notifications as read', error);
		}
	};

	const getIcon = (type: string) => {
		switch (type) {
			case 'meme_approved':
				return <CheckCircle2 className='w-5 h-5 text-emerald-500' />;
			case 'meme_rejected':
				return <XCircle className='w-5 h-5 text-rose-500' />;
			case 'meme_scheduled':
				return <Calendar className='w-5 h-5 text-indigo-500' />;
			case 'meme_published':
				return <Rocket className='w-5 h-5 text-purple-500' />;
			default:
				return <Info className='w-5 h-5 text-slate-400' />;
		}
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className={cn(
						'relative p-2.5 rounded-2xl transition-all duration-300',
						'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200 hover:text-indigo-600 shadow-sm',
						'data-[state=open]:bg-indigo-600 data-[state=open]:text-white data-[state=open]:shadow-lg data-[state=open]:shadow-indigo-200',
					)}
				>
					<Bell
						className={cn(
							'w-6 h-6',
							unreadCount > 0 && 'animate-[bell-ring_1s_ease-in-out_infinite]',
						)}
					/>
					{unreadCount > 0 && (
						<Badge className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white px-0 py-0'>
							{unreadCount > 9 ? '9+' : unreadCount}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>

			<PopoverContent
				align="end"
				sideOffset={16}
				className='w-80 md:w-96 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 p-0'
			>
				<div className='p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white'>
					<div className='flex items-center justify-between mb-1'>
						<h3 className='text-xl font-black'>Notifications</h3>
						{unreadCount > 0 && (
							<Button
								variant="ghost"
								size="xs"
								onClick={markAllAsRead}
								className='text-[10px] font-black uppercase tracking-widest text-indigo-300 hover:text-white hover:bg-transparent transition-colors h-auto px-0'
							>
								<Check className='w-3 h-3' /> Mark all read
							</Button>
						)}
					</div>
					<p className='text-xs text-slate-400 font-medium'>
						{unreadCount > 0
							? `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
							: 'You are all caught up!'}
					</p>
				</div>

				<ScrollArea className='max-h-[70vh] bg-slate-50/50'>
					{notifications.length === 0 ? (
						<div className='py-12 px-6 text-center'>
							<div className='w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4'>
								<Bell className='w-8 h-8 text-slate-300' />
							</div>
							<p className='text-slate-500 font-bold'>No notifications yet</p>
							<p className='text-xs text-slate-400 mt-1'>
								We'll let you know when things happen.
							</p>
						</div>
					) : (
						<div className='divide-y divide-slate-100'>
							{notifications.map((notification) => (
								<div
									key={notification.id}
									className={cn(
										'group p-5 flex gap-4 transition-all duration-300 hover:bg-white',
										!notification.read_at && 'bg-indigo-50/30',
									)}
								>
									<div className='flex-shrink-0 mt-1'>
										<div
											className={cn(
												'p-3 rounded-2xl transition-transform duration-500 group-hover:scale-110',
												!notification.read_at
													? 'bg-white shadow-sm'
													: 'bg-slate-100/50',
											)}
										>
											{getIcon(notification.type)}
										</div>
									</div>
									<div className='flex-1 min-w-0'>
										<div className='flex items-start justify-between gap-2'>
											<p
												className={cn(
													'text-sm leading-tight',
													!notification.read_at
														? 'font-black text-slate-900'
														: 'font-bold text-slate-600',
												)}
											>
												{notification.title}
											</p>
											{!notification.read_at && (
												<Button
													variant="ghost"
													size="icon-xs"
													onClick={(e) => {
														e.stopPropagation();
														markAsRead(notification.id);
													}}
													className='text-slate-300 hover:text-indigo-600'
													title='Mark as read'
												>
													<Check className='w-4 h-4' />
												</Button>
											)}
										</div>
										<p className='text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed'>
											{notification.message}
										</p>
										<p className='text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider'>
											{new Date(notification.created_at).toLocaleString([], {
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</p>
									</div>
								</div>
							))}
						</div>
					)}
				</ScrollArea>

				{notifications.length > 0 && (
					<div className='p-4 bg-white border-t border-slate-100 text-center'>
						<Button variant="link" className='text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:text-slate-900'>
							View all activity
						</Button>
					</div>
				)}
			</PopoverContent>

			<style jsx global>{`
				@keyframes bell-ring {
					0%,
					100% {
						transform: rotate(0);
					}
					10% {
						transform: rotate(15deg);
					}
					20% {
						transform: rotate(-10deg);
					}
					30% {
						transform: rotate(5deg);
					}
					40% {
						transform: rotate(-5deg);
					}
					50% {
						transform: rotate(0);
					}
				}
			`}</style>
		</Popover>
	);
}
