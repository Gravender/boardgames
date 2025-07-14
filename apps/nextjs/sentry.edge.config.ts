// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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
