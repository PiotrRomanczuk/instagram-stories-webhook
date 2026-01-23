'use client';

import { useState, useRef } from 'react';
import { Upload, Send, Loader, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/config/supabase';

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

            const { data, error } = await supabase.storage
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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-600" />
                    Debug Publisher
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Direct Instagram publish - bypasses scheduler completely
                </p>
            </div>

            <div className="p-6 space-y-4">
                {/* Image Upload Section */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Image</label>
                    
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Paste image URL or upload..."
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center gap-2 text-sm font-medium transition disabled:opacity-50"
                        >
                            {isUploading ? (
                                <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            Upload
                        </button>
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
                            <img
                                src={imageUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                onError={() => addLog('⚠️ Image preview failed to load')}
                            />
                        </div>
                    )}
                </div>

                {/* Publish Button */}
                <button
                    onClick={handlePublish}
                    disabled={!imageUrl || isPublishing}
                    className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                </button>

                {/* Result Badge */}
                {result && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${
                        result.success 
                            ? 'bg-emerald-50 border border-emerald-200' 
                            : 'bg-rose-50 border border-rose-200'
                    }`}>
                        {result.success ? (
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        ) : (
                            <XCircle className="w-6 h-6 text-rose-600" />
                        )}
                        <div>
                            <p className={`font-bold ${result.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {result.success ? 'Published Successfully!' : 'Publish Failed'}
                            </p>
                            <p className="text-sm text-gray-600">
                                {result.success 
                                    ? `Media ID: ${result.result?.id} (${result.duration}ms)`
                                    : result.error
                                }
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Logs Section */}
            <div className="border-t border-gray-100">
                <div className="p-4 flex items-center justify-between bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-700">Debug Logs</h3>
                    <button
                        onClick={clearLogs}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        Clear
                    </button>
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
        </div>
    );
}
