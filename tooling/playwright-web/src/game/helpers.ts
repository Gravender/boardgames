import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
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
  team,
  user,
} from "@board-games/db/schema";

import { getBetterAuthUserId } from "../getUserId";

/**
 * Fetches the user and all games created by that user with their related data.
 *
 * @param userId - The user ID to fetch games for
 * @returns An object containing the user and their games with related scoresheets and matches, or null if user not found
 */
async function fetchUserGames(userId: string) {
  const [returnedUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId));

  if (!returnedUser) {
    return null;
  }

  const returnedGames = await db.query.game.findMany({
    where: {
      createdBy: returnedUser.id,
    },
    with: {
      scoresheets: true,
      matches: {
        with: {
          matchPlayers: true,
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

  return {
    user: returnedUser,
    games: returnedGames,
    scoresheets: returnedScoresheets,
  };
}

/**
 * Deletes all match-related data in the correct cascade order.
 * Deletion order: matchPlayerRole -> roundPlayer -> matchPlayer -> match
 *
 * @param games - Array of games with their matches and matchPlayers
 * @param tx - Database transaction (optional, defaults to direct db access)
 */
async function deleteMatchRelatedData(
  games: {
    matches: {
      matchPlayers: { id: number }[];
      id: number;
    }[];
  }[],
  tx?: TransactionType,
) {
  const database = tx ?? db;
  const matchPlayers = games.flatMap((g) =>
    g.matches.flatMap((m) => m.matchPlayers.map((mp) => mp.id)),
  );
  const matches = games.flatMap((g) => g.matches.map((m) => m.id));

  if (matchPlayers.length > 0) {
    await database
      .delete(matchPlayerRole)
      .where(inArray(matchPlayerRole.matchPlayerId, matchPlayers));
    await database
      .delete(roundPlayer)
      .where(inArray(roundPlayer.matchPlayerId, matchPlayers));
    await database
      .delete(matchPlayer)
      .where(inArray(matchPlayer.id, matchPlayers));
  }

  if (matches.length > 0) {
    await database.delete(team).where(inArray(team.matchId, matches));
    await database.delete(match).where(inArray(match.id, matches));
  }
}

/**
 * Deletes all scoresheet-related data in the correct cascade order.
 * Deletion order: round -> scoresheet
 *
 * @param scoresheets - Array of scoresheets to delete
 * @param tx - Database transaction (optional, defaults to direct db access)
 */
async function deleteScoresheetRelatedData(
  scoresheets: { id: number }[],
  tx?: TransactionType,
) {
  const database = tx ?? db;

  if (scoresheets.length > 0) {
    const scoresheetIds = scoresheets.map((s) => s.id);
    await database
      .delete(round)
      .where(inArray(round.scoresheetId, scoresheetIds));
    await database
      .delete(scoresheet)
      .where(inArray(scoresheet.id, scoresheetIds));
  }
}

/**
 * Deletes all game-related data in the correct cascade order.
 * Deletion order: gameRole -> game
 *
 * @param games - Array of games to delete
 * @param tx - Database transaction (optional, defaults to direct db access)
 */
async function deleteGameRelatedData(
  games: { id: number }[],
  tx?: TransactionType,
) {
  const database = tx ?? db;
  const gameIds = games.map((g) => g.id);

  await database.delete(gameRole).where(inArray(gameRole.gameId, gameIds));
  await database.delete(game).where(inArray(game.id, gameIds));
}

/**
 * Deletes all games created by a user and all their related data.
 *
 * This function performs a complete cascade deletion of:
 * - Match-related data: matchPlayerRole, roundPlayer, matchPlayer, match
 * - Scoresheet-related data: round, scoresheet
 * - Game-related data: gameRole, game
 *
 * The deletion is performed within a database transaction to ensure atomicity.
 * If any deletion fails, the entire operation is rolled back to prevent partial
 * deletions. Errors are logged to the console for debugging.
 *
 * @param browserName - The browser name used to identify the test user
 * @throws Logs error to console if deletion fails, but does not throw to avoid
 *         breaking test execution
 */
export async function deleteGames(browserName: string) {
  const betterAuthUserId = getBetterAuthUserId(browserName);
  const userData = await fetchUserGames(betterAuthUserId);

  if (!userData || userData.games.length === 0) {
    return;
  }

  try {
    await db.transaction(async (tx) => {
      await deleteMatchRelatedData(userData.games, tx);
      await deleteScoresheetRelatedData(userData.scoresheets, tx);
      await deleteGameRelatedData(userData.games, tx);
    });
  } catch (error) {
    console.error(
      `Failed to delete games for user ${betterAuthUserId}:`,
      error,
    );
    // Re-throw to ensure transaction rollback
    throw error;
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
  // Escape special regex characters in game name
  const escapedGameName = gameName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Escape year for regex (it appears in parentheses and standalone)
  const escapedYear = yearPublished
    .toString()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Generate regex pattern matching: gameName (yearPublished) yearPublished players playtime "Never played" plays
  // Uses specific values for year and players, regex for playtime range
  const pattern = `${escapedGameName} \\(${escapedYear}\\) ${yearPublished} ${playersMin}-${playersMax} players ${playtimeMin}-${playtimeMax} min Never played 0 plays`;
  return `- text: /${pattern}/`;
}

export async function navigateToGameEdit(page: Page, gameId: number) {
  await page.goto(`/dashboard/games/${gameId}/edit`);
}

export async function findGameLink(page: Page, gameName: string) {
  // Wait for games list to be visible
  const gamesList = page.getByLabel("Games", { exact: true });
  await expect(gamesList).toBeVisible({ timeout: 5000 });

  // Find the game link using the accessible name
  const gameLink = page.getByRole("link", { name: `${gameName} game item` });
  await expect(gameLink).toBeVisible({ timeout: 5000 });

  // Return the link
  return gameLink;
}

export async function findGameCard(page: Page, gameName: string) {
  // Wait for games list to be visible
  const gamesList = page.getByLabel("Games", { exact: true });
  await expect(gamesList).toBeVisible({ timeout: 5000 });

  // Find the game link using the accessible name
  const gameLink = page.getByRole("link", { name: `${gameName} game item` });
  await expect(gameLink).toBeVisible({ timeout: 5000 });

  // Return the card (listitem) that contains the link
  return gamesList.getByRole("listitem").filter({ has: gameLink });
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
  const winConditionSelect = page.getByRole("combobox", {
    name: "Win Condition",
  });
  await winConditionSelect.click();
  await page.getByText(config.winCondition, { exact: true }).click();

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
      if (round === undefined) continue;
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
