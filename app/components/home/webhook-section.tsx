import React from 'react';
import { Terminal } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';

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
                <Card className="border-slate-100 shadow-inner py-0">
                    <CardContent className="p-6">
                        <code className="block w-full text-xs font-mono text-indigo-600 break-all">
                            <span className="text-slate-400 font-bold mr-2 select-none">POST</span> {webhookUrl}
                        </code>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-extrabold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-300" /> Example cURL
                </h2>
                <Card className="border-slate-100 shadow-inner py-0">
                    <CardContent className="p-6">
                        <code className="block w-full text-xs font-mono text-slate-600 break-all leading-relaxed">
                            <span className="text-purple-600">curl</span> -X POST {webhookUrl} \<br />
                            &nbsp;&nbsp;-H <span className="text-emerald-600">&quot;Content-Type: application/json&quot;</span> \<br />
                            &nbsp;&nbsp;-d <span className="text-amber-600">&apos;{"{"}&quot;url&quot;: &quot;https://...&quot;, &quot;type&quot;: &quot;IMAGE&quot;{"}"}&apos;</span>
                        </code>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
