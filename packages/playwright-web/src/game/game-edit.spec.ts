import { expect, test } from "@playwright/test";

import { GAME_NAME } from "../shared/test-data";
import {
  createGameViaTrpc,
  createGameWithScoresheetViaTrpc,
} from "../trpc/procedures";
import { deleteGames, findGameLink } from "./helpers";

test.describe("Game Edit Page", () => {
  // Shared state for game cleanup
  let gameId: number | undefined;
  test.beforeAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });
  test.afterAll(async ({ browserName }) => {
    await deleteGames(browserName);
  });
  test.beforeEach(async ({ browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    const createdGame = await createGameViaTrpc(browserName, browserGameName);
    gameId = createdGame.id;
  });

  test.afterEach(async ({ browserName }) => {
    // Cleanup game after each test
    await deleteGames(browserName);
  });

  test("Navigate to edit page from game detail", async ({
    page,
    browserName,
  }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    // Navigate back to games list page to access the menu
    await page.goto("/dashboard/games");
    await page
      .getByRole("textbox", { name: "Search games..." })
      .fill(browserGameName);

    const menuButton = page.getByRole("button", { name: "Open menu" });
    await menuButton.click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    // Wait for navigation to edit page
    await page.waitForURL(/\/dashboard\/games\/\d+\/edit/, {
      timeout: 5000,
    });

    // Verify we're on edit page
    await expect(page).toHaveURL(`/dashboard/games/${gameId}/edit`);
    await expect(page.getByRole("textbox", { name: "Game Name" })).toHaveValue(
      browserGameName,
    );
  });

  test("Edit game basic properties", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;
    const editedName = browserGameName + " Edited";

    // Navigate to edit page
    await page.goto(`/dashboard/games/${gameId}/edit`);

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

  test("Form validation", async ({ page }) => {
    // Navigate to edit page
    await page.goto(`/dashboard/games/${gameId}/edit`);

    // Clear required field
    const nameInput = page.getByRole("textbox", { name: "Game Name" });
    await nameInput.clear();

    // Try to submit
    await page.getByRole("button", { name: "Submit" }).click();

    // Verify validation error (form should not submit)
    await expect(nameInput).toBeVisible();
  });

  test("Change game image to different SVG icon", async ({ page }) => {
    // Navigate to edit page
    await page.goto(`/dashboard/games/${gameId}/edit`);

    // Open icon selector (assuming there's a button or popover to change icon)
    // Look for icon selector - it might be in a popover or button

    await page.getByRole("button", { name: "Icons" }).click();

    const iconButton = page.getByRole("button", { name: "icon-Gamepad" });
    await iconButton.click();

    // Submit
    await page.getByRole("button", { name: "Submit" }).click();

    // Verify change persisted
    await page.waitForURL(/\/dashboard\/games/, { timeout: 5000 });
    await expect(page.getByText(/Game .* updated successfully!/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("Change default scoresheet", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;

    // Create game with multiple scoresheets
    const createdGame = await createGameWithScoresheetViaTrpc(
      browserName,
      browserGameName,
      [
        {
          name: "Default Scoresheet",
          winCondition: "Highest Score",
          isDefault: true,
          rounds: [
            { name: "Round 1", type: "Numeric" },
            { name: "Round 2", type: "Numeric" },
          ],
        },
        {
          name: "Alternative Scoresheet",
          winCondition: "Lowest Score",
          isDefault: false,
          rounds: [{ name: "Round 1", type: "Numeric" }],
        },
      ],
    );
    gameId = createdGame.id;

    // Navigate to edit page
    await page.goto(`/dashboard/games/${gameId}/edit`);

    // Find the scoresheet section and switch to the alternative scoresheet
    // Look for scoresheet tabs or buttons
    const scoresheetButton = page.getByText("Alternative Scoresheet");
    await scoresheetButton.click();

    // Mark this scoresheet as default
    const isDefaultCheckbox = page.getByRole("checkbox", {
      name: /Is Default/i,
    });
    const isChecked = await isDefaultCheckbox.isChecked();
    if (!isChecked) {
      await isDefaultCheckbox.click();
    }

    // Submit
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    // Verify change persisted
    await page.waitForURL(/\/dashboard\/games/, { timeout: 5000 });
    await expect(page.getByText(/Game .* updated successfully!/i)).toBeVisible({
      timeout: 10000,
    });

    // Verify default changed by navigating back
    await page.goto(`/dashboard/games/${gameId}/edit`);

    // Check that Alternative Scoresheet is now default
    const altScoresheetButton = page.getByText("Alternative Scoresheet");
    await altScoresheetButton.click();
    await expect(
      page.getByRole("checkbox", { name: /Is Default/i }),
    ).toBeChecked();
  });

  test("Change number of rounds for a scoresheet", async ({
    page,
    browserName,
  }) => {
    const browserGameName = browserName + "_" + GAME_NAME;

    // Create game with scoresheet containing initial rounds
    const createdGame = await createGameWithScoresheetViaTrpc(
      browserName,
      browserGameName,
      [
        {
          name: "Test Scoresheet",
          winCondition: "Highest Score",
          rounds: [
            { name: "Round 1", type: "Numeric" },
            { name: "Round 2", type: "Numeric" },
          ],
        },
      ],
    );
    gameId = createdGame.id;

    // Navigate to edit page
    await page.goto(`/dashboard/games/${gameId}/edit`);

    // Navigate to scoresheet section
    const scoresheetButton = page.getByText("Test Scoresheet");
    await scoresheetButton.click();

    // Add a new round

    await page.locator('button[name="addRound"]').click(); // Fill in the new round details
    const roundInputs = page.locator('input[placeholder*="Round" i]');
    const roundCount = await roundInputs.count();
    const newRoundInput = roundInputs.nth(roundCount - 1);
    await newRoundInput.fill("Round 3");

    // Submit
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByRole("button", { name: "Submit" }).click();

    // Verify change persisted
    await page.waitForURL(/\/dashboard\/games/, { timeout: 5000 });
    await expect(page.getByText(/Game .* updated successfully!/i)).toBeVisible({
      timeout: 10000,
    });

    // Verify rounds count changed
    await page.goto(`/dashboard/games/${gameId}/edit`);

    const editedScoresheetButton = page.getByText("Test Scoresheet");
    await editedScoresheetButton.click();

    // Verify there are now 3 rounds
    const finalRoundInputs = page.locator('input[placeholder*="Round" i]');
    await expect(finalRoundInputs).toHaveCount(3);
  });

  test("Add scoresheet", async ({ page }) => {
    // Navigate to edit page
    await page.goto(`/dashboard/games/${gameId}/edit`);

    // Click "Create New" button in scoresheet section
    const createButton = page.getByRole("button", { name: "Create New" });
    await createButton.click();

    // Wait for scoresheet form
    await page.waitForSelector(
      'input[placeholder*="Sheet name" i], input[name="name"]',
      { state: "visible" },
    );

    // Fill in scoresheet details
    const nameInput = page
      .getByRole("textbox", { name: "Sheet Name" })
      .or(page.locator('input[name="name"]'));
    await nameInput.fill("New Scoresheet");

    // Set win condition
    await page.locator('button[name="winCondition"]').click();
    await page.getByRole("option", { name: "Highest Score" }).click();

    // Add a round
    const roundInput = page
      .locator('input[placeholder*="Round" i]')
      .or(page.locator('input[name="rounds.0.name"]'))
      .first();
    await roundInput.fill("Round 1");

    // Submit scoresheet form
    const submitButton = page.getByRole("button", { name: "Submit" });
    await submitButton.click();

    // Submit the main form
    await page.getByRole("button", { name: "Submit" }).click();

    // Verify change persisted
    await page.waitForURL(/\/dashboard\/games/, { timeout: 5000 });
    await expect(page.getByText(/Game .* updated successfully!/i)).toBeVisible({
      timeout: 10000,
    });

    // Verify scoresheet was added
    await page.goto(`/dashboard/games/${gameId}/edit`);

    // Check that the new scoresheet is visible
    await expect(page.getByText("New Scoresheet")).toBeVisible();
  });

  test("Delete scoresheet", async ({ page, browserName }) => {
    const browserGameName = browserName + "_" + GAME_NAME;

    // Create game with multiple scoresheets
    const createdGame = await createGameWithScoresheetViaTrpc(
      browserName,
      browserGameName,
      [
        {
          name: "Scoresheet 1",
          winCondition: "Highest Score",
          rounds: [{ name: "Round 1", type: "Numeric" }],
        },
        {
          name: "Scoresheet 2",
          winCondition: "Lowest Score",
          rounds: [{ name: "Round 1", type: "Numeric" }],
        },
      ],
    );
    gameId = createdGame.id;

    // Navigate to edit page
    await page.goto(`/dashboard/games/${gameId}/edit`);

    await page.locator('button[name="removeScoresheet-Scoresheet 2"]').click();

    // Submit the main form
    await page.getByRole("button", { name: "Submit" }).click();

    // Verify change persisted
    await page.waitForURL(/\/dashboard\/games/, { timeout: 5000 });
    await expect(page.getByText(/Game .* updated successfully!/i)).toBeVisible({
      timeout: 10000,
    });

    // Verify scoresheet was deleted
    await page.goto(`/dashboard/games/${gameId}/edit`);

    // Check that Scoresheet 2 is no longer visible
    await expect(page.getByText("Scoresheet 2")).not.toBeVisible();
    // But Scoresheet 1 should still be there
    await expect(page.getByText("Scoresheet 1")).toBeVisible();
  });
});
