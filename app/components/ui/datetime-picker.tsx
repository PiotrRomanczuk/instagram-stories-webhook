'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';

interface DateTimePickerProps {
    value: Date;
    onChange: (date: Date) => void;
    minDate?: Date;
}

export function DateTimePicker({ value, onChange, minDate }: DateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date(value));
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const handleDayClick = (day: number) => {
        const newDate = new Date(currentMonth);
        newDate.setDate(day);
        newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
        onChange(newDate);
        setIsOpen(false);
    };

    const handleTimeChange = (hours: number, minutes: number) => {
        const newDate = new Date(value);
        newDate.setHours(hours, minutes, 0, 0);
        onChange(newDate);
    };

    // Time options (15-minute increments)
    const timeOptions = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            timeOptions.push({ hours: h, minutes: m });
        }
    }

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

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-indigo-500 outline-none transition text-left flex items-center justify-between group hover:border-indigo-300"
            >
                <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                    {formatDateTime(value)}
                </span>
                {isOpen && <X className="w-4 h-4 text-gray-400" />}
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-full md:w-96">
                    {/* Quick Picks */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {getQuickPickOptions().map((option) => (
                            <button
                                key={option.label}
                                type="button"
                                onClick={() => handleQuickPick(option.getDate)}
                                className="px-3 py-2 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition border border-indigo-100"
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        {/* Month/Year Navigation */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                className="p-1 hover:bg-gray-100 rounded transition"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold text-gray-700">
                                {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                className="p-1 hover:bg-gray-100 rounded transition"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 mb-4">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
                                    {day}
                                </div>
                            ))}
                            {days.map((day, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => day && handleDayClick(day)}
                                    disabled={!day}
                                    className={`
                                        py-2 text-xs font-medium rounded transition
                                        ${!day ? 'text-transparent' : ''}
                                        ${day === value.getDate() && currentMonth.getMonth() === value.getMonth() && currentMonth.getFullYear() === value.getFullYear()
                                            ? 'bg-indigo-600 text-white'
                                            : day
                                                ? 'text-gray-700 hover:bg-gray-100'
                                                : ''
                                        }
                                        ${day && new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) < (minDate || new Date())
                                            ? 'text-gray-300 cursor-not-allowed hover:bg-transparent'
                                            : ''
                                        }
                                    `}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>

                        {/* Time Picker */}
                        <div className="border-t border-gray-200 pt-4">
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Time</label>
                            <div className="flex gap-2">
                                <select
                                    value={String(value.getHours()).padStart(2, '0')}
                                    onChange={(e) => handleTimeChange(parseInt(e.target.value), value.getMinutes())}
                                    className="flex-1 px-2 py-2 text-xs font-bold rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
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
                                    className="flex-1 px-2 py-2 text-xs font-bold rounded-lg border border-gray-200 focus:border-indigo-500 outline-none"
                                >
                                    {[0, 15, 30, 45].map(m => (
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
