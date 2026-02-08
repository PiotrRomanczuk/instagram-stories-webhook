'use client';

import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent } from './dialog';

interface MediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    type: 'IMAGE' | 'VIDEO';
}

export function MediaModal({ isOpen, onClose, url, type }: MediaModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent
                showCloseButton={true}
                className="bg-transparent border-none shadow-none max-w-5xl p-0 gap-0 [&>button[data-slot=dialog-close]]:text-white [&>button[data-slot=dialog-close]]:opacity-70 [&>button[data-slot=dialog-close]]:hover:opacity-100"
            >
                {/* Header/Actions */}
                <div className="flex items-center justify-between text-white px-2 mb-2">
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
                    </div>
                </div>

                {/* Media Element */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/50 bg-black flex items-center justify-center min-h-[300px]">
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
            </DialogContent>
        </Dialog>
    );
}
