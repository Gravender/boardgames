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
  const commentCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText("Comment:") })
    .first();
  const commentTrigger = commentCard.getByRole("button").first();
  await commentTrigger.click();
  await expect(
    page.getByRole("heading", { name: "Match Comment" }),
  ).toBeVisible();
  await page.getByRole("textbox").fill(text);
  await page.getByRole("button", { name: "Ok" }).click();
  await page.reload();
  await commentTrigger.click();
  await expect(page.getByRole("textbox")).toHaveValue(text, { timeout: 7000 });
  await page.getByRole("button", { name: "Cancel" }).click();
}

async function editPlayerDetails(
  page: Page,
  browserName: string,
  details: string,
) {
  const detailsOptionalRow = page
    .locator("tr")
    .filter({ hasText: "Details(optional)" });
  await detailsOptionalRow.locator("button").first().click();
  await expect(
    page.getByRole("heading", { name: `${browserName}${PLAYER_PREFIX} 1` }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Details" }).fill(details);
  await page.getByRole("button", { name: "Ok" }).click();
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

    const detailsRow = page.locator("tr").filter({ hasText: "Details" });
    await detailsRow.locator("button").first().click();
    await expect(
      page.getByRole("heading", { name: "Team: Blue Team" }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "Details" }).fill(teamDetailText);
    await page.getByRole("button", { name: "Ok" }).click();
    await expect(detailsRow.getByText(teamDetailText)).toBeVisible({
      timeout: 7000,
    });
  });
});
