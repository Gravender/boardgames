import { expect, test } from "@playwright/test";

import { deleteMatchTestData, deleteTestPlayers } from "./helpers";
import { setupAndOpenScoresheetMatch } from "./scoresheet-form-helpers";

const PREFIX = "_p2_finish_";
const PLAYER_PREFIX = "_P2FinishPlayer";

test.describe("Match Scoresheet Dialogs - Manual Winner and Tie Breaker", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX);
  });

  test.afterAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX);
  });

  test("manual winner dialog supports clear/select-all then finish", async ({
    page,
    browserName,
  }) => {
    const created = await setupAndOpenScoresheetMatch(page, {
      browserName,
      browserGameName: browserName + PREFIX + "manual",
      matchName: `${browserName}_P2 Manual`,
      playerPrefix: browserName + PLAYER_PREFIX,
      playerCount: 2,
      scoresheetConfigs: [
        {
          name: "Manual Sheet",
          winCondition: "Manual",
          roundsScore: "None",
        },
      ],
    });

    await page.getByRole("button", { name: "Finish", exact: true }).click();
    const winnerDialog = page.getByLabel("Select Winners");
    await expect(winnerDialog).toBeVisible();

    const winnerNames = (
      await winnerDialog.locator("span.text-lg.font-semibold").allTextContents()
    )
      .map((name) => name.trim())
      .filter(Boolean);
    expect(winnerNames.length).toBeGreaterThanOrEqual(2);
    await winnerDialog.getByText(winnerNames[0]!, { exact: true }).click();
    await winnerDialog.getByText(winnerNames[1]!, { exact: true }).click();
    await page.getByRole("button", { name: "Ok" }).click();

    await expect(page).toHaveURL(
      new RegExp(
        `/dashboard/games/${created.gameId}/${created.match.id}/summary`,
      ),
      { timeout: 20000 },
    );
  });

  test("tie breaker dialog updates placement before finishing", async ({
    page,
    browserName,
  }) => {
    const playerOne = `${browserName}${PLAYER_PREFIX} 1`;

    const created = await setupAndOpenScoresheetMatch(page, {
      browserName,
      browserGameName: browserName + PREFIX + "tie",
      matchName: `${browserName}_P2 Tie Break`,
      playerPrefix: browserName + PLAYER_PREFIX,
      playerCount: 2,
      scoresheetConfigs: [
        {
          name: "Tie Sheet",
          winCondition: "Highest Score",
          roundsScore: "Aggregate",
          rounds: [{ name: "Round 1", type: "Numeric" }],
        },
      ],
    });

    const table = page.locator('[data-slot="table"]').first();
    const scoreInputs = table.locator(
      'input[type="text"][inputmode="numeric"]',
    );
    await scoreInputs.nth(0).fill("10");
    await scoreInputs.nth(1).fill("10");

    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: "Finish", exact: true }).click();

    const tieDialog = page.getByLabel("Tie Breaker");
    await expect(tieDialog).toBeVisible();

    const playerPlacementButton = tieDialog
      .locator("button")
      .filter({ hasText: playerOne })
      .first();
    await playerPlacementButton.scrollIntoViewIfNeeded();
    await playerPlacementButton.click();

    const placementInput = page.locator('input[inputmode="numeric"]').last();
    await expect(placementInput).toBeVisible({ timeout: 5000 });
    await placementInput.fill("2");

    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(
        `/dashboard/games/${created.gameId}/${created.match.id}/summary`,
      ),
      { timeout: 20000 },
    );
  });
});
