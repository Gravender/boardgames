import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { game, round, scoresheet, user } from "@board-games/db/schema";

test.describe("Game Page", () => {
  const GAME_NAME = "Game Test";
  const EDITED_GAME_NAME = "Edited Game";
  function getClerkUserId() {
    if (!process.env.E2E_CLERK_USER_ID) {
      throw new Error("E2E_CLERK_USER_ID is not set");
    }
    return process.env.E2E_CLERK_USER_ID;
  }
  async function deleteGames() {
    const clerkUserId = getClerkUserId();
    const [returnedUser] = await db
      .select()
      .from(user)
      .where(eq(user.clerkUserId, clerkUserId));
    if (returnedUser) {
      const returnedGames = await db.query.game.findMany({
        where: {
          userId: returnedUser.id,
          name: {
            OR: [GAME_NAME, EDITED_GAME_NAME],
          },
        },
        with: {
          scoresheets: true,
        },
      });
      if (returnedGames.length > 0) {
        const mappedScoresheets = returnedGames.flatMap((g) =>
          g.scoresheets.map((s) => s.id),
        );
        if (mappedScoresheets.length > 0) {
          await db
            .delete(round)
            .where(inArray(round.scoresheetId, mappedScoresheets));
          await db
            .delete(scoresheet)
            .where(inArray(scoresheet.id, mappedScoresheets));
        }
        await db.delete(game).where(
          inArray(
            game.id,
            returnedGames.map((g) => g.id),
          ),
        );
      }
    }
  }
  test.beforeAll(async () => {
    await deleteGames();
  });
  test.afterAll(async () => {
    await deleteGames();
  });
  test("Add Game when no games exist", async ({ page }) => {
    await page.goto("/dashboard/games");
    await page
      .getByRole("main")
      .getByRole("button")
      .filter({ hasText: /^$/ })
      .click();
    await page.getByPlaceholder("Game name").click();
    await page.getByPlaceholder("Game name").fill(GAME_NAME);
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
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(GAME_NAME);

    await expect(page.getByRole("main")).toContainText(GAME_NAME);
    await expect(page.getByRole("main")).toContainText("1-4 players");

    await expect(page.getByRole("main")).toContainText("15-30 min");

    await expect(page.getByRole("main")).toContainText("0 plays");
    await expect(page.getByRole("main")).toContainText("(2014)");
  });
  test("Edit game", async ({ page }) => {
    await page.goto("/dashboard/games");
    await page.getByRole("textbox", { name: "Search games..." }).click();
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(GAME_NAME);

    await page.getByRole("button", { name: "Open menu" }).first().click();
    await page.getByRole("menuitem", { name: "Edit" }).click();

    await page.getByRole("textbox", { name: "Game Name" }).click();
    await page
      .getByRole("textbox", { name: "Game Name" })
      .fill(EDITED_GAME_NAME);
    await page.getByRole("button", { name: "More options" }).click();
    await page.locator('input[name="playersMin"]').click();
    await page.locator('input[name="playersMin"]').fill("4");
    await page.locator('input[name="playersMax"]').click();
    await page.locator('input[name="playersMax"]').fill("5");
    await page.locator('input[name="playtimeMin"]').click();
    await page.locator('input[name="playtimeMin"]').fill("12");
    await page.locator('input[name="playtimeMax"]').click();
    await page.locator('input[name="playtimeMax"]').fill("14");
    await page.getByPlaceholder("Year").click();
    await page.getByPlaceholder("Year").fill("2003");
    await page.getByRole("button", { name: "Submit" }).click();

    await page.getByRole("textbox", { name: "Search games..." }).click();
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(EDITED_GAME_NAME);
    await expect(page.getByRole("main")).toContainText(EDITED_GAME_NAME);
    await expect(page.getByRole("main")).toContainText("4-5 players");

    await expect(page.getByRole("main")).toContainText("12-14 min");

    await expect(page.getByRole("main")).toContainText("0 plays");
    await expect(page.getByRole("main")).toContainText("(2003)");
  });
});
