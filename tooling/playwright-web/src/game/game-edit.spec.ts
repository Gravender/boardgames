import { expect, test } from "@playwright/test";

import { GAME_NAME } from "../shared/test-data";
import { createGameViaTrpc } from "../trpc/procedures";
import { deleteGames, findGameCard, findGameLink } from "./helpers";

test.describe("Game Edit Page", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });
  test.afterAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });

  test("Navigate to edit page from game detail", async ({
    page,
    browserName,
  }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    // Create a game first
    const createdGame = await createGameViaTrpc(browserName, browserGameName);
    const gameId = createdGame.id;

    // Navigate back to games list page to access the menu
    await page.goto("/dashboard/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    // Find the game card and get the menu button within it
    const gameCard = await findGameCard(page, browserGameName);
    const menuButton = gameCard.getByRole("button", { name: "Open menu" });
    await menuButton.click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    // Wait for navigation to edit page
    await page.waitForURL(/\/dashboard\/games\/\d+\/edit/, { timeout: 5000 });

    // Verify we're on edit page
    await expect(page).toHaveURL(`/dashboard/games/${gameId}/edit`);
    await expect(page.getByRole("textbox", { name: "Game Name" })).toHaveValue(
      browserGameName,
    );
  });

  test("Edit game basic properties", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    const editedName = browserGameName + " Edited";

    // Create and navigate to edit page
    await page.goto("/dashboard/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    // Find the game card and get the menu button within it
    const gameCard = await findGameCard(page, browserGameName);
    const menuButton = gameCard.getByRole("button", { name: "Open menu" });
    await menuButton.click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    // Wait for navigation to edit page
    await page.waitForURL(/\/dashboard\/games\/\d+\/edit/, { timeout: 5000 });

    // Edit game name
    const nameInput = page.getByRole("textbox", { name: "Game Name" });
    await nameInput.clear();
    await nameInput.fill(editedName);

    // Submit
    await page.getByRole("button", { name: "Submit" }).click();

    // Verify change persisted
    await page.waitForURL(/\/dashboard\/games/, { timeout: 5000 });

    await expect(page.getByText(/Game .* updated successfully!/i)).toBeVisible({
      timeout: 10000,
    });

    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(editedName);
    // Use findGameLink to verify the edited game is visible
    const editedGameLink = await findGameLink(page, editedName);
    await expect(editedGameLink).toBeVisible();
  });

  test("Form validation", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    await page.goto("/dashboard/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);
    // Find the game card and get the menu button within it
    const gameCard = await findGameCard(page, browserGameName);
    const menuButton = gameCard.getByRole("button", { name: "Open menu" });
    await menuButton.click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    // Wait for navigation to edit page
    await page.waitForURL(/\/dashboard\/games\/\d+\/edit/, { timeout: 5000 });

    // Clear required field
    const nameInput = page.getByRole("textbox", { name: "Game Name" });
    await nameInput.clear();

    // Try to submit
    await page.getByRole("button", { name: "Submit" }).click();

    // Verify validation error (form should not submit)
    await expect(nameInput).toBeVisible();
  });
});
