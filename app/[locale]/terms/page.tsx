import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service — Marszal-arts',
    description: 'Terms of Service for the Marszal-arts content automation platform.',
};

export default function TermsOfServicePage() {
    return (
        <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral dark:prose-invert">
            <h1>Terms of Service</h1>
            <p>
                <strong>Last updated:</strong> 2026-04-28
            </p>

            <h2>1. Acceptance of Terms</h2>
            <p>
                By accessing or using Marszal-arts (the &ldquo;Service&rdquo;), you agree to be bound
                by these Terms of Service. If you do not agree, do not use the Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
                Marszal-arts is a personal content-automation platform that lets a logged-in
                operator link their Instagram Business and TikTok accounts in order to schedule
                and publish their own content (Instagram Stories, TikTok videos) from a unified
                queue. The Service is provided on an &ldquo;as-is&rdquo; basis and is intended for
                use by the account owner only.
            </p>

            <h2>3. Eligibility &amp; Account Linking</h2>
            <p>
                To use the Service you must:
            </p>
            <ul>
                <li>Be at least 18 years old.</li>
                <li>Authenticate via Google OAuth.</li>
                <li>Be on the email allowlist maintained by the operator.</li>
                <li>
                    Hold valid Instagram Business / TikTok accounts and grant the requested OAuth
                    scopes when linking.
                </li>
            </ul>

            <h2>4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
                <li>Publish content that violates Instagram&apos;s, TikTok&apos;s, or any other platform&apos;s policies.</li>
                <li>Post spam, deceptive, illegal, harassing, or infringing content.</li>
                <li>Circumvent rate limits, attempt to access other users&apos; data, or reverse-engineer the Service.</li>
                <li>Resell or redistribute access to the Service without written permission.</li>
            </ul>

            <h2>5. Third-Party Platforms</h2>
            <p>
                Use of linked platforms (Instagram, TikTok, Google) is also governed by their own
                terms. We are not responsible for changes to their APIs, content moderation
                decisions, or account suspensions on those platforms.
            </p>

            <h2>6. Intellectual Property</h2>
            <p>
                You retain ownership of all content you upload. You grant the Service a limited,
                revocable license to store, process, and publish that content to platforms you
                have explicitly linked, solely for the purpose of operating the Service on your
                behalf.
            </p>

            <h2>7. Termination</h2>
            <p>
                We may suspend or terminate access at any time if these terms are violated. You
                may stop using the Service at any time by unlinking your accounts and requesting
                data deletion (see Privacy Policy).
            </p>

            <h2>8. Disclaimers &amp; Limitation of Liability</h2>
            <p>
                The Service is provided without warranties of any kind. To the maximum extent
                permitted by law, the operator is not liable for any indirect, incidental, or
                consequential damages arising from use of the Service, including failed
                publishes, missed schedules, or platform actions taken against your accounts.
            </p>

            <h2>9. Changes to These Terms</h2>
            <p>
                These terms may be updated. Material changes will be reflected by updating the
                &ldquo;Last updated&rdquo; date above. Continued use after changes constitutes acceptance.
            </p>

            <h2>10. Contact</h2>
            <p>
                Questions about these terms: <a href="mailto:p.romanczuk@gmail.com">p.romanczuk@gmail.com</a>
            </p>
        </main>
    );
}
