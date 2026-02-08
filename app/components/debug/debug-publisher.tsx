'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, Send, Loader, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/config/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/app/components/ui/alert';
import { Label } from '@/app/components/ui/label';

interface LogEntry {
    timestamp: string;
    message: string;
}

interface PublishResult {
    success: boolean;
    result?: { id: string };
    error?: string;
    duration: number;
    logs: string[];
}

export function DebugPublisher() {
    const [imageUrl, setImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [result, setResult] = useState<PublishResult | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addLog = (message: string) => {
        setLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            message
        }]);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        addLog(`📁 Selected file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

        try {
            addLog('⬆️ Uploading to Supabase storage...');
            const fileExt = file.name.split('.').pop();
            const fileName = `debug-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const { error } = await supabase.storage
                .from('stories')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('stories')
                .getPublicUrl(filePath);

            setImageUrl(publicUrl);
            addLog(`✅ Upload complete: ${publicUrl.substring(0, 60)}...`);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Upload failed';
            addLog(`❌ Upload error: ${msg}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handlePublish = async () => {
        if (!imageUrl) {
            addLog('❌ No image URL provided');
            return;
        }

        setIsPublishing(true);
        setResult(null);
        addLog('🚀 Starting direct publish (bypassing scheduler)...');

        try {
            const res = await fetch('/api/debug/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: imageUrl,
                    type: 'IMAGE'
                })
            });

            const data: PublishResult = await res.json();
            setResult(data);

            // Add server-side logs
            if (data.logs) {
                data.logs.forEach(log => addLog(`[SERVER] ${log}`));
            }

            if (data.success) {
                addLog(`✅ Published successfully! IG Media ID: ${data.result?.id}`);
            } else {
                addLog(`❌ Publish failed: ${data.error}`);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Request failed';
            addLog(`❌ Request error: ${msg}`);
            setResult({ success: false, error: msg, duration: 0, logs: [] });
        } finally {
            setIsPublishing(false);
        }
    };

    const clearLogs = () => {
        setLogs([]);
        setResult(null);
    };

    return (
        <Card className="rounded-2xl shadow-sm overflow-hidden">
            <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-600" />
                    Debug Publisher
                </CardTitle>
                <CardDescription>
                    Direct Instagram publish - bypasses scheduler completely
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Image Upload Section */}
                <div className="space-y-2">
                    <Label>Image</Label>

                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Paste image URL or upload..."
                            className="flex-1 rounded-xl"
                        />
                        <Button
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="rounded-xl"
                        >
                            {isUploading ? (
                                <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            Upload
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>

                    {/* Image Preview */}
                    {imageUrl && (
                        <div className="mt-2 relative w-32 h-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                            <Image
                                src={imageUrl}
                                alt="Preview"
                                fill
                                className="object-cover"
                                onError={() => addLog('⚠️ Image preview failed to load')}
                            />
                        </div>
                    )}
                </div>

                {/* Publish Button */}
                <Button
                    onClick={handlePublish}
                    disabled={!imageUrl || isPublishing}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold"
                    size="lg"
                >
                    {isPublishing ? (
                        <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Publishing...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Publish to Instagram Now
                        </>
                    )}
                </Button>

                {/* Result Badge */}
                {result && (
                    <Alert className={`rounded-xl ${result.success
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-rose-50 border-rose-200'
                        }`}>
                        {result.success ? (
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        ) : (
                            <XCircle className="w-6 h-6 text-rose-600" />
                        )}
                        <AlertTitle className={`font-bold ${result.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {result.success ? 'Published Successfully!' : 'Publish Failed'}
                        </AlertTitle>
                        <AlertDescription className="text-sm text-gray-600">
                            {result.success
                                ? `Media ID: ${result.result?.id} (${result.duration}ms)`
                                : result.error
                            }
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>

            {/* Logs Section */}
            <div className="border-t border-gray-100">
                <div className="p-4 flex items-center justify-between bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-700">Debug Logs</h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearLogs}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        Clear
                    </Button>
                </div>
                <div className="max-h-64 overflow-y-auto bg-gray-900 text-gray-100 font-mono text-xs p-4">
                    {logs.length === 0 ? (
                        <p className="text-gray-500">No logs yet. Upload an image and publish to see activity.</p>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="py-0.5">
                                <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                                <span>{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Card>
    );
}
