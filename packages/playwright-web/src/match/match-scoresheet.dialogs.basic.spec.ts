import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { deleteMatchTestData, deleteTestPlayers } from "./helpers";
import {
  openAddRoundDialog,
  setupAndOpenScoresheetMatch,
} from "./scoresheet-form-helpers";

const PREFIX = "_p2_dialogs_";
const PLAYER_PREFIX = "_P2DialogPlayer";

async function cleanupTestData(browserName: string) {
  await deleteMatchTestData(browserName, browserName + PREFIX);
  await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX);
}

async function fillAndSaveComment(page: Page, text: string) {
  const commentBox = page.getByRole("textbox", { name: "Comment" });
  await commentBox.fill(text);
  await expect(page.getByText("Saved")).toBeVisible({ timeout: 8000 });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Comment" })).toHaveValue(
    text,
    { timeout: 15000 },
  );
}

async function editPlayerDetails(
  page: Page,
  browserName: string,
  details: string,
) {
  const detailsOptionalRow = page
    .locator("tr")
    .filter({ hasText: "Details(optional)" });
  const playerName = `${browserName}${PLAYER_PREFIX} 1`;
  const detailsTrigger = detailsOptionalRow.getByRole("button", {
    name: `Edit Player ${playerName} Details`,
  });
  await expect(detailsTrigger).toBeVisible();
  await detailsTrigger.scrollIntoViewIfNeeded();
  await detailsTrigger.click();
  const detailDialog = page.getByRole("dialog");
  await expect(
    detailDialog.getByRole("heading", { name: `Player ${playerName} Details` }),
  ).toBeVisible();
  await detailDialog.getByRole("textbox", { name: "Details" }).fill(details);
  await detailDialog.getByRole("button", { name: "Done" }).click();
  await expect(detailsOptionalRow.getByText(details)).toBeVisible({
    timeout: 7000,
  });
}

async function addCheckboxRound(page: Page, roundName: string) {
  await openAddRoundDialog(page);
  await page.getByRole("textbox", { name: "Round Name" }).fill(roundName);
  await page.getByRole("combobox", { name: "Scoring Type" }).click();
  await page.getByRole("option", { name: "Checkbox" }).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText(roundName)).toBeVisible({ timeout: 7000 });
}

test.describe("Match Scoresheet Dialogs - Basic", () => {
  test.beforeAll(async ({ browserName }) => {
    await cleanupTestData(browserName);
  });

  test.afterAll(async ({ browserName }) => {
    await cleanupTestData(browserName);
  });

  test("updates comment", async ({ page, browserName }) => {
    const commentText = `${browserName} comment regression text`;
    await setupAndOpenScoresheetMatch(page, {
      browserName,
      browserGameName: browserName + PREFIX + "comment",
      matchName: `${browserName}_P2 Dialog Comment`,
      playerPrefix: browserName + PLAYER_PREFIX,
      playerCount: 2,
    });
    await fillAndSaveComment(page, commentText);
  });

  test("updates player detail", async ({ page, browserName }) => {
    const playerDetailText = `${browserName} player detail regression text`;
    await setupAndOpenScoresheetMatch(page, {
      browserName,
      browserGameName: browserName + PREFIX + "player-detail",
      matchName: `${browserName}_P2 Dialog Player Detail`,
      playerPrefix: browserName + PLAYER_PREFIX,
      playerCount: 2,
    });
    await editPlayerDetails(page, browserName, playerDetailText);
  });

  test("adds checkbox round", async ({ page, browserName }) => {
    const newRoundName = `${browserName} Checkbox Round`;
    await setupAndOpenScoresheetMatch(page, {
      browserName,
      browserGameName: browserName + PREFIX + "round",
      matchName: `${browserName}_P2 Dialog Round`,
      playerPrefix: browserName + PLAYER_PREFIX,
      playerCount: 2,
    });
    await addCheckboxRound(page, newRoundName);
  });

  test("updates team detail via team branch", async ({ page, browserName }) => {
    const teamDetailText = `${browserName} team detail regression text`;
    await setupAndOpenScoresheetMatch(page, {
      browserName,
      browserGameName: browserName + PREFIX + "team-detail",
      matchName: `${browserName}_P2 Team Detail`,
      playerPrefix: browserName + PLAYER_PREFIX,
      playerCount: 2,
      teams: [{ name: "Blue Team", playerIndices: [0, 1] }],
    });

    const detailsRow = page.locator("tr").filter({
      has: page.locator("th").filter({ hasText: /^Details$/ }),
    });
    const teamDetailsTrigger = detailsRow.getByRole("button", {
      name: "Edit Team Blue Team Details",
    });
    await expect(teamDetailsTrigger).toBeVisible();
    await teamDetailsTrigger.scrollIntoViewIfNeeded();
    await teamDetailsTrigger.click();
    const teamDetailDialog = page.getByRole("dialog");
    await expect(
      teamDetailDialog.getByRole("heading", { name: "Team Blue Team Details" }),
    ).toBeVisible();
    await teamDetailDialog
      .getByRole("textbox", { name: "Details" })
      .fill(teamDetailText);
    await teamDetailDialog.getByRole("button", { name: "Done" }).click();
    await expect(detailsRow.getByText(teamDetailText)).toBeVisible({
      timeout: 7000,
    });
  });
});
