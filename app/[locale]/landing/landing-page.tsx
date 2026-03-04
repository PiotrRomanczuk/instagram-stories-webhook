'use client';

import { motion } from 'framer-motion';
import {
	Instagram,
	SwatchBook,
	CalendarDays,
	BarChart3,
	ShieldCheck,
	Zap,
	Users,
	ArrowRight,
	ChevronRight,
	CheckCircle2,
	Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';

const fadeUp = {
	hidden: { opacity: 0, y: 24 },
	visible: { opacity: 1, y: 0 },
};

const stagger = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.1 } },
};

const features = [
	{
		icon: SwatchBook,
		title: 'Swipe to Review',
		description:
			'Tinder-style card queue. Swipe right to approve, left to reject. Keyboard shortcuts included.',
		color: 'from-pink-500 to-rose-500',
	},
	{
		icon: CalendarDays,
		title: 'Drag & Drop Scheduling',
		description:
			'Four calendar views with drag-and-drop. Humanize mode adds random offsets for natural posting.',
		color: 'from-blue-500 to-cyan-500',
	},
	{
		icon: BarChart3,
		title: 'Real-Time Analytics',
		description:
			'Live Instagram Insights: impressions, reach, replies, exits, and taps — per story.',
		color: 'from-violet-500 to-purple-500',
	},
	{
		icon: Zap,
		title: 'Auto Publishing',
		description:
			'Cron-based engine with distributed locks and API quota gating. Retry on failure.',
		color: 'from-amber-500 to-orange-500',
	},
	{
		icon: Users,
		title: 'Team Workflows',
		description:
			'Contributors submit. Admins review and schedule. Role-based access control throughout.',
		color: 'from-emerald-500 to-green-500',
	},
	{
		icon: ShieldCheck,
		title: 'Media Pipeline',
		description:
			'Client-side FFmpeg validation, server transcoding, direct-to-storage uploads via signed URLs.',
		color: 'from-sky-500 to-indigo-500',
	},
];

const steps = [
	{
		step: '01',
		title: 'Submit',
		description: 'Upload your image or video. Instant validation ensures Instagram compatibility.',
	},
	{
		step: '02',
		title: 'Review',
		description: 'Admins swipe through the queue. Approve, reject, or request changes.',
	},
	{
		step: '03',
		title: 'Schedule & Publish',
		description: 'Drag onto the calendar. The engine publishes on time via Meta Graph API.',
	},
];

const stats = [
	{ value: '500+', label: 'Unit Tests' },
	{ value: '113', label: 'E2E Tests' },
	{ value: '50+', label: 'API Routes' },
	{ value: '24/7', label: 'Auto Publishing' },
];

