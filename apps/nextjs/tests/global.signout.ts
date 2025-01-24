import { clerk } from "@clerk/testing/playwright";
import { test as teardown } from "@playwright/test";

teardown("delete database", async ({ page }) => {
  await page.goto("/");
  await clerk.signOut({
    page,
  });
  await page.goto("/dashboard");
  await page.waitForSelector("div:has-text('Sign in to Board Games Tracker')");
});
