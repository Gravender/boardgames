import path from "path";
import { expect, test as setup } from "@playwright/test";

setup.describe.configure({ mode: "serial" });

setup("global setup", async () => {
  //TODO - remove this once we have a proper setup
});

const authFile = path.join("./playwright/.clerk/user.json");

setup("authenticate", async ({ page }) => {
  //TODO fix this
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: authFile });
});
