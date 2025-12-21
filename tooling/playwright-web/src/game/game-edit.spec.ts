import { expect, test } from "@playwright/test";

import { GAME_NAME } from "../shared/test-data";
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
    await page.goto("/dashboard/games");
    await page.getByRole("button", { name: "add game" }).click();
    await page.getByPlaceholder("Game name").click();
    await page.getByPlaceholder("Game name").fill(browserGameName);
    await page.getByRole("button", { name: "More options" }).click();
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
    // Wait for scoresheet form to appear
    await expect(page.getByRole("heading")).toContainText("Add Scoresheet");
    await page.getByRole("textbox", { name: "Sheet Name" }).click();
    await page.getByRole("textbox", { name: "Sheet Name" }).fill("Default");
    await page.getByRole("combobox", { name: "Win Condition" }).click();
    await page.getByLabel("Highest Score").getByText("Highest Score").click();
    await page.getByRole("button", { name: "Submit" }).click();
    // Wait for game form to appear again
    await expect(page.getByRole("heading")).toContainText("Add Game");
    await page.getByRole("button", { name: "Submit" }).click();
    // Wait for success toast to appear
    await expect(page.getByText(/Game .* created successfully!/i)).toBeVisible({
      timeout: 10000,
    });
    // Wait for navigation to complete
    await page.waitForURL(/\/dashboard\/games/, { timeout: 5000 });

    await expect(page.getByText(/Game .* created successfully!/i)).toBeVisible({
      timeout: 10000,
    });
    // Navigate to game detail page
    await page.goto("/dashboard/games");
    // Wait for search input to be ready
    const searchInput = page.getByRole("textbox", { name: "Search games..." });
    await searchInput.click();
    await searchInput.fill(browserGameName);
    // Find the game link using helper function (based on gameAriaText pattern)
    const gameLink = await findGameLink(page, browserGameName);
    await gameLink.click();
    // Wait for navigation to game detail page
    await page.waitForURL(/\/dashboard\/games\/\d+/, { timeout: 5000 });

    // Get game ID from URL
    const url = page.url();
    const gameIdMatch = /\/games\/(\d+)/.exec(url);
    if (!gameIdMatch) {
      throw new Error("Could not extract game ID from URL");
    }
    const gameIdToParse = gameIdMatch[1] ?? "";
    expect(gameIdToParse).not.toBe("");
    const gameId = parseInt(gameIdToParse, 10);

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

  test("More options collapsible", async ({ page, browserName }) => {
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

    // Verify more options button exists
    const moreOptionsButton = page.getByRole("button", {
      name: "More options",
    });
    await expect(moreOptionsButton).toBeVisible();

    // Click to expand
    await moreOptionsButton.click();

    // Verify additional fields are visible
    await expect(page.locator('input[name="playersMin"]')).toBeVisible();
    await expect(page.locator('input[name="playersMax"]')).toBeVisible();
    await expect(page.locator('input[name="playtimeMin"]')).toBeVisible();
    await expect(page.locator('input[name="playtimeMax"]')).toBeVisible();
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
