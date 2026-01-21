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
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {label}
                </label>
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
                <input
                    type={isSecret && !showSecret ? "password" : "text"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all font-mono text-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isSecret && (
                        <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                        >
                            {showSecret ? (
                                <EyeOff className="w-4 h-4 text-slate-400" />
                            ) : (
                                <Eye className="w-4 h-4 text-slate-400" />
                            )}
                        </button>
                    )}
                    {value && (
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                            )}
                        </button>
                    )}
                </div>
            </div>
            {helpText && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{helpText}</p>
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
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Status Indicator */}
            {!hasConfig && (
                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-5 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-yellow-900 dark:text-yellow-200">
                            Configuration Required
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Please fill in all the required fields below to complete the
                            application setup.
                        </p>
                    </div>
                </div>
            )}

            {/* App Settings Section */}
            <div className="bg-white dark:bg-[#121214] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Application Settings
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Base URL and admin configuration
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>
            </div>

            {/* Google OAuth Section */}
            <div className="bg-white dark:bg-[#121214] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                            <Key className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Google OAuth
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Used for admin authentication
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>
            </div>

            {/* Facebook/Meta Section */}
            <div className="bg-white dark:bg-[#121214] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                            <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Meta / Facebook
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Instagram Business API access
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>
            </div>

            {/* Supabase Section */}
            <div className="bg-white dark:bg-[#121214] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                            <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Supabase Database
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Database connection and authentication
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-6 space-y-6">
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
                </div>
            </div>

            {/* Security Secrets Section */}
            <div className="bg-white dark:bg-[#121214] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Security Secrets
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Internal authentication tokens
                                </p>
                            </div>
                        </div>
                        <button
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
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold text-sm hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate All
                        </button>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 gap-6">
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
                </div>
            </div>

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 dark:bg-white/5 rounded-2xl p-6 border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                    {saveStatus === "success" && (
                        <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Configuration saved successfully!
                            </span>
                        </>
                    )}
                    {saveStatus === "error" && (
                        <>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span className="text-red-600 dark:text-red-400 font-medium">
                                Failed to save. Check console for errors.
                            </span>
                        </>
                    )}
                    {saveStatus === "idle" && config.lastUpdated && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Last saved:{" "}
                            {new Date(config.lastUpdated).toLocaleString()}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {envContent && (
                        <button
                            onClick={() => setShowEnv(!showEnv)}
                            className="px-5 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                        >
                            {showEnv ? "Hide" : "Show"} .env
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Configuration
                    </button>
                </div>
            </div>

            {/* .env Preview */}
            {showEnv && envContent && (
                <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                        <span className="text-sm font-semibold text-slate-300">
                            Generated .env.local
                        </span>
                        <button
                            onClick={downloadEnvFile}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </button>
                    </div>
                    <pre className="p-6 text-sm text-slate-300 overflow-x-auto font-mono">
                        {envContent}
                    </pre>
                </div>
            )}
        </div>
    );
}
