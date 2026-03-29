import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import {
  createFullMatchViaTrpc,
  createGameWithScoresheetViaTrpc,
} from "../trpc/procedures";

type SetupScoresheetMatchOptions = {
  browserName: string;
  browserGameName: string;
  matchName: string;
  playerPrefix: string;
  playerCount?: number;
  teams?: { name: string; playerIndices: number[] }[];
  scoresheetConfigs?: Parameters<typeof createGameWithScoresheetViaTrpc>[2];
};

export async function setupAndOpenScoresheetMatch(
  page: Page,
  options: SetupScoresheetMatchOptions,
) {
  const { browserName, browserGameName, matchName, playerPrefix } = options;
  const created = await createFullMatchViaTrpc(browserName, browserGameName, {
    matchName,
    playerPrefix,
    playerCount: options.playerCount ?? 2,
    teams: options.teams,
    scoresheetConfigs: options.scoresheetConfigs ?? [
      {
        name: "Default",
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        rounds: [{ name: "Round 1", type: "Numeric" }],
      },
    ],
  });

  await page.goto(`/dashboard/games/${created.gameId}/${created.match.id}`);
  await expect(
    page.locator('[data-slot="card"] [data-slot="card-title"]', {
      hasText: matchName,
    }),
  ).toBeVisible({ timeout: 15000 });

  return created;
}

export async function openAddRoundDialog(page: Page) {
  // This intentionally targets the header action button in the table's thead/th.
  // We use `.first()` because the current scoresheet renders a single add-round
  // button in that header region.
  const addRoundButton = page
    .locator('[data-slot="table"] thead th button[type="button"]')
    .first();
  await expect(addRoundButton).toBeVisible({ timeout: 5000 });
  await addRoundButton.click();
  await expect(page.getByRole("heading", { name: "Add Round" })).toBeVisible({
    timeout: 5000,
  });
}
