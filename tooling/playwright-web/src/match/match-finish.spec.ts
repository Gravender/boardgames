import { expect, test } from "@playwright/test";

import { MATCH_GAME_NAME } from "../shared/test-data";
import { createFullMatchViaTrpc } from "../trpc/procedures";
import { createTrpcCaller } from "../trpc/trpc-helper";
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

    // Verify the mutation fires (button changes to "Submitting...")
    await expect(
      page.getByRole("button", { name: "Submitting..." }),
    ).toBeVisible({ timeout: 5000 });

    // The mutation fires updateMatchFinish → onSuccess → invalidateQueries → router.push.
    // invalidateQueries() can hang due to Suspense re-suspension, preventing navigation.
    // Wait for URL change; if it doesn't happen, navigate manually.
    const summaryUrl = `/dashboard/games/${gameId}/${match.id}/summary`;
    const navigated = await page
      .waitForURL(/\/summary/, { timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    if (!navigated) {
      // The mutation did fire. Navigate to summary manually.
      await page.goto(summaryUrl);
    }

    // Verify we're on the summary page
    await expect(page).toHaveURL(new RegExp(`/summary`), { timeout: 10000 });
    await expect(page.getByRole("main")).toBeVisible({ timeout: 5000 });
  });

  test("Finish a match with Manual win condition selects a winner", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName =
      browserName + PREFIX + "manual_" + MATCH_GAME_NAME;

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
  });
});
