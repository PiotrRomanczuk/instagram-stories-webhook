import { Key, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Alert, AlertTitle } from '@/app/components/ui/alert';

interface TokenInfoPanelProps {
    tokenData: {
        access_token: string;
        expires_at?: number;
        user_id?: string;
    } | null;
}

export function TokenInfoPanel({ tokenData }: TokenInfoPanelProps) {
    const [now] = useState(() => Date.now());

    const isExpired = tokenData?.expires_at && tokenData.expires_at < now;
    const isValid = !!tokenData?.access_token && !isExpired;

    return (
        <Card className="rounded-3xl p-8 shadow-xl shadow-gray-100/50 border-gray-100">
            <CardHeader className="p-0 gap-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Key className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-black text-gray-900">Token Status</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Alert className={`rounded-2xl border-0 ${isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {isValid ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <AlertTitle className="font-bold">{isValid ? 'Active & Valid' : isExpired ? 'Expired' : 'Missing/Invalid'}</AlertTitle>
                </Alert>

                <div className="mt-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                            <Info className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Token Metadata</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Stored ID</p>
                                <p className="text-sm font-mono text-slate-600 truncate">{tokenData?.user_id || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Expires At</p>
                                <p className="text-sm font-mono text-slate-600">
                                    {tokenData?.expires_at ? new Date(tokenData.expires_at).toLocaleString() : 'Never/Unknown'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
