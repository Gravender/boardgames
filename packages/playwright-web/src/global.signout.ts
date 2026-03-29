import { expect, test as teardown } from "@playwright/test";

import { baseUrl } from "./baseurl";

teardown("signout", async ({ page }) => {
  // Navigate to dashboard to access the sidebar with user menu
  await page.goto(`${baseUrl}/dashboard`);
  await expect(page).toHaveURL(`${baseUrl}/dashboard`);

  // Wait for the sidebar to be visible
  await page.waitForSelector('[data-sidebar="menu"]', { state: "visible" });

  // Wait for the user menu button in the sidebar footer to be visible
  // The button contains an Avatar and user name/email
  await page.waitForSelector('button:has([class*="Avatar"])', {
    state: "visible",
  });

  // Click on the user menu dropdown trigger (avatar/name in sidebar footer)
  await page.click('button:has([class*="Avatar"])');

  // Wait for the dropdown menu to appear with the "Log out" option
  // The menu item is a button/div with text "Log out"
  await page.waitForSelector('[role="menuitem"]:has-text("Log out")', {
    state: "visible",
  });

  // Click the "Log out" menu item and wait for navigation to login page
  const logoutPromise = page.waitForURL(`${baseUrl}/login`);
  await page.click('[role="menuitem"]:has-text("Log out")');

  // Wait for navigation to login page
  await logoutPromise;
  await expect(page).toHaveURL(`${baseUrl}/login`);
});
