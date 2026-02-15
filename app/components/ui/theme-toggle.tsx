'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Avoid hydration mismatch
	useEffect(() => {
		setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- Hydration guard
	}, []);

	if (!mounted) {
		return (
			<div className='w-10 h-10 rounded-xl bg-slate-100 animate-pulse' />
		);
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
			className='relative group rounded-xl bg-slate-100 hover:bg-slate-200 transition-all duration-300 overflow-hidden'
			aria-label='Toggle theme'
		>
			{/* Animated background gradient */}
			<div className='absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300' />

			{/* Icons with rotation animation */}
			<div className='relative w-5 h-5'>
				<Sun
					className={cn(
						'absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-500',
						theme === 'dark'
							? 'rotate-90 scale-0 opacity-0'
							: 'rotate-0 scale-100 opacity-100',
					)}
				/>
				<Moon
					className={cn(
						'absolute inset-0 w-5 h-5 text-indigo-400 transition-all duration-500',
						theme === 'dark'
							? 'rotate-0 scale-100 opacity-100'
							: '-rotate-90 scale-0 opacity-0',
					)}
				/>
			</div>
		</Button>
	);
}
