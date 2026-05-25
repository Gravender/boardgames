// Injected content via Sentry wizard below
import { withSentryConfig } from "@sentry/nextjs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await jiti.import("@board-games/env/web");

/** @type {import("next").NextConfig} */
let nextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  images: {
    remotePatterns: [
      { hostname: "utfs.io" },
      { hostname: "ji5jeyxujf.ufs.sh" },
      { hostname: "picsum.photos" },
      { hostname: "avatars.githubusercontent.com" },
      { hostname: "cdn.jsdelivr.net" },
      { hostname: "picsum.photos" },
    ],
  },
  transpilePackages: [
    "@board-games/api",
    "@board-games/db",
    "@board-games/env",
    "@board-games/ui",
    "@board-games/shared",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  // PostHog rewrites
  async rewrites() {
    return [
      {
        source: "/relay-wYwH/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/relay-wYwH/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

nextConfig = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "gravender",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",
});

export default nextConfig;