export function LandingPage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Nav */}
			<nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
					<div className="flex items-center gap-2">
						<span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-xl font-black tracking-tighter text-transparent">
							ISM
						</span>
						<span className="text-xl font-black tracking-tighter text-foreground">
							Stories Manager
						</span>
					</div>
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => signIn('test-credentials', { email: 'demo@demo.com', callbackUrl: '/' })}
						>
							Try Demo
						</Button>
						<Button variant="ghost" size="sm" asChild>
							<Link href="/auth/signin">Sign in</Link>
						</Button>
						<Button size="sm" asChild>
							<Link href="/auth/signin">
								Get Started
								<ArrowRight className="ml-1 h-4 w-4" />
							</Link>
						</Button>
					</div>
				</div>
			</nav>

			{/* Hero */}
			<section className="relative overflow-hidden">
				{/* Background gradient orbs */}
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500/20 via-blue-500/10 to-pink-500/20 blur-3xl" />
					<div className="absolute -bottom-20 right-0 h-[300px] w-[400px] rounded-full bg-gradient-to-l from-blue-500/10 to-transparent blur-3xl" />
				</div>

				<div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:pb-36 lg:pt-36">
					<motion.div
						variants={stagger}
						initial="hidden"
						animate="visible"
						className="mx-auto max-w-3xl text-center"
					>
						<motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
							<Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5 text-sm">
								<Sparkles className="h-3.5 w-3.5" />
								Powered by Meta Graph API
							</Badge>
						</motion.div>

						<motion.h1
							variants={fadeUp}
							transition={{ duration: 0.5 }}
							className="text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl"
						>
							Automate Your{' '}
							<span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-transparent">
								Instagram Stories
							</span>
						</motion.h1>

						<motion.p
							variants={fadeUp}
							transition={{ duration: 0.5 }}
							className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
						>
							A team workflow for Instagram Stories. Submit content, swipe to review,
							drag to schedule, and publish automatically — all from one dashboard.
						</motion.p>

						<motion.div
							variants={fadeUp}
							transition={{ duration: 0.5 }}
							className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
						>
							<Button size="lg" className="h-12 w-full px-8 text-base sm:w-auto" asChild>
								<Link href="/auth/signin">
									Start Managing Stories
									<ArrowRight className="ml-2 h-5 w-5" />
								</Link>
							</Button>
							<Button
								variant="outline"
								size="lg"
								className="h-12 w-full px-8 text-base sm:w-auto"
								onClick={() => signIn('test-credentials', { email: 'demo@demo.com', callbackUrl: '/' })}
							>
								Try Demo
								<ArrowRight className="ml-2 h-5 w-5" />
							</Button>
						</motion.div>
					</motion.div>

					{/* Phone Mockup */}
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7, delay: 0.4 }}
						className="mx-auto mt-16 max-w-sm sm:mt-20"
					>
						<div className="relative mx-auto w-[260px] sm:w-[280px]">
							{/* Phone frame */}
							<div className="rounded-[2.5rem] border-[6px] border-foreground/10 bg-gradient-to-b from-muted to-muted/50 p-3 shadow-2xl dark:border-white/10">
								{/* Notch */}
								<div className="mx-auto mb-3 h-6 w-24 rounded-full bg-foreground/10" />
								{/* Screen content */}
								<div className="space-y-3 rounded-2xl bg-background p-4">
									{/* Mini review card */}
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500" />
										<div className="flex-1 space-y-1.5">
											<div className="h-3 w-24 rounded-full bg-muted" />
											<div className="h-2 w-16 rounded-full bg-muted/60" />
										</div>
										<Badge variant="secondary" className="text-[10px]">
											Pending
										</Badge>
									</div>
									<Separator />
									{/* Story preview placeholder */}
									<div className="aspect-[9/16] w-full rounded-xl bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-orange-500/20" />
									{/* Action buttons */}
									<div className="flex gap-2">
										<div className="flex h-10 flex-1 items-center justify-center rounded-lg bg-destructive/10 text-xs font-medium text-destructive">
											Reject
										</div>
										<div className="flex h-10 flex-1 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-medium text-emerald-600 dark:text-emerald-400">
											Approve
										</div>
									</div>
								</div>
								{/* Home indicator */}
								<div className="mx-auto mt-3 h-1 w-20 rounded-full bg-foreground/10" />
							</div>
						</div>
					</motion.div>
				</div>
			</section>

			{/* Features */}
			<section className="border-t bg-muted/30 py-20 sm:py-28">
				<div className="mx-auto max-w-6xl px-4 sm:px-6">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: '-100px' }}
						variants={stagger}
						className="text-center"
					>
						<motion.h2
							variants={fadeUp}
							transition={{ duration: 0.5 }}
							className="text-3xl font-black tracking-tight sm:text-4xl"
						>
							Everything you need to manage Stories
						</motion.h2>
						<motion.p
							variants={fadeUp}
							transition={{ duration: 0.5 }}
							className="mx-auto mt-4 max-w-2xl text-muted-foreground"
						>
							From content submission to publishing analytics — a complete pipeline built
							for teams.
						</motion.p>
					</motion.div>

					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: '-80px' }}
						variants={stagger}
						className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
					>
						{features.map((feature) => (
							<motion.div
								key={feature.title}
								variants={fadeUp}
								transition={{ duration: 0.4 }}
								className="group relative rounded-2xl border bg-card p-6 transition-shadow hover:shadow-lg"
							>
								<div
									className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-sm`}
								>
									<feature.icon className="h-5 w-5 text-white" />
								</div>
								<h3 className="text-lg font-bold">{feature.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
									{feature.description}
								</p>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* How It Works */}
			<section className="py-20 sm:py-28">
				<div className="mx-auto max-w-6xl px-4 sm:px-6">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: '-100px' }}
						variants={stagger}
						className="text-center"
					>
						<motion.h2
							variants={fadeUp}
							transition={{ duration: 0.5 }}
							className="text-3xl font-black tracking-tight sm:text-4xl"
						>
							How it works
						</motion.h2>
						<motion.p
							variants={fadeUp}
							transition={{ duration: 0.5 }}
							className="mx-auto mt-4 max-w-xl text-muted-foreground"
						>
							Three steps from content to published story.
						</motion.p>
					</motion.div>

					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: '-80px' }}
						variants={stagger}
						className="mt-16 grid gap-8 sm:gap-12 lg:grid-cols-3"
					>
						{steps.map((item, i) => (
							<motion.div
								key={item.step}
								variants={fadeUp}
								transition={{ duration: 0.4 }}
								className="relative text-center lg:text-left"
							>
								{/* Connector line (desktop only) */}
								{i < steps.length - 1 && (
									<div className="absolute right-0 top-8 hidden h-px w-full translate-x-1/2 bg-border lg:block" />
								)}
								<div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
									{item.step}
								</div>
								<h3 className="text-xl font-bold">{item.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
									{item.description}
								</p>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* Stats */}
			<section className="border-t bg-muted/30 py-16 sm:py-20">
				<div className="mx-auto max-w-6xl px-4 sm:px-6">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: '-60px' }}
						variants={stagger}
						className="grid grid-cols-2 gap-8 sm:gap-12 lg:grid-cols-4"
					>
						{stats.map((stat) => (
							<motion.div
								key={stat.label}
								variants={fadeUp}
								transition={{ duration: 0.4 }}
								className="text-center"
							>
								<div className="text-3xl font-black tracking-tight sm:text-4xl">
									{stat.value}
								</div>
								<div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* Tech Stack */}
			<section className="py-20 sm:py-28">
				<div className="mx-auto max-w-6xl px-4 sm:px-6">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: '-100px' }}
						variants={stagger}
						className="text-center"
					>
						<motion.h2
							variants={fadeUp}
							transition={{ duration: 0.5 }}
							className="text-3xl font-black tracking-tight sm:text-4xl"
						>
							Built with modern tools
						</motion.h2>
						<motion.p
							variants={fadeUp}
							transition={{ duration: 0.5 }}
							className="mx-auto mt-4 max-w-xl text-muted-foreground"
						>
							Production-grade stack designed for reliability and developer experience.
						</motion.p>
					</motion.div>

					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: '-80px' }}
						variants={stagger}
						className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
					>
						{[
							'Next.js 15',
							'TypeScript',
							'Supabase',
							'Tailwind CSS 4',
							'Meta Graph API',
							'Framer Motion',
							'Playwright',
							'Vercel',
						].map((tech) => (
							<motion.div
								key={tech}
								variants={fadeUp}
								transition={{ duration: 0.3 }}
								className="flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium"
							>
								<CheckCircle2 className="h-4 w-4 text-emerald-500" />
								{tech}
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* CTA */}
			<section className="border-t">
				<div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: '-80px' }}
						variants={stagger}
						className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-purple-700 p-8 text-center text-primary-foreground sm:p-14"
					>
						{/* Decorative circles */}
						<div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
						<div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

						<motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="relative">
							<Instagram className="mx-auto mb-6 h-12 w-12 opacity-90" />
							<h2 className="text-3xl font-black tracking-tight sm:text-4xl">
								Ready to automate your Stories?
							</h2>
							<p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
								Sign in with Google to start managing your Instagram Stories workflow today.
							</p>
							<Button
								size="lg"
								variant="secondary"
								className="mt-8 h-12 px-8 text-base font-bold"
								asChild
							>
								<Link href="/auth/signin">
									Get Started Free
									<ChevronRight className="ml-1 h-5 w-5" />
								</Link>
							</Button>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t py-8">
				<div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6">
					<div className="flex items-center gap-2">
						<span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text font-black tracking-tighter text-transparent">
							ISM
						</span>
						<span className="text-sm text-muted-foreground">Stories Manager</span>
					</div>
					<p className="text-xs text-muted-foreground">
						Built with Next.js, Supabase & Meta Graph API
					</p>
				</div>
			</footer>
		</div>
	);
}
