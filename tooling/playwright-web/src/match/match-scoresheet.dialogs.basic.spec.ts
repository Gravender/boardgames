import { expect, test } from "@playwright/test";

import { deleteMatchTestData, deleteTestPlayers } from "./helpers";
import {
  openAddRoundDialog,
  setupAndOpenScoresheetMatch,
} from "./scoresheet-form-helpers";

const PREFIX = "_p2_dialogs_";
const PLAYER_PREFIX = "_P2DialogPlayer";

test.describe("Match Scoresheet Dialogs - Basic", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX);
  });

  test.afterAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX);
  });

  test("updates comment, player detail, and adds checkbox round", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const matchName = `${browserName}_P2 Dialog Basic`;
    const commentText = `${browserName} comment regression text`;
    const playerDetailText = `${browserName} player detail regression text`;
    const newRoundName = `${browserName} Checkbox Round`;

    await setupAndOpenScoresheetMatch(page, {
      browserName,
      browserGameName: browserName + PREFIX + "basic",
      matchName,
      playerPrefix: browserName + PLAYER_PREFIX,
      playerCount: 2,
    });

    const commentCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText("Comment:") })
      .first();
    const commentTrigger = commentCard.getByRole("button").first();
    await commentTrigger.click();
    await expect(
      page.getByRole("heading", { name: "Match Comment" }),
    ).toBeVisible();
    await page.getByRole("textbox").fill(commentText);
    await page.getByRole("button", { name: "Ok" }).click();
    await page.reload();
    await commentTrigger.click();
    await expect(page.getByRole("textbox")).toHaveValue(commentText, {
      timeout: 7000,
    });
    await page.getByRole("button", { name: "Cancel" }).click();

    const detailsOptionalRow = page
      .locator("tr")
      .filter({ hasText: "Details(optional)" });
    await detailsOptionalRow.locator("button").first().click();
    await expect(
      page.getByRole("heading", {
        name: `${browserName}${PLAYER_PREFIX} 1`,
      }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "Details:" }).fill(playerDetailText);
    await page.getByRole("button", { name: "Ok" }).click();
    await expect(detailsOptionalRow.getByText(playerDetailText)).toBeVisible({
      timeout: 7000,
    });

    await openAddRoundDialog(page);
    await page.getByRole("textbox", { name: "Round Name" }).fill(newRoundName);

    await page.getByRole("combobox", { name: "Scoring Type" }).click();
    await page.getByRole("option", { name: "Checkbox" }).click();

    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText(newRoundName)).toBeVisible({ timeout: 7000 });
  });

  test("updates team detail via team branch", async ({ page, browserName }) => {
    test.slow();
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
    await page.getByRole("textbox", { name: "Details:" }).fill(teamDetailText);
    await page.getByRole("button", { name: "Ok" }).click();

    await expect(detailsRow.getByText(teamDetailText)).toBeVisible({
      timeout: 7000,
    });
  });
});
