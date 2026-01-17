import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import { Panel } from '../ui/panel';

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
        <Panel title="Permissions Guard" icon={<Shield className="w-6 h-6" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {requiredScopes.map(scope => {
                    const status = permissions.find(p => p.permission === scope)?.status;
                    const isGranted = status === 'granted';

                    return (
                        <div key={scope} className={`p-3 rounded-xl border flex items-center justify-between ${isGranted ? 'bg-emerald-50/30 border-emerald-100' : 'bg-rose-50/30 border-rose-100'}`}>
                            <span className={`text-xs font-bold ${isGranted ? 'text-emerald-700' : 'text-rose-700'}`}>{scope}</span>
                            {isGranted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}
