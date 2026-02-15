import { expect, test } from "@playwright/test";

import { MATCH_GAME_NAME } from "../shared/test-data";
import { createFullMatchViaTrpc } from "../trpc/procedures";
import { createTrpcCaller } from "../trpc/trpc-helper";
import { deleteMatchTestData } from "./helpers";

const PREFIX = "_delete_";

test.describe("Match Delete", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
  });
  test.afterAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
  });

  test("Delete a match from the game detail page", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName = browserName + PREFIX + MATCH_GAME_NAME;
    const matchName = browserName + "_Delete Me";

    // Create a finished match so it appears in match history
    const { match, gameId } = await createFullMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName,
        playerCount: 2,
        playerPrefix: browserName + "_DelP",
      },
    );

    // Finish the match via tRPC so it shows in match history list
    const caller = createTrpcCaller(browserName);
    await caller.match.update.updateMatchFinish({
      type: "original",
      id: match.id,
    });

    // Navigate to game detail page
    await page.goto(`/dashboard/games/${gameId}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      browserGameName,
      { timeout: 15000 },
    );

    // Scope to the match list to avoid collisions with dialog titles
    const matchList = page.getByLabel("Game Matches");

    // Find the match in the match history section
    await expect(matchList.getByText(matchName)).toBeVisible({
      timeout: 5000,
    });

    // Open the match dropdown menu (MoreVertical icon button)
    const matchItem = matchList
      .locator("li, [role='listitem'], article, div")
      .filter({ hasText: matchName })
      .first();

    const menuButton = matchItem.getByRole("button", {
      name: /open menu/i,
    });
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();

    // Click Delete from the dropdown
    const deleteMenuItem = page.getByRole("menuitem", { name: "Delete" });
    await expect(deleteMenuItem).toBeVisible({ timeout: 3000 });
    await deleteMenuItem.click();

    // Confirm delete in the AlertDialog
    const confirmDeleteButton = page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" });
    await expect(confirmDeleteButton).toBeVisible({ timeout: 3000 });
    await confirmDeleteButton.click();

    // Verify the match is no longer in the list (scoped to match list)
    await expect(matchList.getByText(matchName)).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("Cancel delete keeps the match", async ({ page, browserName }) => {
    test.slow();
    const browserGameName =
      browserName + PREFIX + "cancel_" + MATCH_GAME_NAME;
    const matchName = browserName + "_Keep Me";

    // Create and finish a match
    const { match, gameId } = await createFullMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName,
        playerCount: 2,
        playerPrefix: browserName + "_KeepP",
      },
    );

    const caller = createTrpcCaller(browserName);
    await caller.match.update.updateMatchFinish({
      type: "original",
      id: match.id,
    });

    // Navigate to game detail page
    await page.goto(`/dashboard/games/${gameId}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      browserGameName,
      { timeout: 15000 },
    );

    // Scope to the match list
    const matchList = page.getByLabel("Game Matches");

    await expect(matchList.getByText(matchName)).toBeVisible({
      timeout: 5000,
    });

    // Open menu and click Delete
    const matchItem = matchList
      .locator("li, [role='listitem'], article, div")
      .filter({ hasText: matchName })
      .first();

    const menuButton = matchItem.getByRole("button", {
      name: /open menu/i,
    });
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();

    const deleteMenuItem = page.getByRole("menuitem", { name: "Delete" });
    await expect(deleteMenuItem).toBeVisible({ timeout: 3000 });
    await deleteMenuItem.click();

    // Cancel the delete
    const cancelButton = page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Cancel" });
    await expect(cancelButton).toBeVisible({ timeout: 3000 });
    await cancelButton.click();

    // Match should still be visible in the list
    await expect(matchList.getByText(matchName)).toBeVisible({
      timeout: 5000,
    });
  });
});
