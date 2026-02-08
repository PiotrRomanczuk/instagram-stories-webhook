"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { AppConfig } from "@/lib/types";
import { defaultConfig } from "@/lib/config";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/app/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/app/components/ui/alert";
import { Spinner } from "@/app/components/ui/spinner";

interface ConfigInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    isSecret?: boolean;
    helpText?: string;
    helpLink?: string;
}

function ConfigInput({
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
                <Label className="text-sm font-semibold text-slate-700">
                    {label}
                </Label>
                {helpLink && (
                    <a
                        href={helpLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                    >
                        Help <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>
            <div className="relative group">
                <Input
                    type={isSecret && !showSecret ? "password" : "text"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="pr-20 px-4 py-3 h-auto rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 font-mono text-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isSecret && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setShowSecret(!showSecret)}
                            className="hover:bg-slate-200"
                        >
                            {showSecret ? (
                                <EyeOff className="w-4 h-4 text-slate-400" />
                            ) : (
                                <Eye className="w-4 h-4 text-slate-400" />
                            )}
                        </Button>
                    )}
                    {value && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={handleCopy}
                            className="hover:bg-slate-200"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                            )}
                        </Button>
                    )}
                </div>
            </div>
            {helpText && (
                <p className="text-xs text-slate-500">{helpText}</p>
            )}
        </div>
    );
}

