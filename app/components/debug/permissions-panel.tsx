import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

interface PermissionsPanelProps {
    permissions?: Array<{
        permission: string;
        status: string;
    }>;
}

export function PermissionsPanel({ permissions = [] }: PermissionsPanelProps) {
    const requiredScopes = [
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_insights',
        'instagram_manage_messages',
        'instagram_manage_comments',
        'instagram_manage_contents',
        'pages_read_engagement',
        'pages_show_list'
    ];

    return (
        <Card className="rounded-3xl p-8 shadow-xl shadow-gray-100/50 border-gray-100">
            <CardHeader className="p-0 gap-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Shield className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-black text-gray-900">Permissions Guard</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {requiredScopes.map(scope => {
                        const status = permissions.find(p => p.permission === scope)?.status;
                        const isGranted = status === 'granted';

                        return (
                            <div key={scope} className={`p-3 rounded-xl border flex items-center justify-between ${isGranted ? 'bg-emerald-50/30 border-emerald-100' : 'bg-rose-50/30 border-rose-100'}`}>
                                <Badge variant={isGranted ? 'secondary' : 'destructive'} className={`text-xs font-bold ${isGranted ? 'bg-transparent text-emerald-700 border-0' : 'bg-transparent text-rose-700 border-0'}`}>
                                    {scope}
                                </Badge>
                                {isGranted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
