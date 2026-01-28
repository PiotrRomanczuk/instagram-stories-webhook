'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableCaptionProps {
    caption: string;
    maxLines?: number;
    className?: string;
    showCharCount?: boolean;
    maxChars?: number;
}

export function ExpandableCaption({
    caption,
    maxLines = 2,
    className = '',
    showCharCount = false,
    maxChars = 2200
}: ExpandableCaptionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!caption || caption.trim() === '') {
        return (
            <p className={`text-slate-400 italic text-sm ${className}`}>
                No caption
            </p>
        );
    }

    // Simple approximation: if caption is longer than ~100 chars per line, show expand button
    const needsExpansion = caption.length > (maxLines * 50);

    return (
        <div className={`relative ${className}`}>
            <p
                className={`text-slate-700 text-sm leading-relaxed ${
                    !isExpanded && needsExpansion ? `line-clamp-${maxLines}` : ''
                }`}
                style={!isExpanded && needsExpansion ? {
                    display: '-webkit-box',
                    WebkitLineClamp: maxLines,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                } : {}}
            >
                {caption}
            </p>

            {/* Gradient fade for collapsed state */}
            {!isExpanded && needsExpansion && (
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}

            {/* Expand/Collapse button */}
            {needsExpansion && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium text-xs transition"
                >
                    {isExpanded ? (
                        <>
                            Show less
                            <ChevronUp className="w-3 h-3" />
                        </>
                    ) : (
                        <>
                            Read more
                            <ChevronDown className="w-3 h-3" />
                        </>
                    )}
                </button>
            )}

            {/* Character count badge */}
            {showCharCount && (
                <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={`font-medium ${
                        caption.length > maxChars ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                        {caption.length} / {maxChars} characters
                    </span>
                </div>
            )}
        </div>
    );
}
