import { expect, test } from "@playwright/test";

import { MATCH_GAME_NAME } from "../shared/test-data";
import {
  createGameWithScoresheetViaTrpc,
  createPlayersViaTrpc,
} from "../trpc/procedures";
import { deleteMatchTestData, deleteTestPlayers } from "./helpers";

const PREFIX = "_create_";
const PLAYER_PREFIX_SUFFIX = "_MCPlayer";

test.describe("Match Create - Basic", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX_SUFFIX);
  });
  test.afterAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX_SUFFIX);
  });

  test("Create a match via UI from game detail page", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName = browserName + PREFIX + MATCH_GAME_NAME;
    const matchName = browserName + "_Test Match Create";

    // 1. Create a game with a scoresheet that has rounds (via tRPC)
    const createdGame = await createGameWithScoresheetViaTrpc(
      browserName,
      browserGameName,
      [
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
    );

    // 2. Create players via tRPC so they are available in player selection
    const player1Name = browserName + "_MCPlayer 1";
    const player2Name = browserName + "_MCPlayer 2";
    await createPlayersViaTrpc(browserName, 2, browserName + "_MCPlayer");

    // 3. Navigate to game detail page
    await page.goto(`/dashboard/games/${createdGame.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      browserGameName,
      { timeout: 15000 },
    );

    // 4. Open the Add Match dialog
    const addMatchButton = page.getByRole("button", { name: "add match" });
    await expect(addMatchButton).toBeVisible({ timeout: 5000 });
    await addMatchButton.click();

    // 5. Verify the match form is visible
    await expect(page.getByLabel("Match Name")).toBeVisible({ timeout: 5000 });

    // 6. Fill in the match name
    const matchNameInput = page.getByLabel("Match Name");
    await matchNameInput.clear();
    await matchNameInput.fill(matchName);

    // 7. Open player selection
    const playersButton = page.getByRole("button", { name: /\d+ Player/ });
    await expect(playersButton).toBeVisible();
    await playersButton.click();

    // Wait for the player selection view to load
    const searchInput = page.getByPlaceholder("Search players...");
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // 8. Search for test players
    await searchInput.fill(browserName + "_MCPlayer");
    await page.waitForTimeout(500);

    // Select players — use exact text match to avoid substring collisions
    const playerItem1 = page
      .locator('[data-slot="item"]')
      .filter({ has: page.getByText(player1Name, { exact: true }) });
    await expect(playerItem1).toBeVisible({ timeout: 5000 });
    await playerItem1.click();

    const playerItem2 = page
      .locator('[data-slot="item"]')
      .filter({ has: page.getByText(player2Name, { exact: true }) });
    await expect(playerItem2).toBeVisible({ timeout: 3000 });
    await playerItem2.click();

    // Verify badge shows "2 selected"
    await expect(page.getByText("2 selected")).toBeVisible({ timeout: 3000 });

    // 9. Save player selection (go back to match form)
    await page.getByRole("button", { name: "Save" }).click();

    // 10. Verify we're back on the match form
    await expect(page.getByLabel("Match Name")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /2 Player/ })).toBeVisible({
      timeout: 3000,
    });

    // 11. Submit the match form
    const startMatchButton = page.getByRole("button", {
      name: "Start Match",
    });
    await expect(startMatchButton).toBeVisible();
    await startMatchButton.click();

    // 12. Wait for navigation to the match scoresheet page
    await expect(page).toHaveURL(
      new RegExp(`\\/dashboard\\/games\\/${createdGame.id}\\/\\d+$`),
      { timeout: 20000 },
    );

    // 13. Verify match name in CardTitle (scope to card to avoid breadcrumb)
    await expect(
      page.locator('[data-slot="card"] [data-slot="card-title"]', {
        hasText: matchName,
      }),
    ).toBeVisible({ timeout: 10000 });
  });
});
