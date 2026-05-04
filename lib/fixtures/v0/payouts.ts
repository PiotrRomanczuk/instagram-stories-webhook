import type { V0PayoutPeriod } from './types';
import { V0_ACTIVE_CONTRIBUTORS } from './contributors';
import { V0_SUBMISSIONS } from './submissions';

function buildPeriods(): V0PayoutPeriod[] {
	const out: V0PayoutPeriod[] = [];
	const periods = ['2026-03', '2026-04', '2026-05'];

	for (const period of periods) {
		for (const contributor of V0_ACTIVE_CONTRIBUTORS) {
			const subs = V0_SUBMISSIONS.filter(
				(s) =>
					s.contributorId === contributor.id &&
					s.status === 'published' &&
					s.payoutPeriod === period
			);
			if (subs.length === 0) continue;

			const total = subs.reduce(
				(acc, s) => acc + (s.payoutAmountZl ?? 0) + (s.payoutBonusZl ?? 0),
				0
			);

			const isHistorical = period !== '2026-05';
			out.push({
				period,
				contributorId: contributor.id,
				totalZl: total,
				postCount: subs.length,
				invoiceNumber: isHistorical
					? `MA/${period.replace('-', '/')}/${contributor.id.slice(-2).toUpperCase()}`
					: undefined,
				paidAt: isHistorical ? `${period}-15T10:00:00Z` : undefined,
				transferReference: isHistorical
					? `przelew ${period} ${contributor.displayName}`
					: undefined,
			});
		}
	}

	return out;
}

export const V0_PAYOUT_PERIODS: V0PayoutPeriod[] = buildPeriods();

export function payoutsForContributor(contributorId: string): V0PayoutPeriod[] {
	return V0_PAYOUT_PERIODS.filter((p) => p.contributorId === contributorId);
}
