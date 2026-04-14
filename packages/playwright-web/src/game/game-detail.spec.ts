import { expect, test } from "@playwright/test";

import { GAME_NAME } from "../shared/test-data";
import { createGameViaTrpc } from "../trpc/procedures";
import { deleteGames } from "./helpers";

test.describe("Game Detail Page", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteGames(browserName);
    // Create the game once for all tests in this suite
    const browserGameName = browserName + "_" + GAME_NAME;
    await createGameViaTrpc(browserName, browserGameName);
  });
  test.afterAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });

  test("Navigate to game detail page", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    // Navigate to games list and click on game
    await page.goto("/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    await expect(
      page.getByRole("link", { name: browserGameName }),
    ).toBeVisible();
    await page.getByRole("link", { name: browserGameName }).click();

    // Verify we're on the game detail page
    await expect(page).toHaveURL(/\/games\/\d+/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      browserGameName,
    );
  });

  test("Verify game information display", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    await page.goto("/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    await expect(
      page.getByRole("link", { name: browserGameName }),
    ).toBeVisible();
    await page.getByRole("link", { name: browserGameName }).click();

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
    await page.goto("/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    await expect(
      page.getByRole("link", { name: browserGameName }),
    ).toBeVisible();
    await page.getByRole("link", { name: browserGameName }).click();

    // Verify statistics link exists
    await expect(page.getByRole("link", { name: "Stats" })).toBeVisible();
    await page.getByRole("link", { name: "Stats" }).click();
    await expect(page).toHaveURL(/\/games\/\d+\/stats/);
  });

  test("Verify match history display", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    await page.goto("/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    await expect(
      page.getByRole("link", { name: browserGameName }),
    ).toBeVisible();
    await page.getByRole("link", { name: browserGameName }).click();
    await expect(page).toHaveURL(/\/games\/\d+/);
    // Header and match history use separate Suspense boundaries — wait in parallel
    // so we do not fail while one subtree is still on its fallback.
    await Promise.all([
      expect(page.getByRole("heading", { level: 1 })).toContainText(
        browserGameName,
        { timeout: 15_000 },
      ),
      expect(page.getByRole("heading", { name: "Match History" })).toBeVisible({
        timeout: 15_000,
      }),
    ]);
    await expect(page.getByTestId("game-match-history-heading")).toBeVisible();
  });

  test("Verify add match button", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    await page.goto("/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    await expect(
      page.getByRole("link", { name: browserGameName }),
    ).toBeVisible();
    await page.getByRole("link", { name: browserGameName }).click();
    await expect(page).toHaveURL(/\/games\/\d+/);
    await Promise.all([
      expect(page.getByRole("heading", { level: 1 })).toContainText(
        browserGameName,
        { timeout: 15_000 },
      ),
      expect(page.getByTestId("game-add-match")).toBeVisible({
        timeout: 15_000,
      }),
    ]);
  });
});
