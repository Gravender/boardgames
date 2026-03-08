import { expect, test as teardown } from "@playwright/test";

import { baseUrl } from "./baseurl";

teardown("signout", async ({ page }) => {
  // Navigate to dashboard to access the sidebar with user menu
  await page.goto(`${baseUrl}/dashboard`);
  await expect(page).toHaveURL(`${baseUrl}/dashboard`);

  // Wait for the sidebar to be visible
  await page.waitForSelector('[data-sidebar="menu"]', { state: "visible" });

  // Open the user dropdown from the sidebar footer using stable data attributes.
  const userMenuTrigger = page
    .locator('[data-sidebar="footer"]')
    .locator('[data-sidebar="menu-button"]')
    .first();
  await expect(userMenuTrigger).toBeVisible();
  await userMenuTrigger.focus();
  await userMenuTrigger.press("Enter");
  await expect(userMenuTrigger).toHaveAttribute("data-state", "open");

  // Wait for the dropdown menu to appear with the "Log out" option
  // The menu item is a button/div with text "Log out"
  await page.waitForSelector('[role="menuitem"]:has-text("Log out")', {
    state: "visible",
  });

  // Click the "Log out" menu item and wait for navigation to login page
  const logoutPromise = page.waitForURL(/\/login/);
  const logoutMenuItem = page.getByRole("menuitem", { name: "Log out" });
  await expect(logoutMenuItem).toBeVisible();
  await logoutMenuItem.focus();
  await logoutMenuItem.press("Enter");

  // Wait for navigation to login page
  await logoutPromise;
  await expect(page).toHaveURL(/\/login/);
});
