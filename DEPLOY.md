# Deploying to Vercel

This application is optimized for deployment on Vercel.

## Prerequisites

1. A Vercel Account
2. Linked GitHub Repository

## Steps

1. **Import Project**: In Vercel Dashboard, import the repository.
2. **Framework Preset**: Vercel should auto-detect **Next.js**.
3. **Environment Variables**:
   Copy the following variables from your `.env.local` to Vercel's Environment Variables settings:
   
   **Authentication & Database**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Required for Cron Jobs & Admin tasks)
   - `SUPABASE_JWT_SECRET`
   - `NEXTAUTH_URL` (Set to your Vercel deployment URL, e.g., `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET` (Generate a random string: `openssl rand -base64 32`)
   
   **Google Auth**
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `ADMIN_EMAIL` (Comma-separated list of admin emails)
   
   **Facebook/Instagram App**
   - `NEXT_PUBLIC_FB_APP_ID`
   - `FB_APP_SECRET`
   
   **Security**
   - `CRON_SECRET` (Required): Generate a strong random string. This protects your cron jobs.
   - `WEBHOOK_SECRET`: If you use external webhooks.

4. **Deploy**: Click **Deploy**.

## Cron Jobs

This project uses **Vercel Cron Jobs** to process scheduled posts.
- The configuration is in `vercel.json`.
- Vercel will automatically schedule the jobs upon deployment.
- **Important**: Ensure you set the `CRON_SECRET` environment variable in Vercel.

## Troubleshooting

- **Build Logs**: Check Vercel logs if build fails.
- **Cron Jobs**: Vercel Cron jobs might not run on the "Hobby" plan automatically or might have limitations. Check Vercel pricing/limits.
