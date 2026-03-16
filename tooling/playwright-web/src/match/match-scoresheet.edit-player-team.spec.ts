import { expect, test } from "@playwright/test";

import { deleteMatchTestData, deleteTestPlayers } from "./helpers";
import { setupAndOpenScoresheetMatch } from "./scoresheet-form-helpers";

const PREFIX = "_p2_editors_";
const PLAYER_PREFIX = "_P2EditorPlayer";

test.describe("Match Scoresheet Dialogs - Edit Player and Team", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX);
  });

  test.afterAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + PLAYER_PREFIX);
  });

  test("edits player team assignment and team player list", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const playerOne = `${browserName}${PLAYER_PREFIX} 1`;
    const playerTwo = `${browserName}${PLAYER_PREFIX} 2`;
    const playerThree = `${browserName}${PLAYER_PREFIX} 3`;
    const updatedTeamName = `${browserName} Team Updated`;

    await setupAndOpenScoresheetMatch(page, {
      browserName,
      browserGameName: browserName + PREFIX + "team-mode",
      matchName: `${browserName}_P2 Editors`,
      playerPrefix: browserName + PLAYER_PREFIX,
      playerCount: 3,
      teams: [{ name: "Red Team", playerIndices: [0, 1] }],
    });

    await page.getByRole("button", { name: playerOne }).first().click();
    await expect(
      page.getByRole("heading", { name: `Edit ${playerOne}` }),
    ).toBeVisible();
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "No team" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    await page.getByRole("button", { name: playerOne }).first().click();
    await expect(page.getByRole("combobox").first()).toHaveText(/No team/);
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: "Team: Red Team" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit Red Team" }),
    ).toBeVisible();
    const editTeamDialog = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("heading", { name: "Edit Red Team" }) })
      .first();

    await editTeamDialog
      .getByRole("textbox", { name: "Team Name" })
      .fill(updatedTeamName);

    const teamPlayerRemoveButton = editTeamDialog
      .getByRole("button", { name: playerTwo })
      .first();
    await expect(teamPlayerRemoveButton).toBeVisible({ timeout: 10000 });
    await teamPlayerRemoveButton.click();

    const availablePlayersSection = editTeamDialog
      .locator("div")
      .filter({ hasText: "Available Players" })
      .first();
    const playerThreeAddButton = availablePlayersSection.locator(
      `xpath=.//*[normalize-space(text())="${playerThree}"]/ancestor::div[1]/following-sibling::button[normalize-space()="Add"][1]`,
    );
    await expect(playerThreeAddButton).toBeVisible({ timeout: 10000 });
    await playerThreeAddButton.click();
    await expect(
      editTeamDialog.getByRole("button", { name: playerThree }).first(),
    ).toBeVisible();

    await editTeamDialog.getByRole("button", { name: "Save" }).click();
    await expect(
      page.getByRole("button", { name: `Team: ${updatedTeamName}` }),
    ).toBeVisible({ timeout: 7000 });

    await page.getByRole("button", { name: `Team: ${updatedTeamName}` }).click();
    const reopenedDialog = page
      .getByRole("dialog")
      .filter({
        has: page.getByRole("heading", { name: `Edit ${updatedTeamName}` }),
      })
      .first();
    await expect(reopenedDialog).toBeVisible();
    await expect(
      reopenedDialog.getByRole("button", { name: playerThree }).first(),
    ).toBeVisible();
    await expect(
      reopenedDialog.getByRole("button", { name: playerTwo }),
    ).toHaveCount(0);
    await reopenedDialog.getByRole("button", { name: "Cancel" }).click();
  });
});
