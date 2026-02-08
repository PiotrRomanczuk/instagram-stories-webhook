'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Calendar, Loader, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Progress } from '@/app/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group';
import { TagInput } from '../ui/tag-input';
import { DateTimePicker } from '../ui/datetime-picker';
import { supabase } from '@/lib/config/supabase';
import { useMediaValidation } from '@/app/hooks/use-media-validation';
import { AspectRatioIndicator, ProcessingPrompt } from '../media/aspect-ratio-indicator';
import { InstagramPreview } from '../media/instagram-preview';
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
    const caption = watch('caption');
    const userTags = watch('userTags');
    const hashtagTags = watch('hashtagTags');

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

        // Validate aspect ratio for images BEFORE upload
        if (isImage) {
            const validation = await mediaValidation.validateFile(file);
            if (!validation) {
                toast.error('Failed to validate image');
                return;
            }

            // Show validation results
            if (!validation.valid) {
                // Invalid aspect ratio - show warning but allow upload
                // User will see processing options after upload
                toast.warning(`Image aspect ratio not ideal for Stories. Will show processing options after upload.`);
            }
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
                    hashtagTags: data.hashtagTags || [],
                    caption: data.caption
                }),
            });

            if (res.ok) {
                toast.success('Post scheduled successfully');
                reset();
                onScheduled();
            } else {
                const errorData = await res.json();
                if (res.status === 409) {
                    toast.error(errorData.message || 'Another post is already scheduled at this time');
                } else {
                    toast.error(errorData.error || 'Failed to schedule post');
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(errorMessage);
        }
    };


    return (
        <Card className="rounded-3xl p-8 shadow-xl shadow-gray-100/50 border-gray-100">
            <CardHeader className="p-0 gap-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-black text-gray-900">Schedule New Post</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* Media Selection */}
                    <div className="space-y-4">
                        <Label className="text-sm font-bold text-gray-700">Add Story Content</Label>

                        {!mediaUrl ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed border-gray-200 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition group ${uploading ? 'pointer-events-none' : ''}`}
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
                                        <Progress value={uploadProgress} className="h-2" />
                                        <span className="text-sm font-medium text-gray-500 animate-pulse">Uploading Media...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 bg-gray-50 text-gray-400 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition duration-300">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <p className="mt-4 text-gray-500 font-medium">Click or drag to upload photo/video</p>
                                        <p className="text-xs text-gray-400 mt-2">Max 50MB - MP4, JPEG, PNG</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative group rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
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
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleClearMedia}
                                            className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-red-500 hover:text-white transition"
                                        >
                                            <X className="w-6 h-6" />
                                        </Button>
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
                            <div className="h-px flex-1 bg-gray-100"></div>
                            <span className="text-[10px] uppercase font-bold text-gray-300 tracking-widest">or use url</span>
                            <div className="h-px flex-1 bg-gray-100"></div>
                        </div>

                        <div>
                            <Input
                                type="url"
                                {...register('mediaUrl')}
                                placeholder="https://example.com/image.jpg"
                                className="rounded-xl"
                            />
                            {errors.mediaUrl && (
                                <p className="text-red-500 text-xs mt-1">{errors.mediaUrl.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <Label className="text-sm font-bold text-gray-700 mb-2">Media Type</Label>
                            <ToggleGroup
                                type="single"
                                value={type}
                                onValueChange={(value) => { if (value) setType(value as 'IMAGE' | 'VIDEO'); }}
                                className="w-full p-1 bg-gray-50 rounded-xl"
                            >
                                <ToggleGroupItem value="IMAGE" className="flex-1 rounded-lg font-bold text-xs data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-indigo-600">
                                    IMAGE
                                </ToggleGroupItem>
                                <ToggleGroupItem value="VIDEO" className="flex-1 rounded-lg font-bold text-xs data-[state=on]:bg-white data-[state=on]:shadow-sm data-[state=on]:text-indigo-600">
                                    VIDEO
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>

                        <div className="flex-[2]">
                            <Label className="text-sm font-bold text-gray-700 mb-2">Caption (optional)</Label>
                            <Controller
                                name="caption"
                                control={control}
                                render={({ field }) => (
                                    <div>
                                        <Textarea
                                            {...field}
                                            placeholder="Add a caption..."
                                            rows={3}
                                            maxLength={2200}
                                            className="rounded-xl resize-none"
                                        />
                                        <div className="flex items-center justify-between mt-1">
                                            {errors.caption && (
                                                <p className="text-red-500 text-xs">{errors.caption.message}</p>
                                            )}
                                            <span className="text-[11px] text-gray-400 font-medium ml-auto">
                                                {(field.value || '').length} / 2200
                                            </span>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-bold text-gray-700 mb-2">Tag Users (optional)</Label>
                        <Controller
                            name="userTags"
                            control={control}
                            render={({ field }) => (
                                <TagInput
                                    tags={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="@username"
                                    maxTags={20}
                                />
                            )}
                        />
                        {errors.userTags && (
                            <p className="text-red-500 text-xs mt-2">{errors.userTags.message}</p>
                        )}
                    </div>

                    <div>
                        <Label className="text-sm font-bold text-gray-700 mb-2">Add Hashtags (optional)</Label>
                        <Controller
                            name="hashtagTags"
                            control={control}
                            render={({ field }) => (
                                <TagInput
                                    tags={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="#hashtag"
                                    maxTags={30}
                                />
                            )}
                        />
                        {errors.hashtagTags && (
                            <p className="text-red-500 text-xs mt-2">{errors.hashtagTags.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-[2]">
                            <Label className="text-sm font-bold text-gray-700 mb-2">Publish Date & Time</Label>
                            <Controller
                                name="scheduledFor"
                                control={control}
                                render={({ field }) => (
                                    <DateTimePicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        minDate={new Date()}
                                    />
                                )}
                            />
                            {errors.scheduledFor && (
                                <p className="text-red-500 text-xs mt-1">{errors.scheduledFor.message}</p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1.5 pl-1">
                                Timezone: {new Intl.DateTimeFormat().resolvedOptions().timeZone}
                            </p>
                        </div>
                    </div>

                    {/* Instagram Preview */}
                    {mediaUrl && (
                        <InstagramPreview
                            mediaUrl={mediaUrl}
                            type={type}
                            caption={caption}
                            userTags={userTags}
                            hashtagTags={hashtagTags}
                        />
                    )}

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting || uploading || !mediaUrl}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                            size="lg"
                        >
                            {isSubmitting ? <><Loader className="w-5 h-5 animate-spin" /> Scheduling...</> : <><Calendar className="w-5 h-5" /> Schedule Post</>}
                        </Button>
                        {!mediaUrl && (
                            <p className="text-center text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Select media to enable scheduling
                            </p>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
