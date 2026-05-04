export type V0Role = 'contributor' | 'curator' | 'admin';

export type V0SubmissionStatus =
	| 'pending'
	| 'approved'
	| 'scheduled'
	| 'published'
	| 'rejected'
	| 'withdrawn';

export type V0PayoutStatus = 'pending' | 'invoiced' | 'paid' | 'voided';

export type V0CategoryKind = 'holiday' | 'theme' | 'event' | 'content_type';

export type V0TagSource = 'ai' | 'contributor' | 'curator';

export interface V0Category {
	slug: string;
	label: string;
	kind: V0CategoryKind;
}

export interface V0Contributor {
	id: string;
	role: V0Role;
	email: string;
	legalName: string;
	displayName: string;
	displayNameOverride?: string;
	addressCity: string;
	taxResidency: string;
	hasOtherEmploymentAboveMinWage: boolean;
	isStudentUnder26: boolean;
	onboardingCompletedAt: string;
	licenseAcceptedAt: string;
	licenseVersion: string;
	deletedAt?: string;
}

export interface V0SubmissionTag {
	categorySlug: string;
	source: V0TagSource;
	confidence?: number;
}

export interface V0Submission {
	id: string;
	contributorId: string;
	mediaType: 'IMAGE' | 'VIDEO';
	storageUri: string;
	thumbnailUri: string;
	caption?: string;
	holidayHint?: string;
	categories: V0SubmissionTag[];
	keywords: string[];
	status: V0SubmissionStatus;
	createdAt: string;
	approvedAt?: string;
	scheduledFor?: string;
	scheduleMode?: 'auto' | 'pinned';
	pinnedAt?: string;
	publishedAt?: string;
	igMediaId?: string;
	rejectedReason?: string;
	payoutAmountZl?: number;
	payoutBonusZl?: number;
	payoutStatus?: V0PayoutStatus;
	payoutPeriod?: string;
}

export interface V0ComposedVideo {
	id: string;
	sourceSubmissionIds: string[];
	durationSeconds: number;
	storageUri: string;
	thumbnailUri: string;
	caption?: string;
	status: 'draft' | 'queued' | 'processing' | 'completed' | 'failed' | 'published';
	tikTokPublishStatus?: 'draft' | 'published';
	createdAt: string;
	publishedAt?: string;
	tikTokRef?: string;
}

export interface V0PayoutPeriod {
	period: string;
	contributorId: string;
	totalZl: number;
	postCount: number;
	invoiceNumber?: string;
	paidAt?: string;
	transferReference?: string;
}

export interface V0CadenceConfig {
	dailyTarget: number;
	activeWindowStart: string;
	activeWindowEnd: string;
	minGapMinutes: number;
	maxGapMinutes: number;
	defaultPayoutRateZl: number | null;
}
