'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Progress } from '@/app/components/ui/progress';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LICENSE_VERSION = 'mlc-v1.0-2026-05';

const STEPS = ['license', 'identity', 'address', 'tax', 'bank', 'display'] as const;
type Step = (typeof STEPS)[number];

interface FormState {
	licenseAccepted: boolean;
	legalName: string;
	pesel: string;
	street: string;
	city: string;
	postalCode: string;
	hasOtherEmploymentAboveMinWage: boolean;
	isStudentUnder26: boolean;
	iban: string;
	phone: string;
	displayName: string;
}

const INITIAL: FormState = {
	licenseAccepted: false,
	legalName: '',
	pesel: '',
	street: '',
	city: '',
	postalCode: '',
	hasOtherEmploymentAboveMinWage: false,
	isStudentUnder26: false,
	iban: '',
	phone: '',
	displayName: '',
};

const LICENSE_TEXT = `Marszal Arts Contributor License (v1.0, draft — pending PL lawyer review).

By accepting this license you grant Marszal Arts a perpetual, royalty-free, sublicensable, irrevocable right to use, edit, republish, and compose the works you submit, on Instagram, TikTok, and any future channel operated by Marszal Arts. You warrant that the works are your own and that you hold all required rights. Personal data (legal name, PESEL, address, IBAN) is retained for 5 years per Polish accounting law (Ustawa o rachunkowości art. 74). After that period, on written request, PII is deleted; published works remain in use under this license. You may at any time request anonymization of your authorship credit on the public published wall — content stays, attribution becomes a pseudonym.`;

interface OnboardingWizardProps {
	demoMode?: boolean;
}

