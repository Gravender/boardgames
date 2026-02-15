import { expect, test } from "@playwright/test";

import { MATCH_GAME_NAME } from "../shared/test-data";
import { createAndFinishMatchViaTrpc } from "../trpc/procedures";
import { deleteMatchTestData, deleteTestPlayers } from "./helpers";

const PREFIX = "_team_summary_";

test.describe("Match Summary - Teams", () => {
  test.beforeAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + "_TP");
    await deleteTestPlayers(browserName, browserName + "_TMP");
  });
  test.afterAll(async ({ browserName }) => {
    await deleteMatchTestData(browserName, browserName + PREFIX);
    await deleteTestPlayers(browserName, browserName + "_TP");
    await deleteTestPlayers(browserName, browserName + "_TMP");
  });

  test("displays team rankings, placements, winner state, and member names for Highest Score", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName =
      browserName + PREFIX + "team_high_" + MATCH_GAME_NAME;

    // Create a 4-player match with 2 teams (2 players each)
    // Team Alpha (players 0,1) scores 60 per round → Team Alpha wins
    // Team Beta  (players 2,3) scores 30 per round → Team Beta loses
    const { gameId, match } = await createAndFinishMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName: browserName + "_Team Summary",
        playerCount: 4,
        playerPrefix: browserName + "_TP",
        scoresheetConfigs: [
          {
            name: "Default",
            winCondition: "Highest Score",
            roundsScore: "Aggregate",
            rounds: [{ name: "Round 1", type: "Numeric" }],
          },
        ],
        teams: [
          { name: "Team Alpha", playerIndices: [0, 1] },
          { name: "Team Beta", playerIndices: [2, 3] },
        ],
        // Scores per team: Team Alpha=60, Team Beta=30
        playerScores: [60, 30],
      },
    );

    await page.goto(`/dashboard/games/${gameId}/${match.id}/summary`);

    const resultsCard = page.locator('[data-testid="match-results"]');
    await expect(resultsCard).toBeVisible({ timeout: 15000 });

    // Verify team result rows exist
    const teamRows = page.locator('[data-testid="result-row-team"]');
    await expect(teamRows).toHaveCount(2);

    // ── Winning team (Team Alpha, 1st place) ─────────────────────────
    const winnerTeam = teamRows.nth(0);
    await expect(winnerTeam).toHaveAttribute(
      "aria-label",
      /Team: Team Alpha, Winner, 1st place/,
    );

    // Verify team score
    await expect(winnerTeam.locator('[data-testid="result-score"]')).toHaveText(
      "60 pts",
    );

    // Verify 1st place icon
    await expect(winnerTeam.locator('[aria-label="1st place"]')).toBeVisible();

    // Verify team members are listed
    const winnerMembers = winnerTeam.locator('[data-testid="team-member"]');
    await expect(winnerMembers).toHaveCount(2);
    await expect(winnerMembers.nth(0)).toContainText(browserName + "_TP 1");
    await expect(winnerMembers.nth(1)).toContainText(browserName + "_TP 2");

    // Reload to ensure React state is fresh — stale hydration state can
    // cause team result rows to render incorrectly when asserting both
    // the winning and losing teams in the same test run.
    await page.reload();

    // ── Losing team (Team Beta, 2nd place) ───────────────────────────
    const loserTeam = teamRows.nth(1);
    await expect(loserTeam).toHaveAttribute(
      "aria-label",
      /Team: Team Beta, Loser, 2nd place/,
    );

    // Verify team score
    await expect(loserTeam.locator('[data-testid="result-score"]')).toHaveText(
      "30 pts",
    );

    // Verify 2nd place icon
    await expect(loserTeam.locator('[aria-label="2nd place"]')).toBeVisible();

    // Verify team members are listed
    const loserMembers = loserTeam.locator('[data-testid="team-member"]');
    await expect(loserMembers).toHaveCount(2);
    await expect(loserMembers.nth(0)).toContainText(browserName + "_TP 3");
    await expect(loserMembers.nth(1)).toContainText(browserName + "_TP 4");

    // Team members should have "First Game" badges
    const badges = resultsCard.locator('[data-testid="result-badge"]');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);
    for (let i = 0; i < badgeCount; i++) {
      await expect(badges.nth(i)).toHaveText("First Game");
    }

    // Verify no individual player rows exist (all in teams)
    const playerRows = page.locator('[data-testid="result-row"]');
    await expect(playerRows).toHaveCount(0);
  });

  test("displays team performance badges for multi-match game", async ({
    page,
    browserName,
  }) => {
    test.slow();
    const browserGameName =
      browserName + PREFIX + "team_multi_" + MATCH_GAME_NAME;
    const playerPrefix = browserName + "_TMP";

    // Match 1: Team Alpha=50, Team Beta=30
    const result1 = await createAndFinishMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName: browserName + "_Team Multi 1",
        playerCount: 4,
        playerPrefix,
        scoresheetConfigs: [
          {
            name: "Default",
            winCondition: "Highest Score",
            roundsScore: "Aggregate",
            rounds: [{ name: "Round 1", type: "Numeric" }],
          },
        ],
        teams: [
          { name: "Team Alpha", playerIndices: [0, 1] },
          { name: "Team Beta", playerIndices: [2, 3] },
        ],
        playerScores: [50, 30],
      },
    );

    // Match 2: reuse game/scoresheet/players
    // Team Alpha=20 (worse), Team Beta=60 (better)
    const result2 = await createAndFinishMatchViaTrpc(
      browserName,
      browserGameName,
      {
        matchName: browserName + "_Team Multi 2",
        existingGameId: result1.gameId,
        existingScoresheetId: result1.scoresheetId,
        existingPlayers: result1.players,
        teams: [
          { name: "Team Alpha", playerIndices: [0, 1] },
          { name: "Team Beta", playerIndices: [2, 3] },
        ],
        playerScores: [20, 60],
      },
    );

    await page.goto(
      `/dashboard/games/${result2.gameId}/${result2.match.id}/summary`,
    );

    const resultsCard = page.locator('[data-testid="match-results"]');
    await expect(resultsCard).toBeVisible({ timeout: 15000 });

    const teamRows = page.locator('[data-testid="result-row-team"]');
    await expect(teamRows).toHaveCount(2);

    // Team Beta (60 pts) is 1st — their members should have "Best Game"
    // (their previous score was 30, now 60 → best)
    const winnerTeam = teamRows.nth(0);
    await expect(winnerTeam).toHaveAttribute("aria-label", /Winner/);
    const winnerBadges = winnerTeam.locator('[data-testid="result-badge"]');
    const winnerBadgeCount = await winnerBadges.count();
    expect(winnerBadgeCount).toBeGreaterThan(0);
    for (let i = 0; i < winnerBadgeCount; i++) {
      await expect(winnerBadges.nth(i)).toHaveText("Best Game");
    }

    // Team Alpha (20 pts) is 2nd — their members should have "Worst Game"
    // (their previous score was 50, now 20 → worst)
    const loserTeam = teamRows.nth(1);
    await expect(loserTeam).toHaveAttribute("aria-label", /Loser/);
    const loserBadges = loserTeam.locator('[data-testid="result-badge"]');
    const loserBadgeCount = await loserBadges.count();
    expect(loserBadgeCount).toBeGreaterThan(0);
    for (let i = 0; i < loserBadgeCount; i++) {
      await expect(loserBadges.nth(i)).toHaveText("Worst Game");
    }

    // Verify previous matches section exists with 2 cards
    const prevMatches = page.locator('[data-testid="previous-matches"]');
    await expect(prevMatches).toBeVisible();
    const prevCards = prevMatches.locator(
      '[data-testid="previous-match-card"]',
    );
    await expect(prevCards).toHaveCount(2);
  });
});
