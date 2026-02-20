'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactPlayer from 'react-player';
import { extractThumbnailFromVideo } from '@/lib/media/client-utils';
import { cn } from '@/lib/utils';
import { Loader2, Play, Video, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface UniversalVideoPlayerProps {
    url: string;
    thumbnailUrl?: string | null;
    controls?: boolean;
    playing?: boolean;
    muted?: boolean;
    loop?: boolean;
    className?: string;
    width?: string | number;
    height?: string | number;
    light?: boolean | string; // If true/string, shows thumbnail and plays on click
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onReady?: () => void;
    onError?: (error: any) => void;
    contain?: boolean; // If true, uses object-contain, otherwise cover
    rounded?: boolean; // Standard border radius
    showPlaceholder?: boolean; // If true, shows a video icon while loading/on error
}

export function UniversalVideoPlayer({
    url,
    thumbnailUrl,
    controls = true,
    playing = false,
    muted = false,
    loop = false,
    className,
    width = '100%',
    height = '100%',
    light = false,
    onPlay,
    onPause,
    onEnded,
    onReady,
    onError,
    contain = false,
    rounded = false,
    showPlaceholder = true,
}: UniversalVideoPlayerProps) {
    const [hasWindow, setHasWindow] = useState(false);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);
    const [error, setError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setHasWindow(true);

        if (typeof window !== 'undefined' && 'IntersectionObserver' in window && containerRef.current) {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.disconnect();
                    }
                },
                { threshold: 0.1 }
            );
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        } else {
            setIsVisible(true);
        }
    }, []);

    // Generate thumbnail if needed and not provided, but only when visible
    useEffect(() => {
        let isMounted = true;
        if (!thumbnailUrl && !generatedThumbnail && url && hasWindow && isVisible) {
            setIsLoadingThumbnail(true);
            extractThumbnailFromVideo(url).then((thumb) => {
                if (isMounted) {
                    if (thumb) {
                        setGeneratedThumbnail(thumb);
                    }
                    setIsLoadingThumbnail(false);
                }
            }).catch(() => {
                if (isMounted) setIsLoadingThumbnail(false);
            });
        }
        return () => {
            isMounted = false;
        };
    }, [url, thumbnailUrl, generatedThumbnail, hasWindow, isVisible]);

    const effectiveLight = light
        ? (typeof light === 'string' ? light : (thumbnailUrl || generatedThumbnail || (isReady ? true : false)))
        : false;

    const handleReady = useCallback(() => {
        setIsReady(true);
        if (onReady) onReady();
    }, [onReady]);

    const handleError = useCallback((err: any) => {
        console.error('Video player error:', err);
        setError(true);
        if (onError) onError(err);
    }, [onError]);

    if (!hasWindow) {
        return (
            <div
                className={cn(
                    'relative bg-black flex items-center justify-center',
                    rounded && 'rounded-xl overflow-hidden',
                    className
                )}
                style={{ width, height }}
            >
                <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative overflow-hidden bg-black',
                rounded && 'rounded-xl',
                className
            )}
            style={{ width, height }}
        >
            <ReactPlayer
                {...({
                    url,
                    controls,
                    playing,
                    muted,
                    loop,
                    width: '100%',
                    height: '100%',
                    light: effectiveLight,
                    playIcon: (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/10 hover:bg-black/20 transition-colors cursor-pointer group">
                            <div className="rounded-full bg-black/50 p-4 backdrop-blur-sm group-hover:scale-110 transition-transform">
                                <Play className="h-8 w-8 text-white ml-1" fill="white" />
                            </div>
                        </div>
                    ),
                    playsinline: true,
                    onPlay,
                    onPause,
                    onEnded,
                    onReady: handleReady,
                    onError: handleError,
                    config: {
                        file: {
                            attributes: {
                                style: {
                                    width: '100%',
                                    height: '100%',
                                    objectFit: contain ? 'contain' : 'cover',
                                },
                            },
                        },
                    },
                } as any)}
            />

            {/* Fallback rendering for custom light mode or loading states if ReactPlayer's light mode isn't sufficient or if we want custom overlays */}
            {/* Show placeholder if not ready AND not in light mode AND not playing */}
            {!isReady && !effectiveLight && !playing && !error && showPlaceholder && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-10 pointer-events-none transition-opacity duration-300">
                    <Video className="w-8 h-8 text-white/20 animate-pulse mb-2" />
                    <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
                </div>
            )}

            {/* If we are playing but not ready, show a subtle spinner on top */}
            {!isReady && playing && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10 pointer-events-none">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 text-gray-400">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <span className="text-xs font-medium">Failed to load video</span>
                </div>
            )}
        </div>
    );
}
