import { z } from 'zod';

const PESEL_RE = /^\d{11}$/;
const POSTAL_RE = /^\d{2}-\d{3}$/;

export const onboardingSchema = z.object({
	licenseAccepted: z.literal(true, { message: 'License must be accepted.' }),
	licenseVersion: z.string().min(1).max(64),
	legalName: z.string().trim().min(2).max(120),
	pesel: z.string().regex(PESEL_RE, 'PESEL must be 11 digits.'),
	street: z.string().trim().min(2).max(200),
	city: z.string().trim().min(2).max(80),
	postalCode: z.string().regex(POSTAL_RE, 'Postal code must be NN-NNN.'),
	hasOtherEmploymentAboveMinWage: z.boolean(),
	isStudentUnder26: z.boolean(),
	iban: z
		.string()
		.transform((s) => s.replace(/\s/g, ''))
		.refine((s) => s.length >= 26 && s.length <= 34, 'IBAN length must be 26-34.'),
	phone: z.string().trim().min(7).max(32),
	displayName: z.string().trim().min(2).max(80),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
