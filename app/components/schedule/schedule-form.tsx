import { useState, useRef } from 'react';
import Image from 'next/image';
import { Calendar, Loader, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Panel } from '../ui/panel';
import { supabase } from '@/lib/supabase';
import { useMediaValidation } from '@/app/hooks/use-media-validation';
import { AspectRatioIndicator, ProcessingPrompt } from '../media/aspect-ratio-indicator';

interface ScheduleFormProps {
    onScheduled: () => void;
}

export function ScheduleForm({ onScheduled }: ScheduleFormProps) {
    const [url, setUrl] = useState('');
    const [type, setType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [taggedUsers, setTaggedUsers] = useState('');
    const [scheduling, setScheduling] = useState(false);

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Media validation state
    const mediaValidation = useMediaValidation();
    const [isProcessing, setIsProcessing] = useState(false);

    useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        setScheduledDate(now.toISOString().split('T')[0]);
        setScheduledTime(now.toTimeString().slice(0, 5));
    });

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

        // TODO: Integrate video validation/processing here


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
            setUrl(publicUrl);
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
        if (!url || type !== 'IMAGE') return;

        setIsProcessing(true);
        try {
            const response = await fetch('/api/media/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: url,
                    blurBackground: options.blurBackground,
                    backgroundColor: '#000000'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Processing failed');
            }

            if (data.wasProcessed) {
                setUrl(data.processedUrl);
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

    // TODO: Add handleProcessVideo function to call /api/media/process-video


    // Clear media and reset validation
    const handleClearMedia = () => {
        setUrl('');
        mediaValidation.reset();
    };


    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setScheduling(true);

        try {
            // Process tags
            const userTags = taggedUsers
                .split(',')
                .map(u => u.trim())
                .filter(u => u.length > 0)
                .map(username => ({
                    username,
                    x: 0.5,
                    y: 0.5
                }));

            const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
            const res = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    type,
                    scheduledTime: scheduledDateTime.toISOString(),
                    userTags
                }),
            });

            if (res.ok) {
                toast.success('Post scheduled successfully');
                setUrl('');
                onScheduled();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to schedule post');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            toast.error(errorMessage);
        } finally {
            setScheduling(false);
        }
    };

    return (
        <Panel title="Schedule New Post" icon={<Calendar className="w-6 h-6" />}>
            <form onSubmit={handleSchedule} className="space-y-6">

                {/* Media Selection */}
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-700">Add Story Content</label>

                    {!url ? (
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
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-500 animate-pulse">Uploading Media...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 bg-gray-50 text-gray-400 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition duration-300">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <p className="mt-4 text-gray-500 font-medium">Click or drag to upload photo/video</p>
                                    <p className="text-xs text-gray-400 mt-2">Max 50MB • MP4, JPEG, PNG</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="relative group rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                                {type === 'VIDEO' ? (
                                    <video src={url} className="w-full h-48 object-cover" controls={false} />
                                ) : (
                                    <Image
                                        src={url}
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

                            {/* TODO: Add video processing prompt and indicators for VIDEO type */}
                        </div>

                    )}

                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-gray-100"></div>
                        <span className="text-[10px] uppercase font-bold text-gray-300 tracking-widest">or use url</span>
                        <div className="h-px flex-1 bg-gray-100"></div>
                    </div>

                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-sm"
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Media Type</label>
                        <div className="flex gap-4 p-1 bg-gray-50 rounded-xl">
                            {(['IMAGE', 'VIDEO'] as const).map((mType) => (
                                <button
                                    key={mType}
                                    type="button"
                                    onClick={() => setType(mType)}
                                    className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition ${type === mType ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {mType}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-[2] grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tag Users (optional)</label>
                            <input
                                type="text"
                                value={taggedUsers}
                                onChange={(e) => setTaggedUsers(e.target.value)}
                                placeholder="@username, @another_user"
                                className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 outline-none transition"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 pl-1">Comma separated list of usernames to tag</p>
                        </div>
                    </div>

                    <div className="flex-[2] grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Publish Date</label>
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                required
                                className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Time</label>
                            <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                required
                                className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 outline-none transition"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={scheduling || uploading || !url}
                        className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {scheduling ? <><Loader className="w-5 h-5 animate-spin" /> Scheduling...</> : <><Calendar className="w-5 h-5" /> Schedule Post</>}
                    </button>
                    {!url && (
                        <p className="text-center text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Select media to enable scheduling
                        </p>
                    )}
                </div>
            </form>
        </Panel>
    );
}
