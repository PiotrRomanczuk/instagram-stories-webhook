'use client';

import { useState, useEffect, useCallback } from 'react';
import {
	Save,
	RefreshCw,
	Copy,
	Check,
	Eye,
	EyeOff,
	Download,
	Sparkles,
	Globe,
	Key,
	Database,
	Shield,
	ExternalLink,
	AlertCircle,
	CheckCircle2,
} from 'lucide-react';
import { AppConfig } from '@/lib/types';
import { defaultConfig } from '@/lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface ConfigInputProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	isSecret?: boolean;
	helpText?: string;
	helpLink?: string;
}

function ConfigInput({
	id,
	label,
	value,
	onChange,
	placeholder,
	isSecret = false,
	helpText,
	helpLink,
}: ConfigInputProps) {
	const [showSecret, setShowSecret] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label htmlFor={id} className="text-sm font-medium">
					{label}
				</Label>
				{helpLink && (
					<a
						href={helpLink}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-primary hover:underline flex items-center gap-1"
					>
						Help <ExternalLink className="h-3 w-3" />
					</a>
				)}
			</div>
			<div className="relative">
				<Input
					id={id}
					type={isSecret && !showSecret ? 'password' : 'text'}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="pr-20 font-mono text-sm"
				/>
				<div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
					{isSecret && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={() => setShowSecret(!showSecret)}
						>
							{showSecret ? (
								<EyeOff className="h-4 w-4 text-muted-foreground" />
							) : (
								<Eye className="h-4 w-4 text-muted-foreground" />
							)}
						</Button>
					)}
					{value && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={handleCopy}
						>
							{copied ? (
								<Check className="h-4 w-4 text-green-500" />
							) : (
								<Copy className="h-4 w-4 text-muted-foreground" />
							)}
						</Button>
					)}
				</div>
			</div>
			{helpText && (
				<p className="text-xs text-muted-foreground">{helpText}</p>
			)}
		</div>
	);
}

