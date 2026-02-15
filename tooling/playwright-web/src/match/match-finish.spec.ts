import { expect, test } from "@playwright/test";

import { MATCH_GAME_NAME } from "../shared/test-data";
import { createFullMatchViaTrpc } from "../trpc/procedures";
import { deleteMatchTestData } from "./helpers";

const PREFIX = "_finish_";

test.describe("Match Finish", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
  });
  test.afterAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
  });

  test("Finish a match and navigate to summary", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName = browserName + PREFIX + MATCH_GAME_NAME;

    // Create a match via tRPC with Highest Score win condition
    const { match, gameId } = await createFullMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName: browserName + "_Finish Test",
        playerCount: 2,
        playerPrefix: browserName + "_FinishP",
        scoresheetConfigs: [
          {
            name: "Default",
            winCondition: "Highest Score",
            roundsScore: "Aggregate",
            rounds: [{ name: "Round 1", type: "Numeric" }],
          },
        ],
      },
    );

    // Navigate to the match scoresheet
    await page.goto(`/dashboard/games/${gameId}/${match.id}`);
    // Scope to card to avoid breadcrumb duplicate
    await expect(
      page.locator('[data-slot="card"] [data-slot="card-title"]', {
        hasText: browserName + "_Finish Test",
      }),
    ).toBeVisible({ timeout: 15000 });

    // Enter different scores — pick the table that contains score inputs
    const table = page.locator('[data-slot="table"]').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    const scoreInputs = table.locator(
      'input[type="text"][inputmode="numeric"]',
    );
    await expect(scoreInputs.first()).toBeVisible({ timeout: 5000 });

    // Player 1 = 50, Player 2 = 30
    await scoreInputs.nth(0).click();
    await scoreInputs.nth(0).fill("50");
    await scoreInputs.nth(1).click();
    await scoreInputs.nth(1).fill("30");

    // Wait for debounce to save scores to DB
    await page.waitForTimeout(3000);

    // Reload to ensure React state is fresh before clicking Finish.
    // calculatePlacement reads from React state; stale state causes
    // a false tie-breaker dialog.
    await page.reload();
    const reloadedTable = page.locator('[data-slot="table"]').first();
    await expect(reloadedTable).toBeVisible({ timeout: 10000 });

    // Click the Finish button — use exact to avoid matching player buttons
    const finishButton = page.getByRole("button", {
      name: "Finish",
      exact: true,
    });
    await expect(finishButton).toBeVisible({ timeout: 5000 });
    await finishButton.click();

    // With distinct scores (50 vs 30), placements are unique → auto-navigate
    await expect(page).toHaveURL(/\/dashboard\/games\/\d+\/\d+\/summary/, {
      timeout: 20000,
    });

    // Verify summary page loaded with semantic selectors
    const resultsCard = page.locator('[data-testid="match-results"]');
    await expect(resultsCard).toBeVisible({ timeout: 10000 });

    // Verify result rows rendered (2 players)
    const resultRows = page.locator('[data-testid="result-row"]');
    await expect(resultRows).toHaveCount(2);

    // Winner (Player 1, 50 pts) — 1st place
    const winnerRow = resultRows.nth(0);
    await expect(winnerRow).toHaveAttribute(
      "aria-label",
      /Winner.*1st place.*50 points/,
    );
    await expect(winnerRow.locator('[data-testid="result-score"]')).toHaveText(
      "50 pts",
    );
    await expect(winnerRow.locator('[aria-label="1st place"]')).toBeVisible();

    // Loser (Player 2, 30 pts) — 2nd place
    const loserRow = resultRows.nth(1);
    await expect(loserRow).toHaveAttribute(
      "aria-label",
      /Loser.*2nd place.*30 points/,
    );
    await expect(loserRow.locator('[data-testid="result-score"]')).toHaveText(
      "30 pts",
    );

    // Both players should have "First Game" badges
    const badges = resultsCard.locator('[data-testid="result-badge"]');
    await expect(badges).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(badges.nth(i)).toHaveText("First Game");
    }
  });

  test("Finish a match with Manual win condition selects a winner", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName = browserName + PREFIX + "manual_" + MATCH_GAME_NAME;

    // Create a match with Manual win condition
    const { match, gameId } = await createFullMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName: browserName + "_Manual Finish",
        playerCount: 2,
        playerPrefix: browserName + "_ManualP",
        scoresheetConfigs: [
          {
            name: "Manual Sheet",
            winCondition: "Manual",
            roundsScore: "None",
          },
        ],
      },
    );

    // Navigate to the match
    await page.goto(`/dashboard/games/${gameId}/${match.id}`);
    // Scope to card to avoid breadcrumb duplicate
    await expect(
      page.locator('[data-slot="card"] [data-slot="card-title"]', {
        hasText: browserName + "_Manual Finish",
      }),
    ).toBeVisible({ timeout: 15000 });

    // Click Finish — use exact to avoid matching other buttons
    const finishButton = page.getByRole("button", {
      name: "Finish",
      exact: true,
    });
    await expect(finishButton).toBeVisible({ timeout: 5000 });
    await finishButton.click();

    // The ManualWinnerDialog should appear with title "Select Winners"
    await expect(
      page.getByRole("heading", { name: "Select Winners" }),
    ).toBeVisible({ timeout: 5000 });

    // Checkboxes are hidden; clicking the player row (FormLabel) toggles them.
    // Use "Select All" to pick all players, which is simplest and reliable.
    const selectAllButton = page.getByRole("button", { name: "Select All" });
    await expect(selectAllButton).toBeVisible({ timeout: 3000 });
    await selectAllButton.click();

    // Confirm the selection by clicking "Ok"
    const okButton = page.getByRole("button", { name: "Ok" });
    await expect(okButton).toBeVisible({ timeout: 3000 });
    await okButton.click();

    // Should navigate to summary
    await expect(page).toHaveURL(/\/dashboard\/games\/\d+\/\d+\/summary/, {
      timeout: 20000,
    });

    // Verify manual winner results on summary page
    const resultsCard = page.locator('[data-testid="match-results"]');
    await expect(resultsCard).toBeVisible({ timeout: 10000 });

    const resultRows = page.locator('[data-testid="result-row"]');
    await expect(resultRows).toHaveCount(2);

    await page.reload();

    // Both players were selected as winners → both have ✔️
    for (let i = 0; i < 2; i++) {
      const row = resultRows.nth(i);
      await expect(row).toHaveAttribute("aria-label", /Winner/);
      await expect(row.locator('[aria-label="Winner"]')).toBeVisible();
    }
  });
});