function generateRandomSecret(length: number = 32): string {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function SettingsForm() {
    const [config, setConfig] = useState<AppConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasConfig, setHasConfig] = useState(false);
    const [envContent, setEnvContent] = useState("");
    const [showEnv, setShowEnv] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
        "idle"
    );

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch("/api/config");
            if (res.ok) {
                const data = await res.json();
                setConfig(data.config);
                setHasConfig(data.hasConfig);
            }
        } catch (error) {
            console.error("Failed to fetch config:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus("idle");

        try {
            const res = await fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ config }),
            });

            if (res.ok) {
                const data = await res.json();
                setEnvContent(data.envContent);
                setSaveStatus("success");
                setHasConfig(true);
                setTimeout(() => setSaveStatus("idle"), 3000);
            } else {
                setSaveStatus("error");
            }
        } catch (error) {
            console.error("Failed to save config:", error);
            setSaveStatus("error");
        } finally {
            setSaving(false);
        }
    };

    const downloadEnvFile = () => {
        const blob = new Blob([envContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = ".env.local";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const updateConfig = (path: string, value: string) => {
        setConfig((prev) => {
            const newConfig = { ...prev };
            const keys = path.split(".");
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
                <Spinner className="w-8 h-8 text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Status Indicator */}
            {!hasConfig && (
                <Alert className="bg-yellow-50 border-yellow-200 rounded-2xl p-5">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <AlertTitle className="font-bold text-yellow-900">
                        Configuration Required
                    </AlertTitle>
                    <AlertDescription className="text-sm text-yellow-700">
                        Please fill in all the required fields below to complete the
                        application setup.
                    </AlertDescription>
                </Alert>
            )}

            {/* App Settings Section */}
            <Card className="rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50">
                <CardHeader className="border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">
                                Application Settings
                            </CardTitle>
                            <CardDescription className="text-sm text-slate-500">
                                Base URL and admin configuration
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ConfigInput
                        label="Application URL"
                        value={config.appUrl}
                        onChange={(v) => updateConfig("appUrl", v)}
                        placeholder="http://localhost:3000"
                        helpText="The base URL where this app runs. For Raspberry Pi, use the local IP."
                    />
                    <ConfigInput
                        label="Admin Email"
                        value={config.adminEmail}
                        onChange={(v) => updateConfig("adminEmail", v)}
                        placeholder="admin@example.com"
                        helpText="Google email address that can log in to this dashboard."
                    />
                </CardContent>
            </Card>

            {/* Google OAuth Section */}
            <Card className="rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50">
                <CardHeader className="border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                            <Key className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">
                                Google OAuth
                            </CardTitle>
                            <CardDescription className="text-sm text-slate-500">
                                Used for admin authentication
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ConfigInput
                        label="Google Client ID"
                        value={config.google.clientId}
                        onChange={(v) => updateConfig("google.clientId", v)}
                        placeholder="xxxxx.apps.googleusercontent.com"
                        helpLink="https://console.cloud.google.com/apis/credentials"
                    />
                    <ConfigInput
                        label="Google Client Secret"
                        value={config.google.clientSecret}
                        onChange={(v) => updateConfig("google.clientSecret", v)}
                        placeholder="GOCSPX-xxxxxxxx"
                        isSecret
                    />
                </CardContent>
            </Card>

            {/* Facebook/Meta Section */}
            <Card className="rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50">
                <CardHeader className="border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Key className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">
                                Meta / Facebook
                            </CardTitle>
                            <CardDescription className="text-sm text-slate-500">
                                Instagram Business API access
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ConfigInput
                        label="Facebook App ID"
                        value={config.facebook.appId}
                        onChange={(v) => updateConfig("facebook.appId", v)}
                        placeholder="1234567890123456"
                        helpLink="https://developers.facebook.com/apps"
                    />
                    <ConfigInput
                        label="Facebook App Secret"
                        value={config.facebook.appSecret}
                        onChange={(v) => updateConfig("facebook.appSecret", v)}
                        placeholder="xxxxxxxxxxxxxxxx"
                        isSecret
                    />
                </CardContent>
            </Card>

            {/* Supabase Section */}
            <Card className="rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50">
                <CardHeader className="border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Database className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">
                                Supabase Database
                            </CardTitle>
                            <CardDescription className="text-sm text-slate-500">
                                Database connection and authentication
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ConfigInput
                            label="Supabase Project URL"
                            value={config.supabase.url}
                            onChange={(v) => updateConfig("supabase.url", v)}
                            placeholder="https://xxxxx.supabase.co"
                            helpLink="https://supabase.com/dashboard"
                        />
                        <ConfigInput
                            label="Supabase Anon Key"
                            value={config.supabase.anonKey}
                            onChange={(v) => updateConfig("supabase.anonKey", v)}
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                            isSecret
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ConfigInput
                            label="Service Role Key"
                            value={config.supabase.serviceRoleKey}
                            onChange={(v) => updateConfig("supabase.serviceRoleKey", v)}
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                            isSecret
                            helpText="Found in Project Settings > API"
                        />
                        <ConfigInput
                            label="JWT Secret"
                            value={config.supabase.jwtSecret}
                            onChange={(v) => updateConfig("supabase.jwtSecret", v)}
                            placeholder="your-super-secret-jwt-secret"
                            isSecret
                            helpText="Found in Project Settings > API > JWT Settings"
                        />
                    </div>
                    <ConfigInput
                        label="Database Password"
                        value={config.supabase.databasePassword}
                        onChange={(v) => updateConfig("supabase.databasePassword", v)}
                        placeholder="Your database password"
                        isSecret
                        helpText="The password set when creating the Supabase project"
                    />
                </CardContent>
            </Card>

            {/* Security Secrets Section */}
            <Card className="rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50">
                <CardHeader className="border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-900">
                                    Security Secrets
                                </CardTitle>
                                <CardDescription className="text-sm text-slate-500">
                                    Internal authentication tokens
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
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
                            className="bg-purple-50 text-purple-600 font-semibold text-sm hover:bg-purple-100"
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate All
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6">
                    <ConfigInput
                        label="NextAuth Secret"
                        value={config.security.nextAuthSecret}
                        onChange={(v) => updateConfig("security.nextAuthSecret", v)}
                        placeholder="Random 32+ character string"
                        isSecret
                        helpText="Used to encrypt session cookies. Generate a random string."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ConfigInput
                            label="Webhook Secret"
                            value={config.security.webhookSecret}
                            onChange={(v) => updateConfig("security.webhookSecret", v)}
                            placeholder="Random string for webhook auth"
                            isSecret
                            helpText="Used to authenticate incoming webhook requests."
                        />
                        <ConfigInput
                            label="Cron Secret"
                            value={config.security.cronSecret}
                            onChange={(v) => updateConfig("security.cronSecret", v)}
                            placeholder="Random string for cron auth"
                            isSecret
                            helpText="Used to authenticate scheduled job triggers."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex items-center gap-3">
                    {saveStatus === "success" && (
                        <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span className="text-emerald-600 font-medium">
                                Configuration saved successfully!
                            </span>
                        </>
                    )}
                    {saveStatus === "error" && (
                        <>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span className="text-red-600 font-medium">
                                Failed to save. Check console for errors.
                            </span>
                        </>
                    )}
                    {saveStatus === "idle" && config.lastUpdated && (
                        <span className="text-sm text-slate-500">
                            Last saved:{" "}
                            {new Date(config.lastUpdated).toLocaleString()}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {envContent && (
                        <Button
                            variant="outline"
                            onClick={() => setShowEnv(!showEnv)}
                            className="rounded-xl"
                        >
                            {showEnv ? "Hide" : "Show"} .env
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
                    >
                        {saving ? (
                            <Spinner className="w-4 h-4" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Configuration
                    </Button>
                </div>
            </div>

            {/* .env Preview */}
            {showEnv && envContent && (
                <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                        <span className="text-sm font-semibold text-slate-300">
                            Generated .env.local
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={downloadEnvFile}
                            className="bg-slate-800 text-slate-300 hover:bg-slate-700"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </Button>
                    </div>
                    <pre className="p-6 text-sm text-slate-300 overflow-x-auto font-mono">
                        {envContent}
                    </pre>
                </div>
            )}
        </div>
    );
}
