import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Settings, Shield, Key, Database, Globe } from "lucide-react";
import { SettingsForm } from "../components/settings/settings-form";

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/auth/signin");
    }

    return (
        <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090b] p-4 md:p-12 lg:p-16 transition-colors duration-300">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors uppercase tracking-widest mb-4 group"
                        >
                            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            Application{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500">
                                Settings
                            </span>
                        </h1>
                        <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium max-w-xl">
                            Configure your application credentials and API keys. These settings are stored locally and used to connect to external services.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-[#121214] px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                        <Settings className="w-4 h-4 text-amber-500 animate-spin-slow" />
                        <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                            Local Config
                        </span>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-900 dark:text-amber-200">Security Notice</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            These credentials are stored in a local JSON file on this device. They are{" "}
                            <strong>not</strong> uploaded to any server. Keep this device secure and do not share access.
                        </p>
                    </div>
                </div>

                {/* Configuration Cards Legend */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#121214] rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">App Settings</span>
                    </div>
                    <div className="bg-white dark:bg-[#121214] rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                            <Key className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Google Auth</span>
                    </div>
                    <div className="bg-white dark:bg-[#121214] rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                            <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Meta/Facebook</span>
                    </div>
                    <div className="bg-white dark:bg-[#121214] rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Supabase</span>
                    </div>
                </div>

                {/* Settings Form */}
                <SettingsForm />
            </div>
        </main>
    );
}
