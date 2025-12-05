import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, devices } from "@playwright/test";

import "dotenv/config";

import { baseUrl } from "./src/baseurl";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./src",
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 3,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: baseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup better-auth chromium",
      testMatch: /global\.auth\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
      teardown: "cleanup better-auth chromium",
    },
    {
      name: "setup better-auth firefox",
      testMatch: /global\.auth\.ts/,
      use: {
        ...devices["Desktop Firefox"],
      },
      teardown: "cleanup better-auth firefox",
    },
    {
      name: "setup better-auth webkit",
      testMatch: /global\.auth\.ts/,
      use: {
        ...devices["Desktop Safari"],
      },
      teardown: "cleanup better-auth webkit",
    },
    {
      name: "cleanup better-auth chromium",
      use: {
        storageState: path.resolve(
          __dirname,
          "playwright",
          ".better-auth",
          "user-chromium.json",
        ),
      },
      testMatch: /global\.signout\.ts/,
    },
    {
      name: "cleanup better-auth firefox",
      use: {
        storageState: path.resolve(
          __dirname,
          "playwright",
          ".better-auth",
          "user-firefox.json",
        ),
      },
      testMatch: /global\.signout\.ts/,
    },
    {
      name: "cleanup better-auth webkit",
      use: {
        storageState: path.resolve(
          __dirname,
          "playwright",
          ".better-auth",
          "user-webkit.json",
        ),
      },
      testMatch: /global\.signout\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.resolve(
          __dirname,
          "playwright",
          ".better-auth",
          "user-chromium.json",
        ),
      },
      dependencies: ["setup better-auth chromium"],
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: path.resolve(
          __dirname,
          "playwright",
          ".better-auth",
          "user-firefox.json",
        ),
      },
      dependencies: ["setup better-auth firefox"],
    },

    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: path.resolve(
          __dirname,
          "playwright",
          ".better-auth",
          "user-webkit.json",
        ),
      },
      dependencies: ["setup better-auth webkit"],
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
});
