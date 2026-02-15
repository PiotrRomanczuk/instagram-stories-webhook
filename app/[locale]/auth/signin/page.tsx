'use client';

import { signIn } from 'next-auth/react';
import { Instagram, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';

export default function SignIn() {
	const [isLoading, setIsLoading] = useState(false);
	const [isDev] = useState(() =>
		typeof window !== 'undefined' &&
		(window.location.hostname === 'localhost' ||
			window.location.hostname === '127.0.0.1')
	);

	const handleSignIn = async () => {
		try {
			setIsLoading(true);
			await signIn('google', {
				callbackUrl: '/',
				redirect: true,
			});
		} catch (error) {
			console.error('Sign In Error:', error);
		}
	};

	const handleTestSignIn = (email: string, role: string) => {
		signIn('test-credentials', {
			email,
			role,
			callbackUrl: '/',
			redirect: true,
		});
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-6">
			<div className="w-full max-w-md space-y-8">
				{/* Logo */}
				<div className="text-center">
					<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-purple-600 shadow-xl">
						<Instagram className="h-8 w-8 text-white" />
					</div>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Welcome Back
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Sign in with your Google account to manage your stories
					</p>
				</div>

				{/* Sign In Card */}
				<Card>
					<CardContent className="pt-6">
						<Button
							onClick={handleSignIn}
							disabled={isLoading}
							variant="outline"
							className="h-12 w-full gap-3 text-sm font-semibold"
						>
							{isLoading ? (
								<>
									<Loader2 className="h-5 w-5 animate-spin" />
									Connecting...
								</>
							) : (
								<>
									<svg className="h-5 w-5" viewBox="0 0 24 24">
										<path
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
											fill="#4285F4"
										/>
										<path
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
											fill="#34A853"
										/>
										<path
											d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
											fill="#FBBC05"
										/>
										<path
											d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
											fill="#EA4335"
										/>
									</svg>
									Continue with Google
								</>
							)}
						</Button>

						<p className="mt-4 text-center text-xs text-muted-foreground">
							Facebook/Instagram connections are managed from your dashboard
							after signing in.
						</p>

						{/* Dev Mode Test Buttons */}
						{(isDev || process.env.NODE_ENV === 'development') && (
							<>
								<Separator className="my-6" />
								<div className="space-y-2">
									<p className="text-center text-xs font-medium text-muted-foreground">
										Development Only
									</p>
									<div className="grid grid-cols-2 gap-2">
										<Button
											variant="secondary"
											size="sm"
											onClick={() => handleTestSignIn('user@test.com', 'user')}
										>
											Test User
										</Button>
										<Button
											variant="secondary"
											size="sm"
											onClick={() => handleTestSignIn('admin@test.com', 'admin')}
										>
											Test Admin
										</Button>
									</div>
									<Button
										variant="outline"
										size="sm"
										className="mt-2 w-full border-purple-500 text-purple-600 hover:bg-purple-50"
										onClick={() => handleTestSignIn('p.romanczuk@gmail.com', 'admin')}
									>
										Test Real IG
									</Button>
								</div>
							</>
						)}
					</CardContent>
				</Card>

				{/* Footer */}
				<p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
					Protected by NextAuth.js
				</p>
			</div>
		</div>
	);
}
