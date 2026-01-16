'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

export function LogoutButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        if (!confirm('Are you sure you want to log out?')) return;

        setIsLoading(true);
        try {
            await signOut({ callbackUrl: '/' });
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors disabled:opacity-50"
        >
            <LogOut className="w-3 h-3" />
            {isLoading ? 'Logging out...' : 'Disconnect Account'}
        </button>
    );
}
