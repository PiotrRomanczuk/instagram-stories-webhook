import Link from 'next/link';
import { Inter } from 'next/font/google';
import packageJson from '@/package.json';
import { LandingHero } from './landing-hero';
import { LandingFeatures } from './landing-features';
import {
	LandingHowItWorks,
	LandingCompare,
	LandingPricing,
	LandingCta,
	LandingFooter,
} from './landing-sections';

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin'],
	weight: ['400', '500', '600', '700', '800'],
});

export function LandingPage() {
	return (
		<div
			className={`${inter.variable} font-marszal min-h-screen bg-marszal-bg text-marszal-ink antialiased [font-feature-settings:'cv11','ss01']`}
		>
			<nav className="sticky top-0 z-50 border-b border-marszal-line2 bg-marszal-bg/85 backdrop-blur-md">
				<div className="mx-auto flex h-[60px] max-w-[1180px] items-center justify-between px-7">
					<a href="#" className="flex items-center gap-2.5 text-[16px] font-bold tracking-[-0.01em]">
						<span className="grid h-[26px] w-[26px] place-items-center rounded-md bg-marszal-ink text-[13px] font-extrabold tracking-[-0.02em] text-marszal-bg">
							M
						</span>
						<span>Marszal</span>
					</a>
					<div className="hidden gap-7 text-[14px] text-marszal-muted lg:flex">
						<a href="#features" className="hover:text-marszal-ink">Features</a>
						<a href="#how" className="hover:text-marszal-ink">How it works</a>
						<a href="#compare" className="hover:text-marszal-ink">Why Marszal</a>
						<a href="#pricing" className="hover:text-marszal-ink">Pricing</a>
						<Link href="/release-notes" className="font-marszal-mono hover:text-marszal-ink">/docs</Link>
					</div>
					<div className="flex items-center gap-2.5">
						<Link
							href="/auth/signin"
							className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-[14px] font-medium text-marszal-ink hover:bg-black/5"
						>
							Sign in
						</Link>
						<Link
							href="/auth/signin"
							className="inline-flex items-center gap-2 rounded-md bg-marszal-ink px-3.5 py-2 text-[14px] font-medium text-marszal-bg transition hover:-translate-y-px hover:bg-marszal-ink2"
						>
							Start free →
						</Link>
					</div>
				</div>
			</nav>

			<LandingHero />
			<LandingFeatures />
			<LandingHowItWorks />
			<LandingCompare />
			<LandingPricing />
			<LandingCta />
			<LandingFooter version={packageJson.version} />
		</div>
	);
}
