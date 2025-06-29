import path from "path";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

setup.describe.configure({ mode: "serial" });

setup("global setup", async () => {
  if (
    !process.env.E2E_CLERK_PUBLISHABLE_KEY ||
    !process.env.E2E_CLERK_SECRET_KEY
  ) {
    throw new Error(
      "Please provide E2E_CLERK_PUBLISHABLE_KEY and E2E_CLERK_SECRET_KEY environment variables.",
    );
  }
  await clerkSetup({
    publishableKey: process.env.E2E_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.E2E_CLERK_SECRET_KEY,
  });
  if (
    !process.env.E2E_CLERK_USER_USERNAME ||
    !process.env.E2E_CLERK_USER_PASSWORD ||
    !process.env.E2E_CLERK_USER_ID
  ) {
    throw new Error(
      "Please provide E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD and E2E_CLERK_USER_ID environment variables.",
    );
  }
});

const authFile = path.join("./playwright/.clerk/user.json");

setup("authenticate", async ({ page }) => {
  if (
    !process.env.E2E_CLERK_USER_USERNAME ||
    !process.env.E2E_CLERK_USER_PASSWORD ||
    !process.env.E2E_CLERK_USER_ID
  ) {
    throw new Error(
      "Please provide E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD and E2E_CLERK_USER_ID environment variables.",
    );
  }
  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",

      identifier: process.env.E2E_CLERK_USER_USERNAME,
      password: process.env.E2E_CLERK_USER_PASSWORD,
    },
  });
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: authFile });
});
