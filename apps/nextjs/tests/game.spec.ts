import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { game, round, scoresheet, user } from "@board-games/db/schema";

test.describe("Game Page", () => {
  test.afterAll(async () => {
    // eslint-disable-next-line no-restricted-properties, @typescript-eslint/no-non-null-assertion
    const clerkUserId = process.env.E2E_CLERK_USER_ID!;
    const returnedUser = (
      await db.select().from(user).where(eq(user.clerkUserId, clerkUserId))
    )[0];
    if (returnedUser) {
      const returnedScoreSheet = (
        await db
          .select()
          .from(scoresheet)
          .where(eq(scoresheet.userId, returnedUser.id))
      )[0];
      if (returnedScoreSheet) {
        await db
          .delete(round)
          .where(eq(round.scoresheetId, returnedScoreSheet.id));
        await db
          .delete(scoresheet)
          .where(eq(scoresheet.userId, returnedUser.id));
        await db.delete(game).where(eq(game.userId, returnedUser.id));
      }
    }
  });
  test("Add Game when no games exist", async ({ page }) => {
    await page.goto("/dashboard/games");
    await page.pause();
    await page.getByRole("main").getByRole("button").nth(4).click();
    await page.getByPlaceholder("Game name").click();
    await page.getByPlaceholder("Game name").fill("Game Test");
    await page.getByRole("button", { name: "More options" }).click();
    await page.locator('input[name="playersMin"]').click();
    await page.locator('input[name="playersMin"]').fill("1");
    await page.locator('input[name="playersMax"]').click();
    await page.locator('input[name="playersMax"]').fill("4");
    await page.locator('input[name="playtimeMin"]').click();
    await page.locator('input[name="playtimeMin"]').fill("15");
    await page.locator('input[name="playtimeMax"]').click();
    await page.locator('input[name="playtimeMax"]').fill("30");
    await page.locator('[id="\\:ra\\:-form-item"]').click();
    await page.locator('[id="\\:ra\\:-form-item"]').fill("2014");
    await page.getByRole("button", { name: "Create New" }).click();
    await expect(page).toHaveURL(/dashboard\/games\/add\/scoresheet/);
    await page
      .locator("div:nth-child(6) > div:nth-child(3) > button")
      .first()
      .click();
    await page
      .locator("div:nth-child(6) > div:nth-child(3) > button")
      .first()
      .click();
    await page
      .locator("div:nth-child(6) > div:nth-child(3) > button")
      .first()
      .click();

    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page).toHaveURL(/dashboard\/games/);
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByLabel("Add Game")).not.toBeVisible();
    await expect(page.locator("tbody")).toMatchAriaSnapshot(
      `- heading "Game Test" [level=2]`,
    );
    await expect(page.locator("tbody")).toContainText("2014");
    await expect(
      page.getByRole("cell", { name: "Game Test Last Played:" }),
    ).toBeVisible();
  });
});
