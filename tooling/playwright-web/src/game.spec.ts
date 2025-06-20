import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { game, round, scoresheet, user } from "@board-games/db/schema";

test.describe("Game Page", () => {
  test.beforeAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const clerkUserId = process.env.E2E_CLERK_USER_ID!;
    const [returnedUser] = await db
      .select()
      .from(user)
      .where(eq(user.clerkUserId, clerkUserId));
    if (returnedUser) {
      const returnedGame = await db.query.game.findFirst({
        where: {
          userId: returnedUser.id,
          name: "Game Test",
        },
        with: {
          scoresheets: true,
        },
      });
      if (returnedGame) {
        if (returnedGame.scoresheets.length > 0) {
          const mappedScoresheets = returnedGame.scoresheets.map((s) => s.id);
          await db
            .delete(round)
            .where(inArray(round.scoresheetId, mappedScoresheets));
          await db
            .delete(scoresheet)
            .where(inArray(scoresheet.id, mappedScoresheets));
        }
        await db.delete(game).where(eq(game.id, returnedGame.id));
      }
    }
  });
  test.afterAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const clerkUserId = process.env.E2E_CLERK_USER_ID!;
    const [returnedUser] = await db
      .select()
      .from(user)
      .where(eq(user.clerkUserId, clerkUserId));
    if (returnedUser) {
      const returnedGame = await db.query.game.findFirst({
        where: {
          userId: returnedUser.id,
          name: "Game Test",
        },
        with: {
          scoresheets: true,
        },
      });
      if (returnedGame) {
        if (returnedGame.scoresheets.length > 0) {
          const mappedScoresheets = returnedGame.scoresheets.map((s) => s.id);
          await db
            .delete(round)
            .where(inArray(round.scoresheetId, mappedScoresheets));
          await db
            .delete(scoresheet)
            .where(inArray(scoresheet.id, mappedScoresheets));
        }
        await db.delete(game).where(eq(game.id, returnedGame.id));
      }
    }
  });
  test("Add Game when no games exist", async ({ page }) => {
    await page.goto("/dashboard/games");
    await page
      .getByRole("main")
      .getByRole("button")
      .filter({ hasText: /^$/ })
      .click();
    await page.getByPlaceholder("Game name").click();
    await page.getByPlaceholder("Game name").fill("Game Test");
    await expect(
      page.getByLabel("Add Game").getByText("Players"),
    ).not.toBeVisible();
    await expect(
      page.getByLabel("Add Game").getByText("Playtime"),
    ).not.toBeVisible();
    await expect(page.getByText("Year Published")).not.toBeVisible();
    await page.getByRole("button", { name: "More options" }).click();
    await expect(
      page.getByLabel("Add Game").getByText("Players"),
    ).toBeVisible();
    await expect(
      page.getByLabel("Add Game").getByText("Playtime"),
    ).toBeVisible();
    await expect(page.getByText("Year Published")).toBeVisible();
    await page.locator('input[name="playersMin"]').click();
    await page.locator('input[name="playersMin"]').fill("1");
    await page.locator('input[name="playersMax"]').click();
    await page.locator('input[name="playersMax"]').fill("4");
    await page.locator('input[name="playtimeMin"]').click();
    await page.locator('input[name="playtimeMin"]').fill("15");
    await page.locator('input[name="playtimeMax"]').click();
    await page.locator('input[name="playtimeMax"]').fill("30");
    await page.locator('input[name="yearPublished"]').click();
    await page.locator('input[name="yearPublished"]').fill("2014");
    await page.getByRole("button", { name: "Create New" }).click();
    await expect(page.getByRole("heading")).toContainText("Add Scoresheet");

    await page.getByRole("textbox", { name: "Sheet Name" }).click();
    await page.getByRole("textbox", { name: "Sheet Name" }).fill("Default");
    await page.getByRole("combobox", { name: "Win Condition" }).click();
    await page.getByLabel("Highest Score").getByText("Highest Score").click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByRole("heading")).toContainText("Add Game");

    await expect(
      page.getByRole("button", { name: "Default Win Condition:" }),
    ).toBeVisible();
    await expect(page.locator("form")).toContainText("Rounds:1");
    await expect(page.locator("form")).toContainText(
      "Win Condition:Highest Score",
    );
    await expect(page.locator("form")).toContainText("Default");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByLabel("Add Game")).not.toBeVisible();
    await page.getByRole("textbox", { name: "Search games..." }).click();
    await page.getByRole("textbox", { name: "Search games..." }).fill("Ga");

    await expect(page.getByRole("main")).toContainText("Game Test");
    await expect(page.getByRole("main")).toContainText("1-4 players");

    await expect(page.getByRole("main")).toContainText("15-30 min");

    await expect(page.getByRole("main")).toContainText("0 plays");
    await expect(page.getByRole("main")).toContainText("(2014)");
  });
});
