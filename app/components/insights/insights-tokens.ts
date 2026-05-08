/**
 * Design tokens for the /insights workshop redesign. The page has its own
 * cream-paper visual language (matching the Marszal landing) that doesn't
 * use the global shadcn theme tokens — we apply these as CSS custom
 * properties on the page wrapper so the component subtree can reference
 * them via var(--ink), var(--bg), etc.
 */
import type { CSSProperties } from 'react';

export type InsightsThemeName = 'light' | 'dark';

interface InsightsTokens {
	[key: string]: string;
}

const LIGHT: InsightsTokens = {
	'--bg': '#f0eee9',
	'--bg-2': '#e8e6e0',
	'--surface': '#fbf9f4',
	'--surface-2': '#ffffff',
	'--ink': '#0d0d0e',
	'--ink-2': '#1a1a1c',
	'--muted': '#6b6a64',
	'--muted-2': '#93918a',
	'--line': '#d9d6cf',
	'--line-2': '#e6e3dc',
	'--accent': 'oklch(0.55 0.18 295)',
	'--accent-soft': 'oklch(0.94 0.04 295)',
	'--accent-ink': '#ffffff',
	'--amber': 'oklch(0.78 0.15 75)',
	'--amber-soft': 'oklch(0.94 0.06 80)',
	'--amber-ink': '#241a00',
	'--bar': 'oklch(0.55 0.18 295 / 0.85)',
	'--bar-track': 'rgba(13,13,14,0.06)',
	'--shadow': '0 1px 0 rgba(13,13,14,0.04), 0 6px 24px -12px rgba(13,13,14,0.10)',
};

const DARK: InsightsTokens = {
	'--bg': '#14130f',
	'--bg-2': '#1a1814',
	'--surface': '#1c1a16',
	'--surface-2': '#221f1a',
	'--ink': '#f3f1ec',
	'--ink-2': '#e7e4dd',
	'--muted': '#a09e95',
	'--muted-2': '#73706a',
	'--line': '#2a2722',
	'--line-2': '#22201c',
	'--accent': 'oklch(0.7 0.18 295)',
	'--accent-soft': 'oklch(0.32 0.08 295)',
	'--accent-ink': '#0d0d0e',
	'--amber': 'oklch(0.82 0.16 75)',
	'--amber-soft': 'oklch(0.32 0.06 75)',
	'--amber-ink': '#f3f1ec',
	'--bar': 'oklch(0.7 0.18 295 / 0.9)',
	'--bar-track': 'rgba(243,241,236,0.07)',
	'--shadow': '0 1px 0 rgba(0,0,0,0.4), 0 8px 28px -12px rgba(0,0,0,0.6)',
};

export function insightsTokenStyle(theme: InsightsThemeName): CSSProperties {
	return (theme === 'dark' ? DARK : LIGHT) as CSSProperties;
}

export const MONO_STACK = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";

// Compilation budget (seconds-per-tile assumption + total cap).
// FFmpeg pipeline caps at 60s; per-tile estimate is 5s/image and treated
// as 5s/video for budget display since live IG payload doesn't expose
// video durations.
export const SECONDS_PER_TILE = 5;
export const COMPILATION_CAP_SECONDS = 60;
export const MIN_PICKS = 3;
export const TARGET_PICKS = 7;
export const MAX_PICKS = 20;
export const TT_INBOX_DAILY_CAP = 5;
