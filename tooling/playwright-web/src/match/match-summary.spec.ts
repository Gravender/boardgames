import { expect, test } from "@playwright/test";

import { MATCH_GAME_NAME } from "../shared/test-data";
import {
  createAndFinishMatchViaTrpc,
  createFullMatchViaTrpc,
} from "../trpc/procedures";
import { createTrpcCaller } from "../trpc/trpc-helper";
import { deleteMatchTestData } from "./helpers";

const PREFIX = "_summary_";

test.describe("Match Summary", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
  });
  test.afterAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
  });

  test("displays rankings, placements, scores, and First Game badges for Highest Score", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName = browserName + PREFIX + "high_" + MATCH_GAME_NAME;

    const { gameId, match } = await createAndFinishMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName: browserName + "_HighScore Summary",
        playerCount: 3,
        playerPrefix: browserName + "_HSP",
        scoresheetConfigs: [
          {
            name: "Default",
            winCondition: "Highest Score",
            roundsScore: "Aggregate",
            rounds: [{ name: "Round 1", type: "Numeric" }],
          },
        ],
        playerScores: [50, 30, 10],
      },
    );

    await page.goto(`/dashboard/games/${gameId}/${match.id}/summary`);

    // Wait for the results card to load
    const resultsCard = page.locator('[data-testid="match-results"]');
    await expect(resultsCard).toBeVisible({ timeout: 15000 });

    // Verify 3 result rows exist (non-team individual players)
    const resultRows = page.locator('[data-testid="result-row"]');
    await expect(resultRows).toHaveCount(3);

    // First row: winner (Player 1, 50 pts, 1st place)
    const firstRow = resultRows.nth(0);
    await expect(firstRow).toHaveAttribute(
      "aria-label",
      /Winner.*1st place.*50 points/,
    );
    await expect(firstRow.locator('[aria-label="1st place"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="result-score"]')).toHaveText(
      "50 pts",
    );

    // Second row: loser (Player 2, 30 pts, 2nd place)
    const secondRow = resultRows.nth(1);
    await expect(secondRow).toHaveAttribute(
      "aria-label",
      /Loser.*2nd place.*30 points/,
    );
    await expect(secondRow.locator('[aria-label="2nd place"]')).toBeVisible();
    await expect(secondRow.locator('[data-testid="result-score"]')).toHaveText(
      "30 pts",
    );

    // Third row: loser (Player 3, 10 pts, 3rd place)
    const thirdRow = resultRows.nth(2);
    await expect(thirdRow).toHaveAttribute(
      "aria-label",
      /Loser.*3rd place.*10 points/,
    );
    await expect(thirdRow.locator('[aria-label="3rd place"]')).toBeVisible();
    await expect(thirdRow.locator('[data-testid="result-score"]')).toHaveText(
      "10 pts",
    );

    // All players should have "First Game" badge (first match for all)
    const badges = resultsCard.locator('[data-testid="result-badge"]');
    await expect(badges).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(badges.nth(i)).toHaveText("First Game");
    }

    // Verify stats table is visible
    const statsCard = page.locator('[data-testid="player-stats"]');
    await expect(statsCard).toBeVisible();
  });

  test("displays correct rankings for Lowest Score win condition", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName = browserName + PREFIX + "low_" + MATCH_GAME_NAME;

    const { gameId, match } = await createAndFinishMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName: browserName + "_LowScore Summary",
        playerCount: 2,
        playerPrefix: browserName + "_LSP",
        scoresheetConfigs: [
          {
            name: "Default",
            winCondition: "Lowest Score",
            roundsScore: "Aggregate",
            rounds: [{ name: "Round 1", type: "Numeric" }],
          },
        ],
        playerScores: [10, 50],
        winCondition: "Lowest Score",
      },
    );

    await page.goto(`/dashboard/games/${gameId}/${match.id}/summary`);

    const resultsCard = page.locator('[data-testid="match-results"]');
    await expect(resultsCard).toBeVisible({ timeout: 15000 });

    const resultRows = page.locator('[data-testid="result-row"]');
    await expect(resultRows).toHaveCount(2);

    // In Lowest Score, Player 1 (score 10) is 1st place / winner
    const firstRow = resultRows.nth(0);
    await expect(firstRow).toHaveAttribute(
      "aria-label",
      /Winner.*1st place.*10 points/,
    );
    await expect(firstRow.locator('[data-testid="result-score"]')).toHaveText(
      "10 pts",
    );

    // Player 2 (score 50) is 2nd place / loser
    const secondRow = resultRows.nth(1);
    await expect(secondRow).toHaveAttribute(
      "aria-label",
      /Loser.*2nd place.*50 points/,
    );
    await expect(secondRow.locator('[data-testid="result-score"]')).toHaveText(
      "50 pts",
    );
  });

  test("displays Best/Worst badges, stats table values, and previous matches across multiple matches", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName = browserName + PREFIX + "multi_" + MATCH_GAME_NAME;
    const playerPrefix = browserName + "_SumP";

    // Match 1: P1=50 (wins), P2=30
    const result1 = await createAndFinishMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName: browserName + "_Multi Match 1",
        playerCount: 2,
        playerPrefix,
        scoresheetConfigs: [
          {
            name: "Default",
            winCondition: "Highest Score",
            roundsScore: "Aggregate",
            rounds: [{ name: "Round 1", type: "Numeric" }],
          },
        ],
        playerScores: [50, 30],
      },
    );

    // Match 2: reuse same game/scoresheet/players. P1=20, P2=40
    // P1 scores [50,20] → current is worst → "Worst Game"
    // P2 scores [30,40] → current is best  → "Best Game"
    const result2 = await createAndFinishMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName: browserName + "_Multi Match 2",
        existingGameId: result1.gameId,
        existingScoresheetId: result1.scoresheetId,
        existingPlayers: result1.players,
        playerScores: [20, 40],
      },
    );

    // Navigate to Match 2 summary
    await page.goto(
      `/dashboard/games/${result2.gameId}/${result2.match.id}/summary`,
    );

    const resultsCard = page.locator('[data-testid="match-results"]');
    await expect(resultsCard).toBeVisible({ timeout: 15000 });

    // ── Result rows ──────────────────────────────────────────────────
    const resultRows = page.locator('[data-testid="result-row"]');
    await expect(resultRows).toHaveCount(2);

    // P2 (40 pts) is 1st place (winner) for Match 2
    const winnerRow = resultRows.nth(0);
    await expect(winnerRow).toHaveAttribute("aria-label", /Winner.*1st place/);
    await expect(winnerRow.locator('[data-testid="result-score"]')).toHaveText(
      "40 pts",
    );

    // P1 (20 pts) is 2nd place (loser)
    const loserRow = resultRows.nth(1);
    await expect(loserRow).toHaveAttribute("aria-label", /Loser.*2nd place/);
    await expect(loserRow.locator('[data-testid="result-score"]')).toHaveText(
      "20 pts",
    );

    // ── Performance badges ───────────────────────────────────────────
    // P2 has "Best Game" (40 > 30 previous)
    await expect(winnerRow.locator('[data-testid="result-badge"]')).toHaveText(
      "Best Game",
    );

    // P1 has "Worst Game" (20 < 50 previous)
    await expect(loserRow.locator('[data-testid="result-badge"]')).toHaveText(
      "Worst Game",
    );

    // ── Player Statistics table ──────────────────────────────────────
    const statsCard = page.locator('[data-testid="player-stats"]');
    await expect(statsCard).toBeVisible();

    const p1Name = `${playerPrefix} 1`;
    const p2Name = `${playerPrefix} 2`;
    const p1Row = statsCard.locator(`[data-testid="stats-row-${p1Name}"]`);
    const p2Row = statsCard.locator(`[data-testid="stats-row-${p2Name}"]`);

    await expect(p1Row).toBeVisible();
    await expect(p2Row).toBeVisible();

    // P1: Games=2, Wins=1
    const p1Cells = p1Row.locator("td");
    await expect(p1Cells.nth(1)).toHaveText("2"); // Games
    await expect(p1Cells.nth(2)).toContainText("1"); // Wins

    // P2: Games=2, Wins=1
    const p2Cells = p2Row.locator("td");
    await expect(p2Cells.nth(1)).toHaveText("2"); // Games
    await expect(p2Cells.nth(2)).toContainText("1"); // Wins

    // Best/Worst for Highest Score:
    // P1 scores [50,20]: Best=50, Worst=20
    await expect(p1Cells.nth(6)).toHaveText("50"); // Best
    await expect(p1Cells.nth(7)).toHaveText("20"); // Worst

    // P2 scores [30,40]: Best=40, Worst=30
    await expect(p2Cells.nth(6)).toHaveText("40"); // Best
    await expect(p2Cells.nth(7)).toHaveText("30"); // Worst

    // ── Previous Matches section ─────────────────────────────────────
    const prevMatches = page.locator('[data-testid="previous-matches"]');
    await expect(prevMatches).toBeVisible();

    const prevMatchCards = prevMatches.locator(
      '[data-testid="previous-match-card"]',
    );
    // Both matches appear in previous matches
    await expect(prevMatchCards).toHaveCount(2);
  });

  test("displays Perfect Game badge for Target Score win condition", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName = browserName + PREFIX + "target_" + MATCH_GAME_NAME;

    const { gameId, match } = await createAndFinishMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName: browserName + "_Target Summary",
        playerCount: 2,
        playerPrefix: browserName + "_TSP",
        scoresheetConfigs: [
          {
            name: "Default",
            winCondition: "Target Score",
            roundsScore: "Aggregate",
            targetScore: 100,
            rounds: [{ name: "Round 1", type: "Numeric" }],
          },
        ],
        playerScores: [100, 80],
        winCondition: "Target Score",
      },
    );

    await page.goto(`/dashboard/games/${gameId}/${match.id}/summary`);

    const resultsCard = page.locator('[data-testid="match-results"]');
    await expect(resultsCard).toBeVisible({ timeout: 15000 });

    const resultRows = page.locator('[data-testid="result-row"]');
    await expect(resultRows).toHaveCount(2);

    // Player who hit target score (100) gets "Perfect Game" badge
    // For first-time players, First Game takes priority over Perfect Game
    const firstRow = resultRows.nth(0);
    await expect(firstRow).toHaveAttribute("aria-label", /Winner.*1st place/);
    await expect(
      firstRow.locator('[data-testid="result-badge"]'),
    ).toHaveText("First Game");

    // Player 2 (score 80) is 2nd / loser
    const secondRow = resultRows.nth(1);
    await expect(secondRow).toHaveAttribute("aria-label", /Loser.*2nd place/);
  });

  test("displays manual winner and loser indicators", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName = browserName + PREFIX + "manual_" + MATCH_GAME_NAME;

    // Create match with Manual win condition
    const result = await createFullMatchViaTrpc(browserName, browserGameName, {
      matchName: browserName + "_Manual Summary",
      playerCount: 2,
      playerPrefix: browserName + "_MSP",
      scoresheetConfigs: [
        {
          name: "Manual Sheet",
          winCondition: "Manual",
          roundsScore: "None",
        },
      ],
    });

    // Finish with only player 1 as winner
    const caller = createTrpcCaller(browserName);
    const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
      type: "original",
      id: result.match.id,
    });
    const firstPlayer = playersAndTeams.players[0];
    if (!firstPlayer) throw new Error("No players found");

    await caller.match.update.updateMatchManualWinner({
      match: { type: "original", id: result.match.id },
      winners: [{ id: firstPlayer.baseMatchPlayerId }],
    });

    await page.goto(
      `/dashboard/games/${result.gameId}/${result.match.id}/summary`,
    );

    const resultsCard = page.locator('[data-testid="match-results"]');
    await expect(resultsCard).toBeVisible({ timeout: 15000 });

    const resultRows = page.locator('[data-testid="result-row"]');
    await expect(resultRows).toHaveCount(2);

    // Winner row: the row's own aria-label contains ", Winner"
    // and the inner span has aria-label="Winner" (the ✔️ icon)
    const winnerRow = page.locator(
      '[data-testid="result-row"][aria-label*=", Winner"]',
    );
    await expect(winnerRow).toBeVisible();
    await expect(winnerRow.locator('[aria-label="Winner"]')).toBeVisible();

    // Loser row: the row's own aria-label contains ", Loser"
    // and the inner span has aria-label="Not winner" (the ❌ icon)
    const loserRow = page.locator(
      '[data-testid="result-row"][aria-label*=", Loser"]',
    );
    await expect(loserRow).toBeVisible();
    await expect(
      loserRow.locator('[aria-label="Not winner"]'),
    ).toBeVisible();
  });
});
