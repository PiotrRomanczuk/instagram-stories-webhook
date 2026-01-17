'use client';

import { X, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import Image from 'next/image';

interface MediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    type: 'IMAGE' | 'VIDEO';
}

export function MediaModal({ isOpen, onClose, url, type }: MediaModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl cursor-zoom-out"
                onClick={onClose}
            />

            {/* Content Container */}
            <div className="relative w-full max-w-5xl max-h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">

                {/* Header/Actions */}
                <div className="absolute -top-12 left-0 right-0 flex items-center justify-between text-white px-2">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase tracking-widest opacity-50">{type} Preview</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-white/10 rounded-full transition"
                            title="Open Original"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-transform hover:rotate-90"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Media Element */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/50 bg-black flex items-center justify-center min-h-[300px] w-full max-w-[90vw] md:max-w-none">
                    {type === 'VIDEO' ? (
                        <video
                            src={url}
                            className="max-w-full max-h-[80vh] rounded-2xl"
                            controls
                            autoPlay
                        />
                    ) : (
                        <Image
                            src={url}
                            alt="Full Preview"
                            width={1920}
                            height={1080}
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl"
                            unoptimized
                        />
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-6 flex flex-col items-center gap-3">
                    <p className="text-slate-400 text-[10px] font-mono break-all text-center max-w-md opacity-30">
                        {url}
                    </p>
                </div>
            </div>
        </div>
    );
}
