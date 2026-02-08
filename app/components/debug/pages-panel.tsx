import { Facebook, Instagram, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';

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
        <Card className="rounded-3xl p-8 shadow-xl shadow-gray-100/50 border-gray-100">
            <CardHeader className="p-0 gap-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Facebook className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-black text-gray-900">Connected Assets</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {pages.length === 0 ? (
                    <Alert variant="destructive" className="rounded-2xl bg-rose-50 border-rose-100 text-rose-700">
                        <AlertCircle className="w-8 h-8" />
                        <AlertTitle className="font-bold">No Pages Found</AlertTitle>
                        <AlertDescription className="text-rose-600/70 text-xs">
                            Ensure your account has admin access to at least one Facebook Page.
                        </AlertDescription>
                    </Alert>
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
                                    <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 font-bold uppercase">
                                        ID: {page.id}
                                    </Badge>
                                </div>

                                {page.instagram_business_account ? (
                                    <div className="ml-11 p-3 bg-fuchsia-50 rounded-xl border border-fuchsia-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-fuchsia-700">
                                            <Instagram className="w-4 h-4" />
                                            <span className="text-xs font-bold">@{page.instagram_business_account.username || 'Linked Account'}</span>
                                        </div>
                                        <Badge variant="secondary" className="bg-transparent text-fuchsia-600 border-0 gap-1.5">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span className="text-[10px] font-bold uppercase">Ready</span>
                                        </Badge>
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
            </CardContent>
        </Card>
    );
}
