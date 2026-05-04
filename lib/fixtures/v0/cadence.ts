import type { V0CadenceConfig } from './types';

export const V0_CADENCE: V0CadenceConfig = {
	dailyTarget: 85,
	activeWindowStart: '08:00',
	activeWindowEnd: '00:00',
	minGapMinutes: 6,
	maxGapMinutes: 25,
	defaultPayoutRateZl: null,
};
