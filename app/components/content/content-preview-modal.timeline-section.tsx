'use client';

import React from 'react';
import { ContentItem } from '@/lib/types/posts';
import { Info, Clock, CheckCircle2, Globe, AlertCircle } from 'lucide-react';
import { getFriendlyError } from '@/lib/utils/friendly-error';

interface TimelineSectionProps {
	item: ContentItem;
}

/**
 * Timeline/status section showing submission, scheduling, and publishing events
 */
export function TimelineSection({ item }: TimelineSectionProps) {
	return (
		<section className='space-y-4'>
			<div className='flex items-center justify-between'>
				<h3 className='text-xs font-black text-gray-400 uppercase tracking-[0.2em]'>Timeline</h3>
				<Info className='h-4 w-4 text-gray-200' />
			</div>

			<div className='space-y-6 relative'>
				<div className='absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-100' />

				<div className='flex gap-4 relative z-10'>
					<div className='w-8 h-8 rounded-full bg-emerald-50 border-4 border-white flex items-center justify-center text-emerald-500 shadow-sm'>
						<CheckCircle2 className='h-4 w-4' />
					</div>
					<div>
						<p className='text-xs font-black text-gray-900'>Post Submitted</p>
						<p className='text-[10px] text-gray-400 font-bold'>{new Date(item.createdAt).toLocaleString()}</p>
					</div>
				</div>

				{item.scheduledTime && (
					<div className='flex gap-4 relative z-10'>
						<div className='w-8 h-8 rounded-full bg-amber-50 border-4 border-white flex items-center justify-center text-amber-500 shadow-sm'>
							<Clock className='h-4 w-4' />
						</div>
						<div>
							<p className='text-xs font-black text-gray-900 uppercase'>Scheduled For</p>
							<p className='text-[10px] text-amber-600 font-black'>{new Date(item.scheduledTime).toLocaleString()}</p>
						</div>
					</div>
				)}

				{item.publishedAt && (
					<div className='flex gap-4 relative z-10'>
						<div className='w-8 h-8 rounded-full bg-indigo-50 border-4 border-white flex items-center justify-center text-indigo-500 shadow-sm'>
							<Globe className='h-4 w-4' />
						</div>
						<div>
							<p className='text-xs font-black text-gray-900'>Successfully Published</p>
							<p className='text-[10px] text-indigo-400 font-bold'>{new Date(item.publishedAt).toLocaleString()}</p>
						</div>
					</div>
				)}

				{item.error && (() => {
					const errorInfo = getFriendlyError(item.error);
					return (
						<div className='flex gap-4 relative z-10'>
							<div className='w-8 h-8 rounded-full bg-red-50 border-4 border-white flex items-center justify-center text-red-500 shadow-sm'>
								<AlertCircle className='h-4 w-4' />
							</div>
							<div>
								<p className='text-xs font-black text-red-900 leading-tight'>
									Publication Failed
									{item.retryCount !== undefined && item.retryCount > 0 && (
										<span className='ml-1.5 text-[10px] font-bold text-red-400'>
											({item.retryCount} {item.retryCount === 1 ? 'attempt' : 'attempts'})
										</span>
									)}
								</p>
								<p className='text-[10px] text-red-500/60 font-bold max-w-[250px]'>{errorInfo.message}</p>
								{errorInfo.action && errorInfo.actionHref && (
									<a href={errorInfo.actionHref} className='inline-block mt-1 text-[10px] font-black text-red-600 underline underline-offset-2 hover:text-red-700'>
										{errorInfo.action} &rarr;
									</a>
								)}
							</div>
						</div>
					);
				})()}
			</div>
		</section>
	);
}
