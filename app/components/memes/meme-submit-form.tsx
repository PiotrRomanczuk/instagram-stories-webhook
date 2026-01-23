'use client';

import { useState, useRef } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X, CheckCircle2, Loader, ImageIcon, Type, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/config/supabase';
import { useMediaValidation } from '@/app/hooks/use-media-validation';
import { AspectRatioIndicator, ProcessingPrompt } from '../media/aspect-ratio-indicator';
import { submitMemeSchema, type SubmitMemeInput } from '@/lib/validations/meme.schema';
import { Panel } from '../ui/panel';
import Image from 'next/image';

interface MemeSubmitFormProps {
    onSubmitted: () => void;
}

export function MemeSubmitForm({ onSubmitted }: MemeSubmitFormProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const mediaValidation = useMediaValidation();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setValue,
        watch,
        reset
    } = useForm<SubmitMemeInput>({
        resolver: zodResolver(submitMemeSchema) as unknown as Resolver<SubmitMemeInput>
    });

    const mediaUrl = watch('mediaUrl');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
            toast.error('Please upload an image or video file.');
            return;
        }

        if (isImage) {
            await mediaValidation.validateFile(file);
        }

        setUploading(true);
        setUploadProgress(10);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `memes/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            setUploadProgress(30);

            const { error } = await supabase.storage
                .from('stories') // Using 'stories' bucket as per existing media pattern
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            setUploadProgress(80);

            const { data: { publicUrl } } = supabase.storage
                .from('stories')
                .getPublicUrl(filePath);

            setUploadProgress(100);
            setValue('mediaUrl', publicUrl);
            setValue('storagePath', filePath);
            setMediaType(isVideo ? 'VIDEO' : 'IMAGE');
            toast.success('Media uploaded successfully');

            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 500);

        } catch (error: unknown) {
            console.error('Upload error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(`Upload failed: ${errorMessage}`);
            setUploading(false);
        }
    };

    const handleProcessImage = async (options: { blurBackground: boolean }) => {
        if (!mediaUrl || mediaType !== 'IMAGE') return;

        setIsProcessing(true);
        try {
            const response = await fetch('/api/media/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: mediaUrl,
                    blurBackground: options.blurBackground,
                    backgroundColor: '#000000'
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Processing failed');

            if (data.wasProcessed) {
                setValue('mediaUrl', data.processedUrl);
                await mediaValidation.validateUrl(data.processedUrl);
                toast.success('Image optimized for Stories!');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClearMedia = () => {
        setValue('mediaUrl', '');
        setValue('storagePath', '');
        mediaValidation.reset();
    };

    const onSubmit = async (data: SubmitMemeInput) => {
        try {
            const res = await fetch('/api/memes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                toast.success('Meme submitted successfully! Waiting for admin review.');
                reset();
                onSubmitted();
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || 'Failed to submit meme');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(errorMessage);
        }
    };

    return (
        <Panel title="Submit New Meme" icon={<ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Media Upload Area */}
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Meme Media</label>
                    
                    {!mediaUrl ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-12 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-all group ${uploading ? 'pointer-events-none' : ''}`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                                accept="image/*,video/mp4"
                            />

                            {uploading ? (
                                <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600 animate-pulse">Uploading Meme...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="p-5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition duration-500">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <p className="mt-5 text-slate-600 dark:text-slate-300 font-bold">Drop your meme here or browse</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">MP4, JPEG, PNG • Up to 50MB</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative group rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-lg">
                                {mediaType === 'VIDEO' ? (
                                    <video src={mediaUrl} className="w-full h-64 object-cover" controls={false} />
                                ) : (
                                    <div className="relative h-64 w-full">
                                        <Image
                                            src={mediaUrl}
                                            alt="Preview"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                                    <button
                                        type="button"
                                        onClick={handleClearMedia}
                                        className="p-4 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-red-500 transition-all duration-300"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                    <div className="p-4 bg-green-500 rounded-2xl text-white shadow-lg shadow-green-200">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                </div>
                                
                                {mediaType === 'IMAGE' && mediaValidation.aspectInfo && (
                                    <div className="absolute top-4 right-4">
                                        <AspectRatioIndicator
                                            aspectInfo={mediaValidation.aspectInfo}
                                            dimensions={mediaValidation.dimensions}
                                            compact
                                        />
                                    </div>
                                )}
                            </div>

                            {mediaType === 'IMAGE' && mediaValidation.aspectInfo && (
                                <div className="space-y-3">
                                    <AspectRatioIndicator
                                        aspectInfo={mediaValidation.aspectInfo}
                                        dimensions={mediaValidation.dimensions}
                                        isLoading={mediaValidation.isLoading}
                                    />
                                    <ProcessingPrompt
                                        aspectInfo={mediaValidation.aspectInfo}
                                        onProcess={handleProcessImage}
                                        isProcessing={isProcessing}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <Type className="w-4 h-4 text-slate-400" /> Meme Title
                        </label>
                        <input
                            type="text"
                            {...register('title')}
                            placeholder="A catchy title..."
                            className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium"
                        />
                        {errors.title && <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.title.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-slate-400" /> IG Caption
                        </label>
                        <input
                            type="text"
                            {...register('caption')}
                            placeholder="Add a fun caption..."
                            className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium"
                        />
                        {errors.caption && <p className="text-red-500 text-xs mt-1.5 font-bold">{errors.caption.message}</p>}
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || uploading || !mediaUrl}
                        className="w-full px-8 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-indigo-700 transition-all duration-300 shadow-xl shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                    >
                        {isSubmitting ? (
                            <><Loader className="w-5 h-5 animate-spin" /> Submitting...</>
                        ) : (
                            <><Upload className="w-5 h-5 group-hover:-translate-y-1 transition-transform" /> Submit Meme for Review</>
                        )}
                    </button>
                    {!mediaUrl && (
                        <p className="text-center text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                            <AlertCircle className="w-3.5 h-3.5" /> Upload media to submit
                        </p>
                    )}
                </div>
            </form>
        </Panel>
    );
}
