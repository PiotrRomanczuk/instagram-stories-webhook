'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Calendar, Loader, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Panel } from '../ui/panel';
import { supabase } from '@/lib/config/supabase';
import { useMediaValidation } from '@/app/hooks/use-media-validation';
import { AspectRatioIndicator, ProcessingPrompt } from '../media/aspect-ratio-indicator';
import { createScheduledPostSchema, type CreateScheduledPostInput } from '@/lib/validations/post.schema';

interface ScheduleFormProps {
    onScheduled: () => void;
}

export function ScheduleForm({ onScheduled }: ScheduleFormProps) {
    // React Hook Form setup with Zod validation
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setValue,
        watch,
        reset,
        control
    } = useForm<CreateScheduledPostInput>({
        resolver: zodResolver(createScheduledPostSchema) as unknown as Resolver<CreateScheduledPostInput>,
        defaultValues: {
            mediaUrl: '',
            caption: '',
            scheduledFor: (() => {
                const now = new Date();
                now.setMinutes(now.getMinutes() + 5);
                return now;
            })(),
            userTags: [],
            hashtagTags: []
        }
    });

    // Watch form values
    const mediaUrl = watch('mediaUrl');

    // Local state for UI
    const [type, setType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Media validation state
    const mediaValidation = useMediaValidation();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
            toast.error('Please upload an image or video file.');
            return;
        }

        // Validate aspect ratio for images before upload
        if (isImage) {
            await mediaValidation.validateFile(file);
        }

        setUploading(true);
        setUploadProgress(10);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            setUploadProgress(30);

            const { error } = await supabase.storage
                .from('stories')
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
            setType(isVideo ? 'VIDEO' : 'IMAGE');
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

    // Handle image processing for non-9:16 images
    const handleProcessImage = async (options: { blurBackground: boolean }) => {
        if (!mediaUrl || type !== 'IMAGE') return;

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

            if (!response.ok) {
                throw new Error(data.error || 'Processing failed');
            }

            if (data.wasProcessed) {
                setValue('mediaUrl', data.processedUrl);
                // Re-validate the processed image
                await mediaValidation.validateUrl(data.processedUrl);
                toast.success('Image optimized for Stories!');
            } else {
                toast.info('Image already optimized');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Processing failed';
            toast.error(message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Clear media and reset validation
    const handleClearMedia = () => {
        setValue('mediaUrl', '');
        mediaValidation.reset();
    };

    // Form submit handler
    const onSubmit = async (data: CreateScheduledPostInput) => {
        try {
            const res = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: data.mediaUrl,
                    type,
                    scheduledTime: data.scheduledFor.toISOString(),
                    userTags: data.userTags?.map(username => ({
                        username,
                        x: 0.5,
                        y: 0.5
                    })) || [],
                    caption: data.caption
                }),
            });

            if (res.ok) {
                toast.success('Post scheduled successfully');
                reset();
                onScheduled();
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || 'Failed to schedule post');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(errorMessage);
        }
    };

    // Helper to format date for input
    const formatDateForInput = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const formatTimeForInput = (date: Date) => {
        return date.toTimeString().slice(0, 5);
    };

    return (
        <Panel title="Schedule New Post" icon={<Calendar className="w-6 h-6" />}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Media Selection */}
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Add Story Content</label>

                    {!mediaUrl ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10 transition group ${uploading ? 'pointer-events-none' : ''}`}
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
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">Uploading Media...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition duration-300">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Click or drag to upload photo/video</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Max 50MB • MP4, JPEG, PNG</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="relative group rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                                {type === 'VIDEO' ? (
                                    <video src={mediaUrl} className="w-full h-48 object-cover" controls={false} />
                                ) : (
                                    <Image
                                        src={mediaUrl}
                                        alt="To upload"
                                        width={400}
                                        height={192}
                                        className="w-full h-48 object-cover"
                                        unoptimized
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleClearMedia}
                                        className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-red-500 transition"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                    <div className="p-3 bg-green-500 rounded-2xl text-white">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                </div>
                                {/* Aspect Ratio Badge */}
                                {type === 'IMAGE' && mediaValidation.aspectInfo && (
                                    <div className="absolute top-3 right-3">
                                        <AspectRatioIndicator
                                            aspectInfo={mediaValidation.aspectInfo}
                                            dimensions={mediaValidation.dimensions}
                                            compact
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Full Aspect Ratio Info */}
                            {type === 'IMAGE' && mediaValidation.aspectInfo && (
                                <>
                                    <AspectRatioIndicator
                                        aspectInfo={mediaValidation.aspectInfo}
                                        dimensions={mediaValidation.dimensions}
                                        isLoading={mediaValidation.isLoading}
                                    />

                                    {/* Processing Prompt for non-9:16 images */}
                                    <ProcessingPrompt
                                        aspectInfo={mediaValidation.aspectInfo}
                                        onProcess={handleProcessImage}
                                        isProcessing={isProcessing}
                                    />
                                </>
                            )}
                        </div>

                    )}

                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                        <span className="text-[10px] uppercase font-bold text-gray-300 dark:text-gray-600 tracking-widest">or use url</span>
                        <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                    </div>

                    <div>
                        <input
                            type="url"
                            {...register('mediaUrl')}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/20 outline-none transition text-sm"
                        />
                        {errors.mediaUrl && (
                            <p className="text-red-500 text-xs mt-1">{errors.mediaUrl.message}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Media Type</label>
                        <div className="flex gap-4 p-1 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            {(['IMAGE', 'VIDEO'] as const).map((mType) => (
                                <button
                                    key={mType}
                                    type="button"
                                    onClick={() => setType(mType)}
                                    className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition ${type === mType ? 'bg-white dark:bg-gray-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                >
                                    {mType}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-[2]">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Caption (optional)</label>
                        <input
                            type="text"
                            {...register('caption')}
                            placeholder="Add a caption..."
                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition"
                        />
                        {errors.caption && (
                            <p className="text-red-500 text-xs mt-1">{errors.caption.message}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-[2]">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tag Users (optional)</label>
                        <Controller
                            name="userTags"
                            control={control}
                            render={({ field }) => (
                                <input
                                    type="text"
                                    value={field.value?.join(', ') || ''}
                                    onChange={(e) => {
                                        const tags = e.target.value
                                            .split(',')
                                            .map(t => t.trim())
                                            .filter(t => t.length > 0);
                                        field.onChange(tags);
                                    }}
                                    placeholder="@username, @another_user"
                                    className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition"
                                />
                            )}
                        />
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 pl-1">Comma separated list of usernames to tag</p>
                        {errors.userTags && (
                            <p className="text-red-500 text-xs mt-1">{errors.userTags.message}</p>
                        )}
                    </div>

                    <div className="flex-[2] grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Publish Date</label>
                            <Controller
                                name="scheduledFor"
                                control={control}
                                render={({ field }) => (
                                    <input
                                        type="date"
                                        value={formatDateForInput(field.value)}
                                        onChange={(e) => {
                                            const newDate = new Date(field.value);
                                            const [year, month, day] = e.target.value.split('-').map(Number);
                                            newDate.setFullYear(year, month - 1, day);
                                            field.onChange(newDate);
                                        }}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                        className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition"
                                    />
                                )}
                            />
                            {errors.scheduledFor && (
                                <p className="text-red-500 text-xs mt-1">{errors.scheduledFor.message}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Time</label>
                            <Controller
                                name="scheduledFor"
                                control={control}
                                render={({ field }) => (
                                    <input
                                        type="time"
                                        value={formatTimeForInput(field.value)}
                                        onChange={(e) => {
                                            const newDate = new Date(field.value);
                                            const [hours, minutes] = e.target.value.split(':').map(Number);
                                            newDate.setHours(hours, minutes);
                                            field.onChange(newDate);
                                        }}
                                        required
                                        className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition"
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || uploading || !mediaUrl}
                        className="w-full px-6 py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition shadow-lg shadow-indigo-200 dark:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <><Loader className="w-5 h-5 animate-spin" /> Scheduling...</> : <><Calendar className="w-5 h-5" /> Schedule Post</>}
                    </button>
                    {!mediaUrl && (
                        <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-3 flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Select media to enable scheduling
                        </p>
                    )}
                </div>
            </form>
        </Panel>
    );
}
