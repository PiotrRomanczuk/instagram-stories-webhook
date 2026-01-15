import { Key, CheckCircle2, AlertCircle, Copy, Info } from 'lucide-react';
import { Panel } from '../ui/panel';

interface TokenInfoPanelProps {
    tokenData: any;
    fullToken: string;
}

export function TokenInfoPanel({ tokenData, fullToken }: TokenInfoPanelProps) {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard');
    };

    const isExpired = tokenData?.expires_at && tokenData.expires_at < Date.now();
    const isValid = !!tokenData?.access_token && !isExpired;

    return (
        <Panel title="Token Status" icon={<Key className="w-6 h-6" />}>
            <div className={`p-4 rounded-2xl flex items-center justify-between gap-4 ${isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                <div className="flex items-center gap-3">
                    {isValid ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-bold">{isValid ? 'Active & Valid' : isExpired ? 'Expired' : 'Missing/Invalid'}</span>
                </div>
                <button
                    onClick={() => copyToClipboard(fullToken)}
                    className="flex items-center gap-2 px-3 py-1 bg-white/50 rounded-lg text-xs font-bold hover:bg-white/80 transition"
                >
                    <Copy className="w-3 h-3" /> Copy Full Token
                </button>
            </div>

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
        </Panel>
    );
}
