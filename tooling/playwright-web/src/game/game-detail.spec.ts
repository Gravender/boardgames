import { expect, test } from "@playwright/test";

import { GAME_NAME } from "../shared/test-data";
import { createGameViaTrpc } from "../trpc/procedures";
import { deleteGames } from "./helpers";

test.describe("Game Detail Page", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });
  test.afterAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });

  test("Navigate to game detail page", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    // First create a game
    await createGameViaTrpc(browserName, browserGameName);
    // Navigate to games list and click on game
    await page.goto("/dashboard/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    await expect(
      page.getByRole("link", { name: browserGameName }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: browserGameName })
      .click();

    // Verify we're on the game detail page
    await expect(page).toHaveURL(/\/dashboard\/games\/\d+/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      browserGameName,
    );
  });

  test("Verify game information display", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    await page.goto("/dashboard/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    await expect(
      page.getByRole("link", { name: browserGameName }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: browserGameName })
      .click();

    // Verify game name is displayed
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      browserGameName,
    );

    // Verify game details are visible (players, playtime, year)

    await expect(page.getByRole("main")).toContainText("15-30 min");
    await expect(page.getByRole("main")).toContainText("2014");
    await expect(page.getByRole("main")).toContainText("1-4 Players");
  });

  test("Verify statistics link", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    await page.goto("/dashboard/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    await expect(
      page.getByRole("link", { name: browserGameName }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: browserGameName })
      .click();

    // Verify statistics link exists
    await expect(page.getByRole("link", { name: "Stats" })).toBeVisible();
    await page.getByRole("link", { name: "Stats" }).click();
    await expect(page).toHaveURL(/\/dashboard\/games\/\d+\/stats/);
  });

  test("Verify match history display", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    await page.goto("/dashboard/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    await expect(
      page.getByRole("link", { name: browserGameName }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: browserGameName })
      .click();

    // Verify match history section exists
    await expect(
      page.getByRole("heading", { name: /Match History/i }),
    ).toBeVisible();
  });

  test("Verify add match button", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    await page.goto("/dashboard/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    await expect(
      page.getByRole("link", { name: browserGameName }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: browserGameName })
      .click();

    // Verify add match button exists (it's a floating button)
    const addMatchButton = page.getByRole("button", {
      name: "add match",
    });
    await expect(addMatchButton).toBeVisible();
  });
});
