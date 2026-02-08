import { User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';

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
        <Card className="rounded-3xl p-8 shadow-xl shadow-gray-100/50 border-gray-100">
            <CardHeader className="p-0 gap-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <User className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-black text-gray-900">User Identity</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Avatar className="w-20 h-20 rounded-3xl ring-4 ring-slate-50 shadow-lg">
                            {profile.picture?.data?.url ? (
                                <AvatarImage
                                    src={profile.picture.data.url}
                                    alt={profile.name}
                                    className="object-cover"
                                />
                            ) : null}
                            <AvatarFallback className="w-20 h-20 rounded-3xl bg-slate-100">
                                <User className="w-8 h-8 text-slate-300" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">{profile.name}</h3>
                        <p className="text-sm font-medium text-slate-400">ID: {profile.id}</p>
                        <Badge className="mt-2 bg-blue-50 text-blue-600 border-0 text-[10px] font-black uppercase tracking-widest">
                            Authenticated
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
