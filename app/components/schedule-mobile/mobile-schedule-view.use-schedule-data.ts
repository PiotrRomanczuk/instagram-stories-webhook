'use client';

import { useMemo, useState } from 'react';
import { ContentItem } from '@/lib/types/posts';
import { format, isSameDay, getHours } from 'date-fns';
import { groupByTimeSlots } from './mobile-schedule-view.helpers';

/**
 * Hook that computes derived schedule data from scheduledItems + currentDate
 */
export function useScheduleData(
	scheduledItems: ContentItem[],
	currentDate: Date,
	statusFilter: string,
	urlStatusFilter: string | null | undefined,
) {
	const [now] = useState(() => Date.now());
	const showAllDates = urlStatusFilter === 'failed';

	const dayItems = useMemo(() => {
		if (showAllDates) return scheduledItems;
		return scheduledItems.filter(item => item.scheduledTime && isSameDay(new Date(item.scheduledTime), currentDate));
	}, [scheduledItems, currentDate, showAllDates]);

	const filteredDayItems = useMemo(() =>
		statusFilter === 'all' ? dayItems : dayItems.filter(item => item.publishingStatus === statusFilter),
		[dayItems, statusFilter]
	);

	const timeSlots = useMemo(() => groupByTimeSlots(filteredDayItems), [filteredDayItems]);
	const untimedItems = useMemo(() => filteredDayItems.filter(item => !item.scheduledTime), [filteredDayItems]);

	const hourlyFreq = useMemo(() => {
		const f = new Array(24).fill(0);
		dayItems.forEach(item => { if (item.scheduledTime) f[getHours(new Date(item.scheduledTime))]++; });
		return f;
	}, [dayItems]);

	const maxFreq = Math.max(...hourlyFreq, 1);

	const peakLabel = useMemo(() => {
		if (maxFreq <= 0) return null;
		const peak = hourlyFreq.indexOf(maxFreq);
		if (peak < 0) return null;
		const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`;
		let end = peak;
		for (let i = peak + 1; i < 24 && hourlyFreq[i] >= maxFreq * 0.5; i++) end = i;
		return `${fmt(peak)} - ${fmt(end + 1)}`;
	}, [hourlyFreq, maxFreq]);

	const failedCount = dayItems.filter(i => i.publishingStatus === 'failed').length;
	const overdueCount = dayItems.filter(i => i.publishingStatus === 'scheduled' && i.scheduledTime && i.scheduledTime < now).length;

	const itemsByDate = useMemo(() => {
		const m = new Map<string, ContentItem[]>();
		scheduledItems.forEach(item => {
			if (!item.scheduledTime) return;
			const k = format(new Date(item.scheduledTime), 'yyyy-MM-dd');
			if (!m.has(k)) m.set(k, []);
			m.get(k)!.push(item);
		});
		return m;
	}, [scheduledItems]);

	return { dayItems, filteredDayItems, timeSlots, untimedItems, hourlyFreq, maxFreq, peakLabel, failedCount, overdueCount, itemsByDate };
}
