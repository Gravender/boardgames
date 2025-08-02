import { test as teardown } from "@playwright/test";

teardown("signout", async ({ page }) => {
  await page.goto("/");
  //TODO - remove this once we have a proper signout
  await page.goto("/dashboard");
  await page.waitForSelector("div:has-text('Sign in to Board Games Tracker')");
});
