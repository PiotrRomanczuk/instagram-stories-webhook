import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy — Marszal-arts',
    description: 'Privacy Policy for the Marszal-arts content automation platform.',
};

export default function PrivacyPolicyPage() {
    return (
        <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral dark:prose-invert">
            <h1>Privacy Policy</h1>
            <p>
                <strong>Last updated:</strong> 2026-04-28
            </p>

            <p>
                This Privacy Policy describes how Marszal-arts (the &ldquo;Service&rdquo;) collects,
                uses, stores, and deletes information when you link third-party accounts
                (Google, Instagram, TikTok) and use the Service.
            </p>

            <h2>1. Information We Collect</h2>

            <h3>1.1 Account information</h3>
            <ul>
                <li>Google profile (email, display name, profile picture) — used for authentication.</li>
                <li>Instagram Business: page ID, IG user ID, page-scoped access token.</li>
                <li>
                    TikTok: <code>open_id</code>, display name, access token, refresh token, and
                    token expiry, obtained via OAuth scopes <code>user.info.basic</code>,
                    <code>video.upload</code>, and <code>video.publish</code>.
                </li>
            </ul>

            <h3>1.2 Content you provide</h3>
            <ul>
                <li>Media files (images, videos) you upload to the queue.</li>
                <li>Captions, schedules, and metadata you attach to that media.</li>
            </ul>

            <h3>1.3 Operational data</h3>
            <ul>
                <li>Publish history, error logs, and API quota counters.</li>
                <li>Audit log of admin and authentication events.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <ul>
                <li>To authenticate you and maintain your session.</li>
                <li>To publish content you have explicitly queued to the platforms you have linked.</li>
                <li>To refresh OAuth tokens before they expire.</li>
                <li>To display analytics and publish history back to you.</li>
                <li>To diagnose errors and enforce rate limits.</li>
            </ul>
            <p>
                We do <strong>not</strong> sell or share your data with advertisers, train AI
                models on it, or use it for any purpose unrelated to operating the Service.
            </p>

            <h2>3. TikTok Data Use Disclosure</h2>
            <p>
                Information obtained from TikTok (including access tokens and <code>open_id</code>)
                is used exclusively to:
            </p>
            <ul>
                <li>Identify your linked TikTok account.</li>
                <li>Upload and publish videos you have explicitly queued in the Service.</li>
                <li>Refresh tokens to keep your account linked.</li>
            </ul>
            <p>
                TikTok data is never sold, transferred, or used for any purpose other than
                providing the publishing feature you initiated. Use of TikTok data is bound by
                the <a href="https://developers.tiktok.com/doc/tiktok-api-platform-terms-of-service" rel="noreferrer">TikTok API Terms of Service</a> and
                the <a href="https://www.tiktok.com/legal/page/global/privacy-policy/en" rel="noreferrer">TikTok Privacy Policy</a>.
            </p>

            <h2>4. Storage &amp; Security</h2>
            <ul>
                <li>Data is stored in Supabase (Postgres) with row-level security enforced.</li>
                <li>OAuth access and refresh tokens are encrypted at rest.</li>
                <li>Media files are stored in Supabase Storage with signed-URL access only.</li>
                <li>Tokens are never logged or exposed to the browser.</li>
                <li>All transit is over HTTPS/TLS.</li>
            </ul>

            <h2>5. Retention</h2>
            <ul>
                <li>Linked-account records persist until you unlink the account or request deletion.</li>
                <li>Published content metadata is retained for analytics history.</li>
                <li>Logs are retained for up to 90 days, then purged.</li>
            </ul>

            <h2>6. Your Rights &amp; Data Deletion</h2>
            <p>You may at any time:</p>
            <ul>
                <li>Unlink Instagram or TikTok via Settings → Connected Accounts.</li>
                <li>
                    Request a full export or deletion of your account and all associated data by
                    emailing <a href="mailto:p.romanczuk@gmail.com">p.romanczuk@gmail.com</a>.
                </li>
            </ul>
            <p>
                Deletion requests are processed within 30 days. Deleting your TikTok or Instagram
                link revokes the corresponding tokens and removes them from our database.
            </p>

            <h2>7. Children&apos;s Privacy</h2>
            <p>
                The Service is not directed to anyone under 18 and does not knowingly collect data
                from minors.
            </p>

            <h2>8. Changes to This Policy</h2>
            <p>
                Changes will be reflected by updating the &ldquo;Last updated&rdquo; date above.
            </p>

            <h2>9. Contact</h2>
            <p>
                Privacy questions or deletion requests:&nbsp;
                <a href="mailto:p.romanczuk@gmail.com">p.romanczuk@gmail.com</a>
            </p>
        </main>
    );
}
