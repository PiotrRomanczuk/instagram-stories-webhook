import React from 'react';
import { Terminal } from 'lucide-react';
import { ClientTestForm } from './client-form';

interface WebhookSectionProps {
    webhookUrl: string;
}

export function WebhookSection({ webhookUrl }: WebhookSectionProps) {
    return (
        <div className="p-8 md:p-10 space-y-10">
            <div className="space-y-4">
                <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-extrabold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-300" /> Webhook Endpoint
                </h2>
                <div className="group relative">
                    <code className="block w-full bg-slate-50 p-6 rounded-2xl text-xs font-mono text-indigo-600 break-all border border-slate-100 shadow-inner group-hover:bg-slate-100/50 transition-colors">
                        <span className="text-slate-400 font-bold mr-2 select-none">POST</span> {webhookUrl}
                    </code>
                </div>
            </div>

            <div className="pt-6">
                <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Quick Test Suite
                </h2>
                <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6">
                    <ClientTestForm webhookUrl={webhookUrl} />
                </div>
            </div>
        </div>
    );
}
