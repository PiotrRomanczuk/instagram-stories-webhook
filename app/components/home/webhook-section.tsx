import React from 'react';
import { Terminal } from 'lucide-react';

interface WebhookSectionProps {
    webhookUrl: string;
}

export function WebhookSection({ webhookUrl }: WebhookSectionProps) {
    return (
        <div className="p-8 md:p-10 space-y-10">
            <div className="space-y-4">
                <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500 font-extrabold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-300 dark:text-zinc-600" /> Webhook Endpoint
                </h2>
                <div className="group relative">
                    <code className="block w-full bg-slate-50 dark:bg-black/40 p-6 rounded-2xl text-xs font-mono text-indigo-600 dark:text-indigo-400 break-all border border-slate-100 dark:border-white/5 shadow-inner transition-colors">
                        <span className="text-slate-400 dark:text-zinc-500 font-bold mr-2 select-none">POST</span> {webhookUrl}
                    </code>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500 font-extrabold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-300 dark:text-zinc-600" /> Example cURL
                </h2>
                <div className="group relative">
                    <code className="block w-full bg-slate-50 dark:bg-black/40 p-6 rounded-2xl text-xs font-mono text-slate-600 dark:text-zinc-400 break-all border border-slate-100 dark:border-white/5 shadow-inner leading-relaxed">
                        <span className="text-purple-600 dark:text-purple-400">curl</span> -X POST {webhookUrl} \<br />
                        &nbsp;&nbsp;-H <span className="text-emerald-600 dark:text-green-400">&quot;Content-Type: application/json&quot;</span> \<br />
                        &nbsp;&nbsp;-d <span className="text-amber-600 dark:text-yellow-400">&apos;{"{"}&quot;url&quot;: &quot;https://...&quot;, &quot;type&quot;: &quot;IMAGE&quot;{"}"}&apos;</span>
                    </code>
                </div>
            </div>
        </div>
    );
}
