'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Check, AlertCircle } from 'lucide-react';
import { MemeSubmission } from '@/lib/types';

interface MemeEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    meme: MemeSubmission;
    onSave: (updates: { title?: string; caption?: string }) => void;
    onCancel?: () => void;
}

export function MemeEditModal({ isOpen, onClose, meme, onSave, onCancel }: MemeEditModalProps) {
    const [editTitle, setEditTitle] = useState(meme.title || '');
    const [editCaption, setEditCaption] = useState(meme.caption || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const isVideo = meme.media_url.toLowerCase().endsWith('.mp4');

    const handleSave = async () => {
        setError('');

        // At least one field must be provided
        if (!editTitle && !editCaption) {
            setError('At least title or caption is required');
            return;
        }

        setIsSaving(true);
        try {
            const updates: { title?: string; caption?: string } = {};
            if (editTitle) updates.title = editTitle;
            if (editCaption) updates.caption = editCaption;

            onSave(updates);
            onClose();
        } catch {
            setError('Failed to save changes');
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
                        <h2 className="text-lg font-bold text-gray-900">Edit Meme Submission</h2>
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
                            <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Media Preview</div>

                            <div className="relative bg-gray-100 rounded-lg overflow-hidden h-48">
                                {isVideo ? (
                                    <video
                                        src={meme.media_url}
                                        className="w-full h-full object-cover"
                                        controls={false}
                                    />
                                ) : (
                                    <Image
                                        src={meme.media_url}
                                        alt="Meme preview"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                )}
                            </div>

                            {/* Type Badge */}
                            <div className="mt-3">
                                <span className="px-2 py-1 bg-black text-white text-[10px] font-bold rounded-lg">
                                    {isVideo ? 'VIDEO' : 'IMAGE'}
                                </span>
                            </div>
                        </div>

                        {/* Edit Fields */}
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Title (Optional)</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => {
                                        setEditTitle(e.target.value.slice(0, 100));
                                        setError('');
                                    }}
                                    placeholder="Add a title to your meme"
                                    maxLength={100}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 text-right">
                                    {editTitle.length}/100
                                </p>
                            </div>

                            {/* Caption */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Caption (Optional)</label>
                                <textarea
                                    value={editCaption}
                                    onChange={(e) => {
                                        setEditCaption(e.target.value.slice(0, 2200));
                                        setError('');
                                    }}
                                    placeholder="Add a description or caption for your meme"
                                    maxLength={2200}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 text-right">
                                    {editCaption.length}/2200
                                </p>
                            </div>
                        </div>

                        {/* Error if exists */}
                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-rose-600 uppercase tracking-tight">
                                    {error}
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