export function OnboardingWizard({ demoMode = false }: OnboardingWizardProps) {
	const router = useRouter();
	const [step, setStep] = useState<Step>('license');
	const [form, setForm] = useState<FormState>(INITIAL);
	const [submitting, setSubmitting] = useState(false);
	const idx = STEPS.indexOf(step);
	const progress = ((idx + 1) / STEPS.length) * 100;
	const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
		setForm((f) => ({ ...f, [k]: v }));

	const canAdvance: Record<Step, boolean> = {
		license: form.licenseAccepted,
		identity: form.legalName.trim().length > 1 && form.pesel.length === 11,
		address:
			form.street.trim().length > 1 &&
			form.city.trim().length > 1 &&
			/^\d{2}-\d{3}$/.test(form.postalCode),
		tax: true,
		bank: form.iban.replace(/\s/g, '').length >= 26 && form.phone.length >= 9,
		display: form.displayName.trim().length > 1,
	};

	const submit = async () => {
		if (demoMode) {
			toast.success('Onboarding submitted', { description: 'Demo only — no backend write.' });
			return;
		}
		setSubmitting(true);
		try {
			const res = await fetch('/api/contributor/onboarding', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					licenseAccepted: form.licenseAccepted,
					licenseVersion: LICENSE_VERSION,
					legalName: form.legalName,
					pesel: form.pesel,
					street: form.street,
					city: form.city,
					postalCode: form.postalCode,
					hasOtherEmploymentAboveMinWage: form.hasOtherEmploymentAboveMinWage,
					isStudentUnder26: form.isStudentUnder26,
					iban: form.iban,
					phone: form.phone,
					displayName: form.displayName,
				}),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `HTTP ${res.status}`);
			}
			toast.success('Onboarding completed');
			router.push('/submit');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Submit failed';
			toast.error('Could not save onboarding', { description: message });
		} finally {
			setSubmitting(false);
		}
	};

	const next = () => {
		if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
		else void submit();
	};
	const back = () => idx > 0 && setStep(STEPS[idx - 1]);

	return (
		<Card className="mx-auto max-w-2xl">
			<CardHeader>
				<CardTitle>Step {idx + 1} of {STEPS.length}: {label(step)}</CardTitle>
				<CardDescription>
					{description(step)}
				</CardDescription>
				<Progress value={progress} className="mt-2" />
			</CardHeader>
			<CardContent className="space-y-6">
				{step === 'license' && <LicenseStep form={form} onChange={set} />}
				{step === 'identity' && <IdentityStep form={form} onChange={set} />}
				{step === 'address' && <AddressStep form={form} onChange={set} />}
				{step === 'tax' && <TaxStep form={form} onChange={set} />}
				{step === 'bank' && <BankStep form={form} onChange={set} />}
				{step === 'display' && <DisplayStep form={form} onChange={set} />}

				<div className="flex justify-between pt-4 border-t">
					<Button variant="outline" onClick={back} disabled={idx === 0 || submitting}>
						<ChevronLeft className="h-4 w-4" /> Back
					</Button>
					<Button onClick={next} disabled={!canAdvance[step] || submitting}>
						{idx === STEPS.length - 1 ? (
							submitting ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" /> Submitting…
								</>
							) : (
								<>
									<Check className="h-4 w-4" /> Submit
								</>
							)
						) : (
							<>
								Next <ChevronRight className="h-4 w-4" />
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function label(s: Step) {
	return {
		license: 'Content license',
		identity: 'Identity',
		address: 'Address',
		tax: 'Tax & ZUS',
		bank: 'Bank & contact',
		display: 'Display name',
	}[s];
}

function description(s: Step) {
	return {
		license: 'Read and accept the contributor license. Required to upload.',
		identity: 'Legal name and PESEL — used for the monthly umowa o dzieło and PIT-11.',
		address: 'Mailing address — required for the umowa o dzieło and PIT-11.',
		tax: 'These two flags determine ZUS exposure on the umowa o dzieło.',
		bank: 'IBAN for monthly transfer; phone for payment reconciliation.',
		display: 'How your attribution appears on the public published wall.',
	}[s];
}

type StepProps = {
	form: FormState;
	onChange: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
};

function LicenseStep({ form, onChange }: StepProps) {
	return (
		<div className="space-y-4">
			<div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
				{LICENSE_TEXT}
			</div>
			<label className="flex items-start gap-3">
				<Checkbox
					checked={form.licenseAccepted}
					onCheckedChange={(v) => onChange('licenseAccepted', v === true)}
				/>
				<span className="text-sm">
					I have read and accept the Marszal Arts Contributor License (v1.0).
				</span>
			</label>
		</div>
	);
}

function IdentityStep({ form, onChange }: StepProps) {
	return (
		<div className="space-y-4">
			<Field label="Legal name (as on dowód osobisty)">
				<Input
					value={form.legalName}
					onChange={(e) => onChange('legalName', e.target.value)}
					placeholder="Jan Kowalski"
				/>
			</Field>
			<Field label="PESEL">
				<Input
					value={form.pesel}
					onChange={(e) => onChange('pesel', e.target.value.replace(/\D/g, '').slice(0, 11))}
					placeholder="11 digits"
					inputMode="numeric"
				/>
				<p className="text-xs text-muted-foreground mt-1">Encrypted at rest in v1.</p>
			</Field>
		</div>
	);
}

function AddressStep({ form, onChange }: StepProps) {
	return (
		<div className="space-y-4">
			<Field label="Street + number">
				<Input value={form.street} onChange={(e) => onChange('street', e.target.value)} />
			</Field>
			<div className="grid grid-cols-[1fr_2fr] gap-4">
				<Field label="Postal code">
					<Input
						value={form.postalCode}
						onChange={(e) => onChange('postalCode', e.target.value)}
						placeholder="00-000"
					/>
				</Field>
				<Field label="City">
					<Input value={form.city} onChange={(e) => onChange('city', e.target.value)} />
				</Field>
			</div>
		</div>
	);
}

function TaxStep({ form, onChange }: StepProps) {
	return (
		<div className="space-y-4 text-sm">
			<label className="flex items-start gap-3">
				<Checkbox
					checked={form.hasOtherEmploymentAboveMinWage}
					onCheckedChange={(v) => onChange('hasOtherEmploymentAboveMinWage', v === true)}
				/>
				<span>I have another employment paying at least minimum wage (umowa o pracę / B2B).</span>
			</label>
			<label className="flex items-start gap-3">
				<Checkbox
					checked={form.isStudentUnder26}
					onCheckedChange={(v) => onChange('isStudentUnder26', v === true)}
				/>
				<span>I am a student under 26.</span>
			</label>
			<p className="text-xs text-muted-foreground">
				If neither box is checked, ZUS may apply to your umowa o dzieło. We&apos;ll surface this to admin so it can be discussed before sign-off.
			</p>
		</div>
	);
}

function BankStep({ form, onChange }: StepProps) {
	return (
		<div className="space-y-4">
			<Field label="IBAN">
				<Input
					value={form.iban}
					onChange={(e) => onChange('iban', e.target.value)}
					placeholder="PL00 0000 0000 0000 0000 0000 0000"
				/>
				<p className="text-xs text-muted-foreground mt-1">Encrypted at rest in v1.</p>
			</Field>
			<Field label="Phone">
				<Input
					value={form.phone}
					onChange={(e) => onChange('phone', e.target.value)}
					placeholder="+48 ..."
				/>
			</Field>
		</div>
	);
}

function DisplayStep({ form, onChange }: StepProps) {
	return (
		<div className="space-y-4">
			<Field label="Display name on the public wall">
				<Input
					value={form.displayName}
					onChange={(e) => onChange('displayName', e.target.value)}
					placeholder="e.g. Anna · Marszal Arts"
				/>
				<p className="text-xs text-muted-foreground mt-1">
					You can request anonymization (&ldquo;Anonim&rdquo;) at any time after onboarding.
				</p>
			</Field>
		</div>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			{children}
		</div>
	);
}
