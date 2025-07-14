/* eslint-disable no-restricted-properties */
// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";
import * as Spotlight from "@spotlightjs/spotlight";

Sentry.init({
  dsn: "https://b6f4da42f81203b0c981bf0629659e45@o4507891927220224.ingest.us.sentry.io/4507891931021312",

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration(),
    Sentry.consoleLoggingIntegration(),
  ],

  // Adds request headers and IP for users, for more info visit
  sendDefaultPii: true,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  _experiments: { enableLogs: true },

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  Spotlight.init();
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
