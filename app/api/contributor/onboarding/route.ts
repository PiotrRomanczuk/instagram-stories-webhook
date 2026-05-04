import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserEmail, isAuthenticated } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { onboardingSchema } from '@/lib/validations/onboarding.schema';
import { encryptPii } from '@/lib/pii/encrypt';
import { preventWriteInPreview, preventWriteForDemo } from '@/lib/preview-guard';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:contributor:onboarding';

export async function POST(request: NextRequest) {
	const previewGuard = preventWriteInPreview();
	if (previewGuard) return previewGuard;

	const session = await getServerSession(authOptions);
	if (!isAuthenticated(session)) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
	}
	const demoGuard = preventWriteForDemo(session);
	if (demoGuard) return demoGuard;

	const email = getUserEmail(session).toLowerCase();
	if (!email) {
		return NextResponse.json({ error: 'Missing email on session' }, { status: 400 });
	}

	const body = await request.json().catch(() => null);
	const parsed = onboardingSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'Invalid input', issues: parsed.error.issues },
			{ status: 400 }
		);
	}
	const input = parsed.data;

	const fullAddress = `${input.street}, ${input.postalCode} ${input.city}`;

	const update: Record<string, unknown> = {
		display_name: input.displayName,
		legal_name: input.legalName,
		phone: input.phone,
		address_city: input.city,
		has_other_employment_above_min_wage: input.hasOtherEmploymentAboveMinWage,
		is_student_under_26: input.isStudentUnder26,
		license_version: input.licenseVersion,
		license_accepted_at: new Date().toISOString(),
		onboarding_completed_at: new Date().toISOString(),
	};

	try {
		update.pesel_encrypted = encryptPii(input.pesel);
		update.address_encrypted = encryptPii(fullAddress);
		update.iban_encrypted = encryptPii(input.iban);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Encryption failed';
		Logger.error(MODULE, `Encryption setup error: ${message}`, err);
		return NextResponse.json(
			{ error: 'Server PII encryption is not configured' },
			{ status: 500 }
		);
	}

	const { error } = await supabaseAdmin
		.from('email_whitelist')
		.update(update)
		.eq('email', email);

	if (error) {
		Logger.error(MODULE, `Update failed for ${email}: ${error.message}`, error);
		return NextResponse.json(
			{ error: 'Failed to save onboarding data' },
			{ status: 500 }
		);
	}

	Logger.info(MODULE, `Onboarding completed for ${email.slice(0, 4)}***`);
	return NextResponse.json({ success: true });
}
