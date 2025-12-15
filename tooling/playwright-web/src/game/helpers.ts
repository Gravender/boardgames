import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { db } from "@board-games/db/client";
import {
  game,
  gameRole,
  match,
  matchPlayer,
  matchPlayerRole,
  round,
  roundPlayer,
  scoresheet,
  user,
} from "@board-games/db/schema";

import { getBetterAuthUserId } from "../getUserId";
import { EDITED_GAME_NAME, GAME_NAME } from "../shared/test-data";

export async function deleteGames(browserName: string) {
  const betterAuthUserId = getBetterAuthUserId(browserName);
  const [returnedUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, betterAuthUserId));
  if (returnedUser) {
    const returnedGames = await db.query.game.findMany({
      where: {
        createdBy: returnedUser.id,
      },
      with: {
        scoresheets: true,
        matches: {
          with: {
            matchPlayers: true,
            teams: true,
          },
        },
      },
    });
    const returnedScoresheets = await db.query.scoresheet.findMany({
      where: {
        gameId: {
          in: returnedGames.map((g) => g.id),
        },
      },
    });
    if (returnedGames.length > 0) {
      const matchPlayers = returnedGames.flatMap((g) =>
        g.matches.flatMap((m) => m.matchPlayers.map((mp) => mp.id)),
      );
      const matches = returnedGames.flatMap((g) => g.matches.map((m) => m.id));
      if (matchPlayers.length > 0) {
        await db
          .delete(matchPlayerRole)
          .where(inArray(matchPlayerRole.matchPlayerId, matchPlayers));
        await db
          .delete(roundPlayer)
          .where(inArray(roundPlayer.matchPlayerId, matchPlayers));
        await db
          .delete(matchPlayer)
          .where(inArray(matchPlayer.id, matchPlayers));
      }
      if (matches.length > 0) {
        await db.delete(match).where(inArray(match.id, matches));
      }
      if (returnedScoresheets.length > 0) {
        const mappedScoresheets = returnedScoresheets.map((s) => s.id);
        await db
          .delete(round)
          .where(inArray(round.scoresheetId, mappedScoresheets));
        await db
          .delete(scoresheet)
          .where(inArray(scoresheet.id, mappedScoresheets));
      }
      await db.delete(gameRole).where(
        inArray(
          gameRole.gameId,
          returnedGames.map((g) => g.id),
        ),
      );
      await db.delete(game).where(
        inArray(
          game.id,
          returnedGames.map((g) => g.id),
        ),
      );
    }
  }
}

export function gameAriaText(
  gameName: string,
  yearPublished: number,
  playersMin: number,
  playersMax: number,
  playtimeMin: number,
  playtimeMax: number,
) {
  const temp = `
        - listitem:
          - link:
            - /url: //dashboard/games/\\d+/
          - heading "${gameName}" [level=3]
          - text: (${yearPublished})
          - button "Open menu"
          - text: ${playersMin}-${playersMax} players ${playtimeMin}-${playtimeMax} min 0 plays
        `;
  return temp;
}

export async function navigateToGameEdit(page: Page, gameId: number) {
  await page.goto(`/dashboard/games/${gameId}/edit`);
}

export async function findGameLink(page: Page, gameName: string) {
  // Wait for games list to be visible
  const gamesList = page.getByLabel("Games", { exact: true });
  await expect(gamesList).toBeVisible({ timeout: 5000 });

  // Find the list item that matches the game properties
  const gameHeading = page.getByRole("heading", { name: gameName });
  await expect(gameHeading).toBeVisible({ timeout: 5000 });

  // Verify the game details match (using aria snapshot pattern from gameAriaText)
  const gameCard = gamesList.getByRole("listitem").filter({ has: gameHeading });
  await expect(gameCard).toBeVisible();

  // Return the link within the card
  return gameCard.getByRole("link").first();
}

export async function findGameCard(page: Page, gameName: string) {
  // Wait for games list to be visible
  const gamesList = page.getByLabel("Games", { exact: true });
  await expect(gamesList).toBeVisible({ timeout: 5000 });

  // Find the list item that contains the game name
  const gameHeading = page.getByRole("heading", { name: gameName });
  await expect(gameHeading).toBeVisible({ timeout: 5000 });

  // Return the card (listitem) that contains the heading
  return gamesList.getByRole("listitem").filter({ has: gameHeading });
}

export interface ScoresheetConfig {
  name: string;
  winCondition:
    | "Manual"
    | "Highest Score"
    | "Lowest Score"
    | "No Winner"
    | "Target Score";
  isCoop?: boolean;
  isDefault?: boolean;
  roundsScore?: "Aggregate" | "Manual" | "Best Of" | "None";
  targetScore?: number;
  rounds?: {
    name: string;
    type?: string;
    color?: string;
    score?: number;
    order?: number;
  }[];
}

