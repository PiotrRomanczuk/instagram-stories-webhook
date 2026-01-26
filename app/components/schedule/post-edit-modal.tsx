'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Check, Clock, ZoomIn } from 'lucide-react';
import { ScheduledPostWithUser } from '@/lib/types';
import { TagInput } from '../ui/tag-input';
import { DateTimePicker } from '../ui/datetime-picker';

interface PostEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: ScheduledPostWithUser;
    onSave: (newTime: Date, tags: string[]) => void;
    onCancel?: () => void;
}

export function PostEditModal({ isOpen, onClose, post, onSave, onCancel }: PostEditModalProps) {
    const [editDate, setEditDate] = useState(new Date(post.scheduledTime));
    const [editTags, setEditTags] = useState(post.userTags?.map(t => t.username) || []);
    const [isSaving, setIsSaving] = useState(false);
    const [showMediaPreview, setShowMediaPreview] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            onSave(editDate, editTags);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 flex items-center justify-between p-6 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-200 z-10">
                        <h2 className="text-lg font-bold text-gray-900">Reschedule Post</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Media Preview */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Media Preview</span>
                                <button
                                    onClick={() => setShowMediaPreview(!showMediaPreview)}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                    title="Expand preview"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                            </div>

                            <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${showMediaPreview ? 'h-96' : 'h-48'} transition-all duration-200`}>
                                {post.type === 'VIDEO' ? (
                                    <video
                                        src={post.url}
                                        className="w-full h-full object-cover"
                                        controls={false}
                                    />
                                ) : (
                                    <Image
                                        src={post.url}
                                        alt="Post preview"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                )}
                            </div>

                            {/* Type Badge */}
                            <div className="mt-3 flex items-center gap-2">
                                <span className="px-2 py-1 bg-black text-white text-[10px] font-bold rounded-lg">
                                    {post.type}
                                </span>
                                {post.caption && (
                                    <p className="text-xs text-gray-600 line-clamp-1 flex-1">
                                        {post.caption}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Edit Fields */}
                        <div className="space-y-4">
                            {/* Date & Time */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <Clock className="w-4 h-4 inline mr-1.5" />
                                    Scheduled Time
                                </label>
                                <DateTimePicker
                                    value={editDate}
                                    onChange={setEditDate}
                                    minDate={new Date()}
                                />
                                <p className="text-[10px] text-gray-400 mt-1.5 pl-1">
                                    Timezone: {new Intl.DateTimeFormat().resolvedOptions().timeZone}
                                </p>
                            </div>

                            {/* Quick Adjust Buttons */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Quick Adjust</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: '-1h', minutes: -60 },
                                        { label: '-15m', minutes: -15 },
                                        { label: '+15m', minutes: 15 },
                                        { label: '+1h', minutes: 60 },
                                    ].map(({ label, minutes }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => {
                                                const newDate = new Date(editDate);
                                                newDate.setMinutes(newDate.getMinutes() + minutes);
                                                setEditDate(newDate);
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Edit Tags</label>
                                <TagInput
                                    tags={editTags}
                                    onChange={setEditTags}
                                    placeholder="@username"
                                    maxTags={20}
                                />
                            </div>
                        </div>

                        {/* Error if exists */}
                        {post.error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                                <p className="text-xs font-bold text-rose-600 uppercase tracking-tight">
                                    Error: {post.error}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                            <Check className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