function generateRandomSecret(length: number = 32): string {
	const chars =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

export function SettingsFormNew() {
	const [config, setConfig] = useState<AppConfig>(defaultConfig);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [hasConfig, setHasConfig] = useState(false);
	const [envContent, setEnvContent] = useState('');
	const [showEnv, setShowEnv] = useState(false);
	const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>(
		'idle'
	);

	const fetchConfig = useCallback(async () => {
		try {
			const res = await fetch('/api/config');
			if (res.ok) {
				const data = await res.json();
				setConfig(data.config);
				setHasConfig(data.hasConfig);
			}
		} catch (error) {
			console.error('Failed to fetch config:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchConfig();
	}, [fetchConfig]);

	const handleSave = async () => {
		setSaving(true);
		setSaveStatus('idle');

		try {
			const res = await fetch('/api/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ config }),
			});

			if (res.ok) {
				const data = await res.json();
				setEnvContent(data.envContent);
				setSaveStatus('success');
				setHasConfig(true);
				setTimeout(() => setSaveStatus('idle'), 3000);
			} else {
				setSaveStatus('error');
			}
		} catch (error) {
			console.error('Failed to save config:', error);
			setSaveStatus('error');
		} finally {
			setSaving(false);
		}
	};

	const downloadEnvFile = () => {
		const blob = new Blob([envContent], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = '.env.local';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const updateConfig = (path: string, value: string) => {
		setConfig((prev) => {
			const newConfig = { ...prev };
			const keys = path.split('.');
			let obj: Record<string, unknown> = newConfig;
			for (let i = 0; i < keys.length - 1; i++) {
				obj = obj[keys[i]] as Record<string, unknown>;
			}
			obj[keys[keys.length - 1]] = value;
			return newConfig;
		});
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<RefreshCw className="h-8 w-8 text-primary animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Configuration Required Alert */}
			{!hasConfig && (
				<Alert variant="default" className="border-amber-200 bg-amber-50">
					<AlertCircle className="h-4 w-4 text-amber-600" />
					<AlertTitle className="text-amber-800">
						Configuration Required
					</AlertTitle>
					<AlertDescription className="text-amber-700">
						Please fill in all the required fields below to complete the
						application setup.
					</AlertDescription>
				</Alert>
			)}

			{/* App Settings Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
							<Globe className="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<CardTitle>Application Settings</CardTitle>
							<CardDescription>Base URL and admin configuration</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<ConfigInput
						id="appUrl"
						label="Application URL"
						value={config.appUrl}
						onChange={(v) => updateConfig('appUrl', v)}
						placeholder="http://localhost:3000"
						helpText="The base URL where this app runs."
					/>
					<ConfigInput
						id="adminEmail"
						label="Admin Email"
						value={config.adminEmail}
						onChange={(v) => updateConfig('adminEmail', v)}
						placeholder="admin@example.com"
						helpText="Google email address that can log in to this dashboard."
					/>
				</CardContent>
			</Card>

			{/* Google OAuth Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
							<Key className="h-5 w-5 text-red-600" />
						</div>
						<div>
							<CardTitle>Google OAuth</CardTitle>
							<CardDescription>Used for admin authentication</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<ConfigInput
						id="googleClientId"
						label="Google Client ID"
						value={config.google.clientId}
						onChange={(v) => updateConfig('google.clientId', v)}
						placeholder="xxxxx.apps.googleusercontent.com"
						helpLink="https://console.cloud.google.com/apis/credentials"
					/>
					<ConfigInput
						id="googleClientSecret"
						label="Google Client Secret"
						value={config.google.clientSecret}
						onChange={(v) => updateConfig('google.clientSecret', v)}
						placeholder="GOCSPX-xxxxxxxx"
						isSecret
					/>
				</CardContent>
			</Card>

			{/* Facebook/Meta Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
							<Key className="h-5 w-5 text-indigo-600" />
						</div>
						<div>
							<CardTitle>Meta / Facebook</CardTitle>
							<CardDescription>Instagram Business API access</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<ConfigInput
						id="facebookAppId"
						label="Facebook App ID"
						value={config.facebook.appId}
						onChange={(v) => updateConfig('facebook.appId', v)}
						placeholder="1234567890123456"
						helpLink="https://developers.facebook.com/apps"
					/>
					<ConfigInput
						id="facebookAppSecret"
						label="Facebook App Secret"
						value={config.facebook.appSecret}
						onChange={(v) => updateConfig('facebook.appSecret', v)}
						placeholder="xxxxxxxxxxxxxxxx"
						isSecret
					/>
				</CardContent>
			</Card>

			{/* Supabase Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
							<Database className="h-5 w-5 text-emerald-600" />
						</div>
						<div>
							<CardTitle>Supabase Database</CardTitle>
							<CardDescription>Database connection and authentication</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<ConfigInput
							id="supabaseUrl"
							label="Supabase Project URL"
							value={config.supabase.url}
							onChange={(v) => updateConfig('supabase.url', v)}
							placeholder="https://xxxxx.supabase.co"
							helpLink="https://supabase.com/dashboard"
						/>
						<ConfigInput
							id="supabaseAnonKey"
							label="Supabase Anon Key"
							value={config.supabase.anonKey}
							onChange={(v) => updateConfig('supabase.anonKey', v)}
							placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
							isSecret
						/>
					</div>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<ConfigInput
							id="supabaseServiceRoleKey"
							label="Service Role Key"
							value={config.supabase.serviceRoleKey}
							onChange={(v) => updateConfig('supabase.serviceRoleKey', v)}
							placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
							isSecret
							helpText="Found in Project Settings > API"
						/>
						<ConfigInput
							id="supabaseJwtSecret"
							label="JWT Secret"
							value={config.supabase.jwtSecret}
							onChange={(v) => updateConfig('supabase.jwtSecret', v)}
							placeholder="your-super-secret-jwt-secret"
							isSecret
							helpText="Found in Project Settings > API > JWT Settings"
						/>
					</div>
					<ConfigInput
						id="supabaseDatabasePassword"
						label="Database Password"
						value={config.supabase.databasePassword}
						onChange={(v) => updateConfig('supabase.databasePassword', v)}
						placeholder="Your database password"
						isSecret
						helpText="The password set when creating the Supabase project"
					/>
				</CardContent>
			</Card>

			{/* Security Secrets Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
								<Shield className="h-5 w-5 text-purple-600" />
							</div>
							<div>
								<CardTitle>Security Secrets</CardTitle>
								<CardDescription>Internal authentication tokens</CardDescription>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setConfig((prev) => ({
									...prev,
									security: {
										webhookSecret: generateRandomSecret(32),
										cronSecret: generateRandomSecret(32),
										nextAuthSecret: generateRandomSecret(32),
									},
								}));
							}}
						>
							<Sparkles className="mr-2 h-4 w-4" />
							Generate All
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<ConfigInput
						id="nextAuthSecret"
						label="NextAuth Secret"
						value={config.security.nextAuthSecret}
						onChange={(v) => updateConfig('security.nextAuthSecret', v)}
						placeholder="Random 32+ character string"
						isSecret
						helpText="Used to encrypt session cookies. Generate a random string."
					/>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<ConfigInput
							id="webhookSecret"
							label="Webhook Secret"
							value={config.security.webhookSecret}
							onChange={(v) => updateConfig('security.webhookSecret', v)}
							placeholder="Random string for webhook auth"
							isSecret
							helpText="Used to authenticate incoming webhook requests."
						/>
						<ConfigInput
							id="cronSecret"
							label="Cron Secret"
							value={config.security.cronSecret}
							onChange={(v) => updateConfig('security.cronSecret', v)}
							placeholder="Random string for cron auth"
							isSecret
							helpText="Used to authenticate scheduled job triggers."
						/>
					</div>
				</CardContent>
			</Card>

			{/* Save Section */}
			<Card className="border-muted-foreground/20 bg-muted/50">
				<CardContent className="pt-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							{saveStatus === 'success' && (
								<>
									<CheckCircle2 className="h-5 w-5 text-green-500" />
									<span className="font-medium text-green-600">
										Configuration saved successfully!
									</span>
								</>
							)}
							{saveStatus === 'error' && (
								<>
									<AlertCircle className="h-5 w-5 text-destructive" />
									<span className="font-medium text-destructive">
										Failed to save. Check console for errors.
									</span>
								</>
							)}
							{saveStatus === 'idle' && config.lastUpdated && (
								<span className="text-sm text-muted-foreground">
									Last saved:{' '}
									{new Date(config.lastUpdated).toLocaleString()}
								</span>
							)}
						</div>
						<div className="flex items-center gap-3">
							{envContent && (
								<Button
									variant="outline"
									onClick={() => setShowEnv(!showEnv)}
								>
									{showEnv ? 'Hide' : 'Show'} .env
								</Button>
							)}
							<Button onClick={handleSave} disabled={saving}>
								{saving ? (
									<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Save className="mr-2 h-4 w-4" />
								)}
								Save Configuration
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* .env Preview */}
			{showEnv && envContent && (
				<Card className="bg-zinc-950 text-zinc-100">
					<CardHeader className="border-b border-zinc-800">
						<div className="flex items-center justify-between">
							<CardTitle className="text-zinc-100">Generated .env.local</CardTitle>
							<Button
								variant="secondary"
								size="sm"
								onClick={downloadEnvFile}
								className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
							>
								<Download className="mr-2 h-4 w-4" />
								Download
							</Button>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						<ScrollArea className="h-64">
							<pre className="p-6 text-sm font-mono text-zinc-300">
								{envContent}
							</pre>
						</ScrollArea>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
