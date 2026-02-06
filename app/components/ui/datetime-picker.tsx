'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, X, Sparkles, Eye, Check } from 'lucide-react';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { DrumPicker } from './drum-picker';
import { DailyLoadChart } from './daily-load-chart';

interface DateTimePickerProps {
    value: Date;
    onChange: (date: Date) => void;
    minDate?: Date;
    hideQuickPicks?: boolean;
    /** Hourly load data for the daily chart (hour -> count) */
    hourlyLoad?: Record<number, number>;
    /** Callback when user confirms on mobile */
    onConfirm?: () => void;
    /** Callback for story preview */
    onPreview?: () => void;
}

const BEST_TIMES = [
    { label: '9:00 AM', hours: 9, minutes: 0 },
    { label: '12:00 PM', hours: 12, minutes: 0 },
    { label: '6:30 PM', hours: 18, minutes: 30 },
];

export function DateTimePicker({ value, onChange, minDate, hideQuickPicks, hourlyLoad, onConfirm, onPreview }: DateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date(value));
    const containerRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Drum picker state (derived from value)
    const hours12 = value.getHours() % 12 || 12;
    const isPM = value.getHours() >= 12;
    const minuteValue = value.getMinutes();

    // Generate day items for drum picker (next 30 days)
    const dayItems = useMemo(() => {
        const items: { label: string; date: Date }[] = [];
        const now = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() + i);
            d.setHours(value.getHours(), value.getMinutes(), 0, 0);
            const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            items.push({ label, date: d });
        }
        return items;
    }, [value]);

    const selectedDayIndex = useMemo(() => {
        const valueDate = new Date(value);
        valueDate.setHours(0, 0, 0, 0);
        return dayItems.findIndex((item) => {
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === valueDate.getTime();
        });
    }, [value, dayItems]);

    const hourItems = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const minuteItems = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
    const ampmItems = ['AM', 'PM'];

    const handleDrumDayChange = (index: number) => {
        const newDate = new Date(dayItems[index].date);
        newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
        onChange(newDate);
    };

    const handleDrumHourChange = (index: number) => {
        const hour12 = index + 1;
        const hour24 = isPM ? (hour12 === 12 ? 12 : hour12 + 12) : (hour12 === 12 ? 0 : hour12);
        const newDate = new Date(value);
        newDate.setHours(hour24, value.getMinutes(), 0, 0);
        onChange(newDate);
    };

    const handleDrumMinuteChange = (index: number) => {
        const newDate = new Date(value);
        newDate.setHours(value.getHours(), index, 0, 0);
        onChange(newDate);
    };

    const handleDrumAmPmChange = (index: number) => {
        const newPM = index === 1;
        if (newPM === isPM) return;
        const newDate = new Date(value);
        const currentHour = newDate.getHours();
        newDate.setHours(newPM ? currentHour + 12 : currentHour - 12, value.getMinutes(), 0, 0);
        onChange(newDate);
    };

    const handleBestTimeClick = (hours: number, minutes: number) => {
        const newDate = new Date(value);
        newDate.setHours(hours, minutes, 0, 0);
        onChange(newDate);
    };

    // Quick pick options
    const getQuickPickOptions = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return [
            {
                label: 'In 1 hour',
                getDate: () => {
                    const d = new Date(now);
                    d.setHours(d.getHours() + 1);
                    d.setMinutes(0, 0, 0);
                    return d;
                }
            },
            {
                label: 'Tomorrow 9am',
                getDate: () => {
                    const d = new Date(tomorrow);
                    d.setHours(9, 0, 0, 0);
                    return d;
                }
            },
            {
                label: 'Tomorrow noon',
                getDate: () => {
                    const d = new Date(tomorrow);
                    d.setHours(12, 0, 0, 0);
                    return d;
                }
            },
            {
                label: 'Tomorrow 6pm',
                getDate: () => {
                    const d = new Date(tomorrow);
                    d.setHours(18, 0, 0, 0);
                    return d;
                }
            }
        ];
    };

    // Handle quick pick
    const handleQuickPick = (getDate: () => Date) => {
        const newDate = getDate();
        onChange(newDate);
        setIsOpen(false);
    };

    // Calendar grid
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const days = [];
    const firstDay = getFirstDayOfMonth(currentMonth);
    const daysInMonth = getDaysInMonth(currentMonth);

    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const handleDayClick = (day: number) => {
        const newDate = new Date(currentMonth);
        newDate.setDate(day);
        newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
        onChange(newDate);
        if (!isMobile) setIsOpen(false);
    };

    const handleTimeChange = (hours: number, minutes: number) => {
        const newDate = new Date(value);
        newDate.setHours(hours, minutes, 0, 0);
        onChange(newDate);
    };

    // Format display
    const formatDateTime = (date: Date) => {
        return date.toLocaleString([], {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Mobile drum picker view
    if (isMobile && isOpen) {
        return (
            <div ref={containerRef} className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-[#2b6cee] outline-none transition text-left flex items-center justify-between group hover:border-[#2b6cee]/50"
                >
                    <span className="flex items-center gap-2 truncate">
                        <Clock className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-[#2b6cee] dark:text-slate-500" />
                        <span className="truncate">{formatDateTime(value)}</span>
                    </span>
                    <X className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                </button>

                {/* Mobile bottom sheet style picker */}
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
                    <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white shadow-2xl dark:bg-[#1a1f2e]">
                        {/* Handle */}
                        <div className="flex justify-center pt-2 pb-3">
                            <div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-slate-600" />
                        </div>

                        {/* Best Times Chips */}
                        <div className="px-4 pb-3">
                            <div className="mb-2 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-[#2b6cee]" />
                                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">Best Times</span>
                            </div>
                            <div className="flex gap-2">
                                {BEST_TIMES.map((time) => (
                                    <button
                                        key={time.label}
                                        type="button"
                                        onClick={() => handleBestTimeClick(time.hours, time.minutes)}
                                        className={cn(
                                            'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                                            value.getHours() === time.hours && value.getMinutes() === time.minutes
                                                ? 'bg-[#2b6cee] text-white'
                                                : 'bg-[#2b6cee]/10 text-[#2b6cee] hover:bg-[#2b6cee]/20 dark:bg-[#2b6cee]/20 dark:hover:bg-[#2b6cee]/30'
                                        )}
                                    >
                                        {time.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Daily load chart */}
                        {hourlyLoad && (
                            <div className="px-4 pb-3">
                                <DailyLoadChart
                                    hourlyLoad={hourlyLoad}
                                    selectedHour={value.getHours()}
                                    onHourSelect={(hour) => handleTimeChange(hour, value.getMinutes())}
                                />
                            </div>
                        )}

                        {/* Drum Pickers */}
                        <div className="flex items-center justify-center gap-1 px-4 py-4">
                            <DrumPicker
                                items={dayItems.map((d) => d.label)}
                                selectedIndex={selectedDayIndex >= 0 ? selectedDayIndex : 0}
                                onSelect={handleDrumDayChange}
                                label="Date"
                                className="flex-[2]"
                            />
                            <DrumPicker
                                items={hourItems}
                                selectedIndex={hours12 - 1}
                                onSelect={handleDrumHourChange}
                                label="Hour"
                                className="flex-1"
                            />
                            <DrumPicker
                                items={minuteItems}
                                selectedIndex={minuteValue}
                                onSelect={handleDrumMinuteChange}
                                label="Min"
                                className="flex-1"
                            />
                            <DrumPicker
                                items={ampmItems}
                                selectedIndex={isPM ? 1 : 0}
                                onSelect={handleDrumAmPmChange}
                                label=""
                                className="w-16"
                                visibleItems={3}
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 px-4 pb-4">
                            {onPreview && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onPreview();
                                    }}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                                >
                                    <Eye className="h-4 w-4" />
                                    Preview Story
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    onConfirm?.();
                                }}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2b6cee] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2b6cee]/90"
                            >
                                <Check className="h-4 w-4" />
                                Confirm Time
                            </button>
                        </div>

                        {/* Safe area */}
                        <div className="h-[env(safe-area-inset-bottom)]" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-[#2b6cee] outline-none transition text-left flex items-center justify-between group hover:border-[#2b6cee]/50"
            >
                <span className="flex items-center gap-2 truncate">
                    <Clock className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-[#2b6cee] dark:text-slate-500" />
                    <span className="truncate">{formatDateTime(value)}</span>
                </span>
                {isOpen && <X className="w-4 h-4 text-gray-400 dark:text-slate-500" />}
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-2 bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-4 w-full md:w-96">
                    {/* Quick Picks */}
                    {!hideQuickPicks && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {getQuickPickOptions().map((option) => (
                                <button
                                    key={option.label}
                                    type="button"
                                    onClick={() => handleQuickPick(option.getDate)}
                                    className="px-3 py-2 text-xs font-bold bg-[#2b6cee]/10 text-[#2b6cee] rounded-lg hover:bg-[#2b6cee]/20 transition border border-[#2b6cee]/20 dark:bg-[#2b6cee]/20 dark:hover:bg-[#2b6cee]/30 dark:border-[#2b6cee]/30"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className={hideQuickPicks ? '' : 'border-t border-gray-200 dark:border-slate-700 pt-4'}>
                        {/* Month/Year Navigation */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                            </button>
                            <span className="text-sm font-bold text-gray-700 dark:text-white">
                                {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 mb-4">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-xs font-bold text-gray-500 dark:text-slate-400 py-2">
                                    {day}
                                </div>
                            ))}
                            {days.map((day, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => day && handleDayClick(day)}
                                    disabled={!day}
                                    className={cn(
                                        'min-h-[44px] py-2 text-xs font-medium rounded transition',
                                        !day && 'text-transparent',
                                        day === value.getDate() && currentMonth.getMonth() === value.getMonth() && currentMonth.getFullYear() === value.getFullYear()
                                            ? 'bg-[#2b6cee] text-white'
                                            : day
                                                ? 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                                : '',
                                        day && new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) < (minDate || new Date())
                                            && 'text-gray-300 dark:text-slate-600 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent'
                                    )}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>

                        {/* Time Picker */}
                        <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase">Time</label>
                            <div className="flex gap-2">
                                <select
                                    value={String(value.getHours()).padStart(2, '0')}
                                    onChange={(e) => handleTimeChange(parseInt(e.target.value), value.getMinutes())}
                                    className="flex-1 min-h-[44px] px-2 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#2b6cee] outline-none"
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={String(i).padStart(2, '0')}>
                                            {String(i).padStart(2, '0')}:00
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={String(value.getMinutes()).padStart(2, '0')}
                                    onChange={(e) => handleTimeChange(value.getHours(), parseInt(e.target.value))}
                                    className="flex-1 min-h-[44px] px-2 py-2 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#2b6cee] outline-none"
                                >
                                    {Array.from({ length: 60 }, (_, m) => (
                                        <option key={m} value={String(m).padStart(2, '0')}>
                                            :{String(m).padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
