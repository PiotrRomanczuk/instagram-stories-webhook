'use client';

import { AlertTriangle, CheckCircle, Info, Loader2, ImageIcon } from 'lucide-react';
import type { AspectRatioInfo, MediaDimensions } from '@/lib/media/validator';

interface AspectRatioIndicatorProps {
    aspectInfo: AspectRatioInfo | null;
    dimensions: MediaDimensions | null;
    isLoading?: boolean;
    compact?: boolean;
}

export function AspectRatioIndicator({
    aspectInfo,
    dimensions,
    isLoading = false,
    compact = false
}: AspectRatioIndicatorProps) {
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing image...</span>
            </div>
        );
    }

    if (!aspectInfo || !dimensions) {
        return null;
    }

    const getStatusColor = () => {
        switch (aspectInfo.recommendation) {
            case 'perfect':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'acceptable':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'needs_padding':
            case 'needs_crop':
                return 'text-amber-600 bg-amber-50 border-amber-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getIcon = () => {
        switch (aspectInfo.recommendation) {
            case 'perfect':
                return <CheckCircle className="w-4 h-4" />;
            case 'acceptable':
                return <Info className="w-4 h-4" />;
            case 'needs_padding':
            case 'needs_crop':
                return <AlertTriangle className="w-4 h-4" />;
            default:
                return <ImageIcon className="w-4 h-4" />;
        }
    };

    if (compact) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
                {getIcon()}
                <span>{aspectInfo.recommendation === 'perfect' ? '9:16' : `${dimensions.width}×${dimensions.height}`}</span>
            </div>
        );
    }

    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${getStatusColor()}`}>
            <div className="mt-0.5">
                {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                        {dimensions.width} × {dimensions.height}
                    </span>
                    <span className="text-xs opacity-70">
                        (Ratio: {aspectInfo.ratio.toFixed(2)})
                    </span>
                </div>
                <p className="text-xs mt-1 opacity-80">
                    {aspectInfo.message}
                </p>
            </div>
        </div>
    );
}

interface ProcessingPromptProps {
    aspectInfo: AspectRatioInfo;
    onProcess: (options: { blurBackground: boolean }) => void;
    isProcessing?: boolean;
}

export function ProcessingPrompt({ aspectInfo, onProcess, isProcessing = false }: ProcessingPromptProps) {
    if (!aspectInfo.needsProcessing) {
        return null;
    }

    return (
        <div className="mt-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-800">
                        Optimize for Stories?
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                        This image doesn&apos;t fit the 9:16 Story format. We can automatically adjust it.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => onProcess({ blurBackground: false })}
                            disabled={isProcessing}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <span className="flex items-center gap-1.5">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Processing...
                                </span>
                            ) : (
                                'Black Background'
                            )}
                        </button>
                        <button
                            onClick={() => onProcess({ blurBackground: true })}
                            disabled={isProcessing}
                            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition disabled:opacity-50"
                        >
                            Blurred Background
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
