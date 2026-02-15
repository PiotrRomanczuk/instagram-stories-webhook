'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, Send, Loader2, CheckCircle, XCircle, Terminal } from 'lucide-react';
import { uploadToStorage } from '@/lib/storage/upload-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { cn } from '@/lib/utils';

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

export function DebugPublisherNew() {
	const [imageUrl, setImageUrl] = useState('');
	const [isUploading, setIsUploading] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [result, setResult] = useState<PublishResult | null>(null);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const addLog = (message: string) => {
		setLogs((prev) => [
			...prev,
			{
				timestamp: new Date().toLocaleTimeString(),
				message,
			},
		]);
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploading(true);
		addLog(`Selected file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

		try {
			addLog('Uploading via API proxy...');

			const { publicUrl } = await uploadToStorage(file, { path: 'uploads/debug' });

			setImageUrl(publicUrl);
			addLog(`Upload complete: ${publicUrl.substring(0, 60)}...`);
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Upload failed';
			addLog(`Upload error: ${msg}`);
		} finally {
			setIsUploading(false);
		}
	};

	const handlePublish = async () => {
		if (!imageUrl) {
			addLog('No image URL provided');
			return;
		}

		setIsPublishing(true);
		setResult(null);
		addLog('Starting direct publish (bypassing scheduler)...');

		try {
			const res = await fetch('/api/debug/publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					url: imageUrl,
					type: 'IMAGE',
				}),
			});

			const data: PublishResult = await res.json();
			setResult(data);

			if (data.logs) {
				data.logs.forEach((log) => addLog(`[SERVER] ${log}`));
			}

			if (data.success) {
				addLog(`Published successfully! IG Media ID: ${data.result?.id}`);
			} else {
				addLog(`Publish failed: ${data.error}`);
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Request failed';
			addLog(`Request error: ${msg}`);
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
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Send className="h-5 w-5" />
					Debug Publisher
				</CardTitle>
				<CardDescription>
					Direct Instagram publish - bypasses scheduler completely
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Image Upload Section */}
				<div className="space-y-2">
					<Label htmlFor="debug-image-url">Image</Label>
					<div className="flex gap-2">
						<Input
							id="debug-image-url"
							type="text"
							value={imageUrl}
							onChange={(e) => setImageUrl(e.target.value)}
							placeholder="Paste image URL or upload..."
							className="flex-1"
						/>
						<Button
							variant="outline"
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading}
							aria-label={isUploading ? 'Uploading image' : 'Upload an image'}
						>
							{isUploading ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Upload className="mr-2 h-4 w-4" />
							)}
							Upload
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							onChange={handleFileUpload}
							className="hidden"
							aria-hidden="true"
						/>
					</div>

					{/* Image Preview */}
					{imageUrl && (
						<div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted mt-2">
							<Image
								src={imageUrl}
								alt="Preview"
								fill
								className="object-cover"
								onError={() => addLog('Image preview failed to load')}
								unoptimized
							/>
						</div>
					)}
				</div>

				{/* Publish Button */}
				<Button
					onClick={handlePublish}
					disabled={!imageUrl || isPublishing}
					className="w-full"
				>
					{isPublishing ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Send className="mr-2 h-4 w-4" />
					)}
					{isPublishing ? 'Publishing...' : 'Publish to Instagram Now'}
				</Button>

				{/* Result Badge */}
				{result && (
					<Alert variant={result.success ? 'default' : 'destructive'}>
						{result.success ? (
							<CheckCircle className="h-4 w-4" />
						) : (
							<XCircle className="h-4 w-4" />
						)}
						<AlertDescription>
							<p className="font-semibold">
								{result.success ? 'Published Successfully!' : 'Publish Failed'}
							</p>
							<p className="text-sm">
								{result.success
									? `Media ID: ${result.result?.id} (${result.duration}ms)`
									: result.error}
							</p>
						</AlertDescription>
					</Alert>
				)}

				{/* Logs Section */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="flex items-center gap-2">
							<Terminal className="h-4 w-4" />
							Debug Logs
						</Label>
						<Button variant="ghost" size="sm" onClick={clearLogs} aria-label="Clear debug logs">
							Clear
						</Button>
					</div>
					<ScrollArea className="h-48 rounded-md border bg-zinc-950 text-zinc-100 font-mono text-xs">
						<div className="p-4">
							{logs.length === 0 ? (
								<p className="text-zinc-500">
									No logs yet. Upload an image and publish to see activity.
								</p>
							) : (
								logs.map((log, i) => (
									<div key={i} className="py-0.5">
										<span className="text-zinc-500">[{log.timestamp}]</span>{' '}
										<span
											className={cn(
												log.message.includes('error') ||
													log.message.includes('failed')
													? 'text-red-400'
													: log.message.includes('success') ||
														  log.message.includes('complete')
														? 'text-green-400'
														: 'text-zinc-100'
											)}
										>
											{log.message}
										</span>
									</div>
								))
							)}
						</div>
					</ScrollArea>
				</div>
			</CardContent>
		</Card>
	);
}
