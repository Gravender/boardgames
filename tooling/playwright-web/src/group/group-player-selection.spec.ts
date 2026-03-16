import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { deleteTestPlayers } from "../match/helpers";
import { createPlayersViaTrpc } from "../trpc/procedures";
import { deleteGroupsByPrefix } from "./helpers";

const PREFIX = "_p2_group_";
const PLAYER_PREFIX = "_P2GroupPlayer";

test.describe("Group Forms - Player Selection", () => {
  const setPlayerSelected = async (
    page: Page,
    playerName: string,
    shouldBeSelected: boolean,
  ) => {
    const selectedPill = page.locator("div.bg-violet-400", {
      hasText: playerName,
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      const currentCount = await selectedPill.count();
      const isSelected = currentCount > 0;
      if (isSelected === shouldBeSelected) break;

      await page.getByText(playerName, { exact: true }).first().click();
    }

    await expect(selectedPill).toHaveCount(shouldBeSelected ? 1 : 0, {
      timeout: 7000,
    });
  };

  const submitPlayerSelection = async (
    page: Page,
    expectedSelectedPlayers: string[] = [],
  ) => {
    const submitButton = page.getByRole("main").getByRole("button", {
      name: "Submit",
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!/\/dashboard\/groups\/.+\/players$/.test(page.url())) {
        return;
      }

      for (const playerName of expectedSelectedPlayers) {
        await setPlayerSelected(page, playerName, true);
      }

      await expect(submitButton).toBeVisible({ timeout: 10000 });
      await submitButton.click();
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1000);
    if (/\/dashboard\/groups\/.+\/players$/.test(page.url())) {
      throw new Error(`Player selection submit did not navigate: ${page.url()}`);
    }
  };

  test.beforeAll(async ({ browserName }) => {
    await deleteGroupsByPrefix(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX);
  });

  test.afterAll(async ({ browserName }) => {
    await deleteGroupsByPrefix(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX);
  });

  test("adds a group then edits group players with add/remove diff", async ({
    page,
    browserName,
  }) => {
    test.slow();

    const groupName = `${browserName}${PREFIX}Regression Group`;
    const playerOne = `${browserName}${PLAYER_PREFIX} 1`;
    const playerTwo = `${browserName}${PLAYER_PREFIX} 2`;
    const playerThree = `${browserName}${PLAYER_PREFIX} 3`;

    await createPlayersViaTrpc(browserName, 3, browserName + PLAYER_PREFIX);

    await page.goto("/dashboard/groups");
    await expect(page.getByRole("textbox", { name: "Search groups..." })).toBeVisible(
      {
        timeout: 10000,
      },
    );
    await expect(page.locator("main button:has(svg.lucide-plus)").first()).toBeVisible(
      {
        timeout: 10000,
      },
    );

    await page.locator("main button:has(svg.lucide-plus)").first().click();
    await expect(page.getByRole("textbox", { name: "Group Name" })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("textbox", { name: "Group Name" }).fill(groupName);
    await page.getByRole("button", { name: "0 Players" }).click();

    await expect(
      page.getByRole("textbox", { name: "Search Players..." }),
    ).toBeVisible({ timeout: 10000 });

    await setPlayerSelected(page, playerOne, true);
    await setPlayerSelected(page, playerTwo, true);
    await submitPlayerSelection(page, [playerOne, playerTwo]);

    await expect(page).toHaveURL(/\/dashboard\/groups$/, {
      timeout: 10000,
    });
    await expect(page.getByRole("heading", { name: "Add Group" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("button", { name: "2 Players" })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Group created successfully!")).toBeVisible({
      timeout: 10000,
    });

    const groupCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: groupName })
      .first();
    await expect(groupCard).toBeVisible({ timeout: 10000 });

    await groupCard.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(
      page.getByRole("heading", { name: `Edit ${groupName}` }),
    ).toBeVisible();
    await page.getByRole("button", { name: "2 Players" }).click();

    await expect(
      page.getByRole("textbox", { name: "Search Players..." }),
    ).toBeVisible({ timeout: 10000 });

    await setPlayerSelected(page, playerOne, false);
    await setPlayerSelected(page, playerThree, true);
    await submitPlayerSelection(page, [playerTwo, playerThree]);

    await expect(page.getByText("Group players updated successfully!")).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/\/dashboard\/groups$/);

    await groupCard.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await page.getByRole("button", { name: "2 Players" }).click();
    await expect(
      page.getByRole("textbox", { name: "Search Players..." }),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator("div.bg-violet-400", { hasText: playerOne }),
    ).toHaveCount(0);
    await expect(
      page.locator("div.bg-violet-400", { hasText: playerTwo }),
    ).toHaveCount(1);
    await expect(
      page.locator("div.bg-violet-400", { hasText: playerThree }),
    ).toHaveCount(1);
  });
});
