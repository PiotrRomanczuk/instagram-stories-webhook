'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';

type Step = 'welcome' | 'profile' | 'guidelines';

interface WelcomeWizardProps {
    initialDisplayName: string;
    accountEmail: string;
}

const GUIDELINES = [
    'Submit only content you have rights to publish.',
    'Captions stay on-brand and free of spam, hate speech, or false claims.',
    'Use 9:16 vertical format for Stories. Images: JPG/PNG. Videos: MP4 H.264, ≤ 60s.',
    'Expect a review turnaround of up to 24 hours.',
    'Approved content is scheduled and published by an admin — you do not connect your own Instagram.',
];

export function WelcomeWizard({ initialDisplayName, accountEmail }: WelcomeWizardProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>('welcome');
    const [displayName, setDisplayName] = useState(initialDisplayName);
    const [handle, setHandle] = useState('');
    const [contactEmail, setContactEmail] = useState(accountEmail);
    const [acknowledged, setAcknowledged] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const goNext = () => {
        if (step === 'welcome') setStep('profile');
        else if (step === 'profile') setStep('guidelines');
    };

    const goBack = () => {
        if (step === 'profile') setStep('welcome');
        else if (step === 'guidelines') setStep('profile');
    };

    const profileValid =
        displayName.trim().length > 0 &&
        handle.trim().length > 0 &&
        /^[a-zA-Z0-9_.]+$/.test(handle.trim());

    const handleSubmit = async () => {
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch('/api/profile/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: displayName.trim(),
                    handle: handle.trim(),
                    contactEmail: contactEmail.trim() || undefined,
                    acknowledgedGuidelines: acknowledged,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? 'Failed to save profile');
            }
            router.push('/');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="w-full max-w-xl">
            <CardHeader>
                <CardTitle>{stepTitle(step)}</CardTitle>
                <CardDescription>{stepDescription(step)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {step === 'welcome' && (
                    <div className="space-y-3 text-sm text-muted-foreground">
                        <p>You&apos;ve been invited as a creator. Here&apos;s how it works:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Submit your content — videos and images.</li>
                            <li>An admin reviews, schedules, and publishes it on the brand&apos;s Instagram.</li>
                            <li>You&apos;ll get notified when your post is approved, scheduled, and live.</li>
                        </ol>
                    </div>
                )}

                {step === 'profile' && (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="displayName">Display name</Label>
                            <Input
                                id="displayName"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Jane Doe"
                                maxLength={100}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="handle">Creator handle</Label>
                            <Input
                                id="handle"
                                value={handle}
                                onChange={(e) => setHandle(e.target.value)}
                                placeholder="janedoe"
                                maxLength={50}
                            />
                            <p className="text-xs text-muted-foreground">
                                Letters, numbers, dots, and underscores. Used for credits.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="contactEmail">Contact email (optional)</Label>
                            <Input
                                id="contactEmail"
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {step === 'guidelines' && (
                    <div className="space-y-4">
                        <ul className="space-y-2 text-sm text-foreground/90">
                            {GUIDELINES.map((g) => (
                                <li key={g} className="flex gap-2">
                                    <span aria-hidden>•</span>
                                    <span>{g}</span>
                                </li>
                            ))}
                        </ul>
                        <label className="flex items-start gap-2 text-sm">
                            <Checkbox
                                checked={acknowledged}
                                onCheckedChange={(v) => setAcknowledged(v === true)}
                                aria-label="Acknowledge guidelines"
                            />
                            <span>I&apos;ve read and agree to the content guidelines.</span>
                        </label>
                    </div>
                )}

                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}

                <div className="flex justify-between gap-2 pt-2">
                    {step !== 'welcome' ? (
                        <Button type="button" variant="outline" onClick={goBack} disabled={submitting}>
                            Back
                        </Button>
                    ) : (
                        <span />
                    )}

                    {step !== 'guidelines' ? (
                        <Button
                            type="button"
                            onClick={goNext}
                            disabled={step === 'profile' && !profileValid}
                        >
                            Continue
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!acknowledged || submitting}
                        >
                            {submitting ? 'Saving…' : 'Finish'}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function stepTitle(step: Step): string {
    switch (step) {
        case 'welcome':
            return 'Welcome aboard';
        case 'profile':
            return 'Set up your profile';
        case 'guidelines':
            return 'Content guidelines';
    }
}

function stepDescription(step: Step): string {
    switch (step) {
        case 'welcome':
            return 'A quick tour before you start submitting content.';
        case 'profile':
            return 'Tell us how to credit and contact you.';
        case 'guidelines':
            return 'Quick rules so your submissions get approved fast.';
    }
}
