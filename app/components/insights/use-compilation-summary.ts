'use client';

import { useMemo } from 'react';
import {
	COMPILATION_CAP_SECONDS,
	MIN_PICKS,
	SECONDS_PER_TILE,
	TARGET_PICKS,
} from './insights-tokens';

export interface CompilationSummary {
	count: number;
	seconds: number;
	cap: number;
	target: number;
	min: number;
	overBudget: boolean;
	underMin: boolean;
	atTarget: boolean;
	fillPct: number; // 0..100 of 60s cap
}

export function useCompilationSummary(picks: number): CompilationSummary {
	return useMemo(() => {
		const seconds = picks * SECONDS_PER_TILE;
		const fillPct = Math.min(seconds / COMPILATION_CAP_SECONDS, 1) * 100;
		return {
			count: picks,
			seconds,
			cap: COMPILATION_CAP_SECONDS,
			target: TARGET_PICKS,
			min: MIN_PICKS,
			overBudget: seconds > COMPILATION_CAP_SECONDS,
			underMin: picks > 0 && picks < MIN_PICKS,
			atTarget: picks === TARGET_PICKS,
			fillPct,
		};
	}, [picks]);
}