export async function createRole(
  page: Page,
  name: string,
  description?: string,
) {
  // Navigate to roles form if not already there
  const editRolesButton = page.getByRole("button", {
    name: /Edit Game Roles/i,
  });
  if (await editRolesButton.isVisible()) {
    await editRolesButton.click();
  }

  // Wait for roles form to be visible
  await page
    .waitForSelector('input[placeholder="Role Name"]', { state: "visible" })
    .catch(() => {
      // If already in form, continue
    });

  // Click add role button if there's a new role form
  const addRoleButton = page
    .getByRole("button", { name: /Add Role|^\+$/i })
    .first();
  if (await addRoleButton.isVisible()) {
    await addRoleButton.click();
  }

  // Fill in role name
  const nameInput = page.locator('input[placeholder="Role Name"]').last();
  await nameInput.fill(name);

  // Fill in description if provided
  if (description) {
    const descInput = page
      .locator('textarea[placeholder="Role Description"]')
      .last();
    await descInput.fill(description);
  }

  // Save the role
  const saveButton = page.getByRole("button", { name: /Save/i }).last();
  await saveButton.click();

  // Wait for form to close or role to appear
  await page.waitForTimeout(500);
}

export async function createScoresheet(page: Page, config: ScoresheetConfig) {
  // Click "Create New" button in scoresheet section
  const createButton = page.getByRole("button", { name: "Create New" });
  await createButton.click();

  // Wait for scoresheet form
  await page.waitForSelector(
    'input[placeholder*="Sheet name" i], input[name="name"]',
    { state: "visible" },
  );

  // Fill in name
  const nameInput = page
    .getByRole("textbox", { name: "Sheet Name" })
    .or(page.locator('input[name="name"]'));
  await nameInput.fill(config.name);

  // Set win condition
  if (config.winCondition) {
    const winConditionSelect = page.getByRole("combobox", {
      name: "Win Condition",
    });
    await winConditionSelect.click();
    await page.getByText(config.winCondition, { exact: true }).click();
  }

  // Set isCoop
  if (config.isCoop !== undefined) {
    const isCoopCheckbox = page.getByRole("checkbox", { name: /Is Co-op/i });
    const isChecked = await isCoopCheckbox.isChecked();
    if (isChecked !== config.isCoop) {
      await isCoopCheckbox.click();
    }
  }

  // Set isDefault
  if (config.isDefault !== undefined) {
    const isDefaultCheckbox = page.getByRole("checkbox", {
      name: /Is Default/i,
    });
    const isChecked = await isDefaultCheckbox.isChecked();
    if (isChecked !== config.isDefault) {
      await isDefaultCheckbox.click();
    }
  }

  // Set roundsScore
  if (config.roundsScore) {
    const roundsScoreSelect = page.getByRole("combobox", {
      name: /Scoring Method/i,
    });
    await roundsScoreSelect.click();
    await page.getByText(config.roundsScore, { exact: true }).click();
  }

  // Set targetScore if win condition is Target Score
  if (
    config.winCondition === "Target Score" &&
    config.targetScore !== undefined
  ) {
    const targetScoreInput = page
      .getByRole("spinbutton", { name: /Target Score/i })
      .or(page.locator('input[name="targetScore"]'));
    await targetScoreInput.fill(config.targetScore.toString());
  }

  // Add rounds if provided
  if (config.rounds && config.rounds.length > 0) {
    for (let i = 0; i < config.rounds.length; i++) {
      const round = config.rounds[i];
      // Add round button if not first round
      if (i > 0) {
        const addRoundButton = page
          .getByRole("button", { name: /Add Round|^\+$/i })
          .last();
        await addRoundButton.click();
      }

      // Fill in round details
      const roundNameInput = page
        .locator(`input[name="rounds.${i}.name"]`)
        .or(page.locator('input[placeholder*="Round" i]').nth(i));
      await roundNameInput.fill(round.name);

      if (round.type) {
        const typeSelect = page
          .locator(`select[name="rounds.${i}.type"]`)
          .or(page.getByRole("combobox").nth(i + 2));
        await typeSelect.click();
        await page.getByText(round.type, { exact: true }).click();
      }
    }
  }

  // Submit scoresheet form
  const submitButton = page.getByRole("button", { name: "Submit" });
  await submitButton.click();

  // Wait for form to close
  await page.waitForTimeout(500);
}
