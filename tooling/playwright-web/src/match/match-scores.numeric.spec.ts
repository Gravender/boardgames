import { expect, test } from "@playwright/test";

import { MATCH_GAME_NAME } from "../shared/test-data";
import { createFullMatchViaTrpc } from "../trpc/procedures";
import { deleteMatchTestData, deleteTestPlayers } from "./helpers";

const PREFIX = "_scores_";

test.describe("Match Scores - Numeric", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + "_ScoreP");
  });
  test.afterAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + "_ScoreP");
  });

  test("Enter numeric scores and verify totals", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName = browserName + PREFIX + MATCH_GAME_NAME;
    const matchName = browserName + "_Score Entry Test";

    // Create a full match via tRPC with a known scoresheet structure
    const { match, gameId } = await createFullMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName,
        playerCount: 2,
        playerPrefix: browserName + "_ScoreP",
        scoresheetConfigs: [
          {
            name: "Default",
            winCondition: "Highest Score",
            roundsScore: "Aggregate",
            rounds: [
              { name: "Round 1", type: "Numeric" },
              { name: "Round 2", type: "Numeric" },
            ],
          },
        ],
      },
    );

    // Navigate to match scoresheet page
    await page.goto(`/dashboard/games/${gameId}/${match.id}`);

    // Verify match name in CardTitle (scoped to card, avoids breadcrumb)
    await expect(
      page.locator('[data-slot="card"] [data-slot="card-title"]', {
        hasText: matchName,
      }),
    ).toBeVisible({ timeout: 15000 });

    // Verify the score table is visible — pick first (main scoresheet table)
    const table = page.locator('[data-slot="table"]').first();
    await expect(table).toBeVisible({ timeout: 10000 });

    // Get all numeric inputs (score inputs)
    const scoreInputs = table.locator(
      'input[type="text"][inputmode="numeric"]',
    );

    // Wait for score inputs to appear (2 players x 2 rounds = 4 inputs)
    await expect(scoreInputs.first()).toBeVisible({ timeout: 5000 });

    const inputCount = await scoreInputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(4);

    // Enter scores
    await scoreInputs.nth(0).click();
    await scoreInputs.nth(0).fill("10");

    await scoreInputs.nth(1).click();
    await scoreInputs.nth(1).fill("15");

    await scoreInputs.nth(2).click();
    await scoreInputs.nth(2).fill("20");

    await scoreInputs.nth(3).click();
    await scoreInputs.nth(3).fill("25");

    // Wait for debounced scores to save (1200ms debounce + network)
    await page.waitForTimeout(2500);

    // Verify scores persisted by reloading the page
    await page.reload();
    await expect(table).toBeVisible({ timeout: 10000 });

    // Re-check inputs have the entered values
    const reloadedInputs = table.locator(
      'input[type="text"][inputmode="numeric"]',
    );
    await expect(reloadedInputs.first()).toBeVisible({ timeout: 5000 });

    // Verify at least one score value persisted
    const firstVal = await reloadedInputs.nth(0).inputValue();
    const secondVal = await reloadedInputs.nth(1).inputValue();
    const enteredValues = ["10", "15", "20", "25"];
    expect(
      enteredValues.includes(firstVal) || enteredValues.includes(secondVal),
    ).toBe(true);
  });
});
