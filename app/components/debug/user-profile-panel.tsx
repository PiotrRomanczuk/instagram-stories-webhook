import { User } from 'lucide-react';
import Image from 'next/image';
import { Panel } from '../ui/panel';

interface UserProfilePanelProps {
    profile: {
        id: string;
        name: string;
        email?: string;
        picture?: {
            data?: {
                url?: string;
            };
        };
    } | null | undefined;
}

export function UserProfilePanel({ profile }: UserProfilePanelProps) {
    if (!profile) return null;

    return (
        <Panel title="User Identity" icon={<User className="w-6 h-6" />}>
            <div className="flex items-center gap-6">
                <div className="relative">
                    {profile.picture?.data?.url ? (
                        <Image
                            src={profile.picture.data.url}
                            alt={profile.name}
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-3xl object-cover ring-4 ring-slate-50 shadow-lg"
                            unoptimized
                        />
                    ) : (
                        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center">
                            <User className="w-8 h-8 text-slate-300" />
                        </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800">{profile.name}</h3>
                    <p className="text-sm font-medium text-slate-400">ID: {profile.id}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        Authenticated
                    </div>
                </div>
            </div>
        </Panel>
    );
}
