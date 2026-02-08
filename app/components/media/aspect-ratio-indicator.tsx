'use client';

import { AlertTriangle, CheckCircle, Info, Loader2, ImageIcon } from 'lucide-react';
import type { AspectRatioInfo, MediaDimensions } from '@/lib/types';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Spinner } from '@/app/components/ui/spinner';

interface AspectRatioIndicatorProps {
    aspectInfo: AspectRatioInfo | null;
    dimensions: MediaDimensions | null;
    isLoading?: boolean;
    compact?: boolean;
}

// TODO: Create VideoMetadataIndicator and VideoProcessingPrompt components


export function AspectRatioIndicator({
    aspectInfo,
    dimensions,
    isLoading = false,
    compact = false
}: AspectRatioIndicatorProps) {
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner className="w-4 h-4" />
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
            <Badge variant="outline" className={`gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
                {getIcon()}
                <span>{aspectInfo.recommendation === 'perfect' ? '9:16' : `${dimensions.width}x${dimensions.height}`}</span>
            </Badge>
        );
    }

    return (
        <Alert className={`rounded-xl ${getStatusColor()}`}>
            {getIcon()}
            <AlertTitle>
                <span className="font-medium text-sm">
                    {dimensions.width} x {dimensions.height}
                </span>
                {' '}
                <span className="text-xs opacity-70">
                    (Ratio: {aspectInfo.ratio.toFixed(2)})
                </span>
            </AlertTitle>
            <AlertDescription>
                <p className="text-xs mt-1 opacity-80">
                    {aspectInfo.message}
                </p>
            </AlertDescription>
        </Alert>
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
                        <Button
                            onClick={() => onProcess({ blurBackground: false })}
                            disabled={isProcessing}
                            size="sm"
                            className="bg-gray-900 text-white hover:bg-gray-800 text-xs"
                        >
                            {isProcessing ? (
                                <span className="flex items-center gap-1.5">
                                    <Spinner className="w-3 h-3" />
                                    Processing...
                                </span>
                            ) : (
                                'Black Background'
                            )}
                        </Button>
                        <Button
                            onClick={() => onProcess({ blurBackground: true })}
                            disabled={isProcessing}
                            size="sm"
                            className="bg-indigo-600 text-white hover:bg-indigo-500 text-xs"
                        >
                            Blurred Background
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
