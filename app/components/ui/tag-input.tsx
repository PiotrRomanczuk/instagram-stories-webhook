'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    maxTags?: number;
}

export function TagInput({ tags, onChange, placeholder = '@username', maxTags = 20 }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleAddTag = () => {
        const trimmed = inputValue.trim();

        // Don't add empty strings or duplicates
        if (!trimmed || tags.includes(trimmed)) {
            setInputValue('');
            return;
        }

        if (tags.length >= maxTags) return;

        onChange([...tags, trimmed]);
        setInputValue('');
    };

    const handleRemoveTag = (index: number) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            // Remove last tag on backspace if input is empty
            handleRemoveTag(tags.length - 1);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-gray-200 focus-within:border-indigo-500 transition min-h-12">
                {/* Tag Pills */}
                {tags.map((tag, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 text-sm font-medium"
                    >
                        <span>{tag}</span>
                        <button
                            type="button"
                            onClick={() => handleRemoveTag(index)}
                            className="p-0.5 hover:bg-indigo-200 rounded transition"
                            title="Remove tag"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}

                {/* Input Field */}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={tags.length >= maxTags}
                    className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-gray-900"
                />
            </div>

            {/* Helper Text */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400 pl-1">Press Enter to add • Backspace to remove last</p>
                <span className="text-[11px] text-gray-400 font-medium">
                    {tags.length} / {maxTags}
                </span>
            </div>
        </div>
    );
}
