import React, { useState, useEffect } from 'react';
import { Calendar, Loader } from 'lucide-react';
import { Panel } from '../ui/panel';

interface ScheduleFormProps {
    onScheduled: () => void;
}

export function ScheduleForm({ onScheduled }: ScheduleFormProps) {
    const [url, setUrl] = useState('');
    const [type, setType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [scheduling, setScheduling] = useState(false);

    useEffect(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        setScheduledDate(now.toISOString().split('T')[0]);
        setScheduledTime(now.toTimeString().slice(0, 5));
    }, []);

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setScheduling(true);

        try {
            const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
            const res = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    type,
                    scheduledTime: scheduledDateTime.toISOString(),
                }),
            });

            if (res.ok) {
                alert('✅ Post scheduled successfully');
                setUrl('');
                onScheduled();
            } else {
                const data = await res.json();
                alert(`❌ Error: ${data.error}`);
            }
        } catch (error: any) {
            alert(`❌ Error: ${error.message}`);
        } finally {
            setScheduling(false);
        }
    };

    return (
        <Panel title="Schedule New Post" icon={<Calendar className="w-6 h-6" />}>
            <form onSubmit={handleSchedule} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Media URL</label>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Media Type</label>
                    <div className="flex gap-4">
                        {(['IMAGE', 'VIDEO'] as const).map((mType) => (
                            <label key={mType} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value={mType}
                                    checked={type === mType}
                                    onChange={(e) => setType(e.target.value as any)}
                                    className="w-4 h-4 text-indigo-600"
                                />
                                <span className="font-semibold text-gray-700">{mType.charAt(0) + mType.slice(1).toLowerCase()}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
                        <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Time</label>
                        <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={scheduling}
                    className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {scheduling ? <><Loader className="w-5 h-5 animate-spin" /> Scheduling...</> : <><Calendar className="w-5 h-5" /> Schedule Post</>}
                </button>
            </form>
        </Panel>
    );
}
