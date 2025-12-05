import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { expect, test as setup } from "@playwright/test";

import { baseUrl } from "./baseurl";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

setup.describe.configure({ mode: "serial" });

setup("authenticate", async ({ page, browserName }) => {
  let username = process.env.E2E_TEST_USERNAME;
  let password = process.env.E2E_TEST_PASSWORD;
  let email = process.env.E2E_TEST_EMAIL;

  if (!username || !password || !email) {
    throw new Error(
      "E2E_TEST_USERNAME, E2E_TEST_PASSWORD, and E2E_TEST_EMAIL must be set",
    );
  }

  username = username + browserName;
  password = password + browserName;
  // Insert browserName into email local part (before @) to create unique but valid emails
  // e.g., test@example.com + chromium -> testchromium@example.com
  const [localPart, domain] = email.split("@");
  if (!domain) {
    throw new Error(`Invalid email format: ${email}`);
  }
  email = `${localPart}${browserName}@${domain}`;

  // Use browser-specific file paths (relative to config file location)
  // Config file is at tooling/playwright-web/playwright.config.ts
  // So paths should be relative to tooling/playwright-web/
  // Playwright resolves storageState paths relative to the config file location
  const authDir = path.resolve(__dirname, "..", "playwright", ".better-auth");
  const authFile = path.join(authDir, `user-${browserName}.json`);
  const userIdFile = path.join(authDir, `userId-${browserName}.json`);

  // Ensure the directory exists
  mkdirSync(authDir, { recursive: true });

  console.log(`[${browserName}] Saving auth file to: ${authFile}`);
  console.log(`[${browserName}] Saving userId file to: ${userIdFile}`);

  let userId: string | undefined;

  // Try to sign in first by navigating to the login page
  await page.goto(`${baseUrl}/login`);
  await expect(page).toHaveURL(/\/login/);

  // Wait for the login form to be visible
  await page.waitForSelector('input[placeholder="username"]', {
    state: "visible",
  });
  await page.waitForSelector('input[type="password"]', { state: "visible" });

  // Fill in the login form
  await page.fill('input[placeholder="username"]', username);
  await page.fill('input[type="password"]', password);

  // Submit the form and wait for navigation
  const loginPromise = page.waitForURL(`${baseUrl}/dashboard`, {
    timeout: 15000,
  });
  await page.click('button[type="submit"]:has-text("Login")');

  // Check if login was successful
  try {
    await loginPromise;
    // Login successful - we're now on the dashboard
  } catch {
    // Login failed, try to sign up instead
    await page.goto(`${baseUrl}/sign-up`);
    await expect(page).toHaveURL(/\/sign-up/);

    // Wait for the sign-up form to be visible
    await page.waitForSelector('input[placeholder="username"]', {
      state: "visible",
    });
    await page.waitForSelector('input[placeholder="John Doe"]', {
      state: "visible",
    });
    await page.waitForSelector('input[placeholder="m@example.com"]', {
      state: "visible",
    });
    await page.waitForSelector('input[type="password"]', { state: "visible" });

    // Fill in the sign-up form
    await page.fill('input[placeholder="username"]', username);
    await page.fill('input[placeholder="John Doe"]', username);
    await page.fill('input[placeholder="m@example.com"]', email);
    await page.fill('input[type="password"]', password);

    // Submit the sign-up form
    const signupPromise = page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.click('button[type="submit"]:has-text("Signup")');

    try {
      await signupPromise;
      // Sign-up successful - we're now on the dashboard
    } catch (error) {
      throw new Error(
        `Failed to sign up: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Get userId from session API
  const sessionResponse = await page.request.get(
    `${baseUrl}/api/auth/get-session`,
  );
  if (sessionResponse.ok()) {
    const sessionData = (await sessionResponse.json()) as {
      user?: { id?: string };
    };
    userId = sessionData.user?.id;
  }

  if (!userId) {
    throw new Error("Failed to get userId from Better Auth");
  }

  // Save userId to file for use in tests
  writeFileSync(userIdFile, JSON.stringify({ userId }, null, 2));

  // Verify we're on the dashboard
  await expect(page).toHaveURL(`${baseUrl}/dashboard`);

  // Save authenticated state (cookies are automatically captured from page context)
  await page.context().storageState({ path: authFile });
});
