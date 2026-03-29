// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b6f4da42f81203b0c981bf0629659e45@o4507891927220224.ingest.us.sentry.io/4507891931021312",

  spotlight: process.env.NODE_ENV === "development",

  integrations: [Sentry.consoleLoggingIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  _experiments: { enableLogs: true },

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
