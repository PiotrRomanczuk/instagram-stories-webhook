import { Facebook, Instagram, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Panel } from '../ui/panel';

interface PagesPanelProps {
    pages: Array<{
        id: string;
        name: string;
        access_token?: string | null;
        category?: string;
        instagram_business_account?: {
            id: string;
            username: string;
            name?: string;
            profile_picture_url?: string;
        };
    }>;
}

export function PagesPanel({ pages }: PagesPanelProps) {
    return (
        <Panel title="Connected Assets" icon={<Facebook className="w-6 h-6" />}>
            {pages.length === 0 ? (
                <div className="text-center py-6 bg-rose-50 rounded-2xl border border-rose-100">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                    <p className="text-rose-700 font-bold">No Pages Found</p>
                    <p className="text-rose-600/70 text-xs">Ensure your account has admin access to at least one Facebook Page.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pages.map((page) => (
                        <div key={page.id} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 transition">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                        <Facebook className="w-4 h-4" />
                                    </div>
                                    <span className="font-bold text-slate-700">{page.name}</span>
                                </div>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">ID: {page.id}</span>
                            </div>

                            {page.instagram_business_account ? (
                                <div className="ml-11 p-3 bg-fuchsia-50 rounded-xl border border-fuchsia-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-fuchsia-700">
                                        <Instagram className="w-4 h-4" />
                                        <span className="text-xs font-bold">@{page.instagram_business_account.username || 'Linked Account'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-fuchsia-600">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span className="text-[10px] font-bold uppercase">Ready</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="ml-11 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2 text-amber-700">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-bold">No Instagram Account Linked</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Panel>
    );
}
