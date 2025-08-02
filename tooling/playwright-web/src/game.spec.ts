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
  async function deleteGames(browserName: string) {
    const clerkUserId = getClerkUserId();
    //TODO - fix this
    const [returnedUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, clerkUserId));
    if (returnedUser) {
      const browserGameName = browserName + "_" + GAME_NAME;
      const editedBrowserGameName = browserName + "_" + EDITED_GAME_NAME;
      const returnedGames = await db.query.game.findMany({
        where: {
          createdBy: returnedUser.id,
          name: {
            OR: [browserGameName, editedBrowserGameName],
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
  function gameAriaText(
    gameName: string,
    yearPublished: number,
    playersMin: number,
    playersMax: number,
    playtimeMin: number,
    playtimeMax: number,
  ) {
    const temp = `
        - listitem:
          - link:
            - /url: //dashboard/games/\\d+/
          - heading "${gameName}" [level=3]
          - text: (${yearPublished})
          - button "Open menu"
          - text: ${playersMin}-${playersMax} players ${playtimeMin}-${playtimeMax} min 0 plays
        `;
    return temp;
  }
  test.beforeAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });
  test.afterAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });
  test("Add Game when no games exist", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    await page.goto("/dashboard/games");
    await page.getByRole("button", { name: "add game" }).click();
    await page.getByPlaceholder("Game name").click();
    await page.getByPlaceholder("Game name").fill(browserGameName);
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
    await page.getByRole("textbox", { name: "Search games..." }).click();
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);

    const originalGameAriaText = gameAriaText(
      browserGameName,
      2014,
      1,
      4,
      15,
      30,
    );
    await expect(
      page.getByLabel("Games", { exact: true }).getByRole("listitem"),
    ).toMatchAriaSnapshot(originalGameAriaText);
  });
  test("Edit game", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    const editedBrowserGameName = browserName + "_" + EDITED_GAME_NAME;
    await page.goto("/dashboard/games");
    await page.getByRole("textbox", { name: "Search games..." }).click();
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    const originalGameAriaText = gameAriaText(
      browserGameName,
      2014,
      1,
      4,
      15,
      30,
    );
    await expect(
      page.getByLabel("Games", { exact: true }).getByRole("listitem"),
    ).toMatchAriaSnapshot(originalGameAriaText);
    await page.getByRole("button", { name: "Open menu" }).first().click();
    await page.getByRole("menuitem", { name: "Edit" }).click();

    await page.getByRole("textbox", { name: "Game Name" }).click();
    await page
      .getByRole("textbox", { name: "Game Name" })
      .fill(editedBrowserGameName);
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
      .fill(editedBrowserGameName);
    const editedGameAriaText = gameAriaText(
      editedBrowserGameName,
      2003,
      4,
      5,
      12,
      14,
    );
    await expect(
      page.getByLabel("Games", { exact: true }).getByRole("listitem"),
    ).toMatchAriaSnapshot(editedGameAriaText);
  });
});
