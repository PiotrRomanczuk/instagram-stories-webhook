// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://953407bc08bbe9328902f9d067b0a046@o4507242635853824.ingest.de.sentry.io/4510789940543568",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  // Suppress known non-actionable errors to reduce noise
  ignoreErrors: [
    // Cron already-running is expected behaviour, not an error
    "Another cron execution is in progress",
    // Auth rejections are handled at the route level and are not bugs
    "Unauthorized",
  ],

  // Default tags applied to every server-side Sentry event
  initialScope: {
    tags: {
      runtime: "server",
    },
  },
});
