'use client';

import { useState, useEffect } from 'react';
import { Maximize2, AlertTriangle, CheckCircle } from 'lucide-react';
import { analyzeAspectRatio } from '@/lib/media/validator';
import type { AspectRatioInfo, MediaDimensions } from '@/lib/types';
import { Badge } from '@/app/components/ui/badge';

interface ImageDimensionsBadgeProps {
    imageUrl: string;
    compact?: boolean;
}

export function ImageDimensionsBadge({ imageUrl, compact = false }: ImageDimensionsBadgeProps) {
    const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
    const [aspectInfo, setAspectInfo] = useState<AspectRatioInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!imageUrl) return;

        const img = new window.Image();
        img.onload = () => {
            const dims = { width: img.naturalWidth, height: img.naturalHeight };
            setDimensions(dims);
            setAspectInfo(analyzeAspectRatio(dims));
            setLoading(false);
        };
        img.onerror = () => {
            setLoading(false);
        };
        img.src = imageUrl;
    }, [imageUrl]);

    if (loading || !dimensions || !aspectInfo) {
        return null;
    }

    const getStatusColor = () => {
        switch (aspectInfo.recommendation) {
            case 'perfect':
                return 'bg-emerald-500/80 text-white';
            case 'acceptable':
                return 'bg-blue-500/80 text-white';
            case 'needs_padding':
            case 'needs_crop':
                return 'bg-amber-500/80 text-white';
            default:
                return 'bg-black/50 text-white';
        }
    };

    const getIcon = () => {
        switch (aspectInfo.recommendation) {
            case 'perfect':
                return <CheckCircle className="w-3 h-3" />;
            case 'acceptable':
                return <Maximize2 className="w-3 h-3" />;
            case 'needs_padding':
            case 'needs_crop':
                return <AlertTriangle className="w-3 h-3" />;
            default:
                return <Maximize2 className="w-3 h-3" />;
        }
    };

    const getRatioLabel = () => {
        const ratio = dimensions.width / dimensions.height;
        if (Math.abs(ratio - 1) < 0.05) return '1:1';
        if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9';
        if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16';
        if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3';
        if (Math.abs(ratio - 3 / 2) < 0.05) return '3:2';
        if (Math.abs(ratio - 4 / 5) < 0.05) return '4:5';
        return `${ratio.toFixed(1)}:1`;
    };

    if (compact) {
        return (
            <Badge className={`gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold backdrop-blur-sm border-transparent ${getStatusColor()}`}>
                {getIcon()}
                <span>{getRatioLabel()}</span>
            </Badge>
        );
    }

    return (
        <Badge className={`gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm border-transparent ${getStatusColor()}`}>
            {getIcon()}
            <span>{dimensions.width}x{dimensions.height}</span>
            <span className="opacity-70">({getRatioLabel()})</span>
        </Badge>
    );
}

interface AspectRatioOverlayProps {
    imageUrl: string;
    type: 'IMAGE' | 'VIDEO';
}

export function AspectRatioOverlay({ imageUrl, type }: AspectRatioOverlayProps) {
    const [dimensions, setDimensions] = useState<MediaDimensions | null>(null);
    const [aspectInfo, setAspectInfo] = useState<AspectRatioInfo | null>(null);

    useEffect(() => {
        if (!imageUrl || type !== 'IMAGE') return;

        const img = new window.Image();
        img.onload = () => {
            const dims = { width: img.naturalWidth, height: img.naturalHeight };
            setDimensions(dims);
            setAspectInfo(analyzeAspectRatio(dims));
        };
        img.src = imageUrl;
    }, [imageUrl, type]);

    if (!dimensions || !aspectInfo || type !== 'IMAGE') {
        return null;
    }

    // Only show overlay if the image needs processing
    if (aspectInfo.isIdeal || aspectInfo.isAcceptable) {
        return null;
    }

    // Calculate how the image would appear in a 9:16 frame
    const originalRatio = dimensions.width / dimensions.height;
    const storyRatio = 9 / 16; // 0.5625

    // Determine crop/pad visualization
    let visualization: 'too_wide' | 'too_tall' | 'ok' = 'ok';
    if (originalRatio > storyRatio * 1.1) {
        visualization = 'too_wide';
    } else if (originalRatio < storyRatio * 0.9) {
        visualization = 'too_tall';
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Show crop lines for too wide images */}
            {visualization === 'too_wide' && (
                <>
                    {/* Left crop indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-[15%] bg-gradient-to-r from-red-500/30 to-transparent border-r-2 border-red-400/50 border-dashed" />
                    {/* Right crop indicator */}
                    <div className="absolute right-0 top-0 bottom-0 w-[15%] bg-gradient-to-l from-red-500/30 to-transparent border-l-2 border-red-400/50 border-dashed" />
                    {/* Warning label */}
                    <Badge className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white text-[9px] font-bold rounded-full backdrop-blur-sm border-transparent">
                        <AlertTriangle className="w-3 h-3" />
                        Sides will be cropped
                    </Badge>
                </>
            )}

            {/* Show padding indicators for square/landscape images */}
            {visualization === 'too_tall' && (
                <>
                    {/* Top padding indicator */}
                    <div className="absolute left-0 right-0 top-0 h-[10%] bg-gradient-to-b from-amber-500/30 to-transparent border-b-2 border-amber-400/50 border-dashed" />
                    {/* Bottom padding indicator */}
                    <div className="absolute left-0 right-0 bottom-0 h-[10%] bg-gradient-to-t from-amber-500/30 to-transparent border-t-2 border-amber-400/50 border-dashed" />
                </>
            )}
        </div>
    );
}
