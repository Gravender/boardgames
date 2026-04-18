import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import {
  createFinishedMatchForScoresheet,
  createGameWithAnalyticsScoresheet,
  shareFinishedMatchAnalyticsWithRecipient,
} from "./game.analytics-test-fixtures";
import {
  createAuthenticatedCaller,
  ensureUserPlayer,
  gameTestLifecycle,
} from "./game-test-fixtures";

describe("Game stats router analytics integration", () => {
  const ownerLifecycle = gameTestLifecycle();
  const recipientLifecycle = gameTestLifecycle();
  const recipientBLifecycle = gameTestLifecycle();

  beforeAll(async () => {
    await ownerLifecycle.deleteTestUser();
    await recipientLifecycle.deleteTestUser();
    await recipientBLifecycle.deleteTestUser();
  });

  afterAll(async () => {
    await ownerLifecycle.deleteTestUser();
    await recipientLifecycle.deleteTestUser();
    await recipientBLifecycle.deleteTestUser();
  });

  beforeEach(async () => {
    await ownerLifecycle.createTestUser();
    await recipientLifecycle.createTestUser();
    await recipientBLifecycle.createTestUser();
  });

  afterEach(async () => {
    await ownerLifecycle.deleteTestUser();
    await recipientLifecycle.deleteTestUser();
    await recipientBLifecycle.deleteTestUser();
  });

  describe("game.getGameStatsHeader shared visibility behavior", () => {
    test("includes shared matches for a recipient without analytics linking", async () => {
      const ownerCaller = await createAuthenticatedCaller(
        ownerLifecycle.userId,
      );
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );

      await ensureUserPlayer(recipientCaller);

      const ownerFixture = await createGameWithAnalyticsScoresheet(
        ownerCaller,
        {
          gameName: "Shared Header Game",
        },
      );
      const ownerMatch = await createFinishedMatchForScoresheet(ownerCaller, {
        gameId: ownerFixture.gameId,
        scoresheetId: ownerFixture.scoresheetId,
        matchName: "Shared Header Match",
      });

      const sharedFixture = await shareFinishedMatchAnalyticsWithRecipient({
        ownerUserId: ownerLifecycle.userId,
        recipientUserId: recipientLifecycle.userId,
        gameId: ownerFixture.gameId,
        gameScoresheetId: ownerFixture.scoresheetId,
        matchId: ownerMatch.matchId,
        matchScoresheetId: ownerMatch.matchScoresheetId,
      });

      const header = await recipientCaller.game.getGameStatsHeader({
        type: "shared",
        sharedGameId: sharedFixture.sharedGameId,
      });

      expect(header.overallMatchesPlayed).toBe(1);
      expect(header.userMatchesPlayed).toBe(0);
      expect(header.winRate).toBe(0);
    });
  });

  describe("game.getGamePlayerStats shared visibility behavior", () => {
    test("returns shared players for a visible shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(
        ownerLifecycle.userId,
      );
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );

      const ownerFixture = await createGameWithAnalyticsScoresheet(
        ownerCaller,
        {
          gameName: "Shared Player Stats Game",
        },
      );
      const ownerMatch = await createFinishedMatchForScoresheet(ownerCaller, {
        gameId: ownerFixture.gameId,
        scoresheetId: ownerFixture.scoresheetId,
        matchName: "Shared Player Stats Match",
        playerCount: 3,
      });

      const sharedFixture = await shareFinishedMatchAnalyticsWithRecipient({
        ownerUserId: ownerLifecycle.userId,
        recipientUserId: recipientLifecycle.userId,
        gameId: ownerFixture.gameId,
        gameScoresheetId: ownerFixture.scoresheetId,
        matchId: ownerMatch.matchId,
        matchScoresheetId: ownerMatch.matchScoresheetId,
      });

      const playerStats = await recipientCaller.game.getGamePlayerStats({
        type: "shared",
        sharedGameId: sharedFixture.sharedGameId,
      });

      expect(playerStats.players).toHaveLength(3);
      expect(
        playerStats.players.every((player) => player.type === "shared"),
      ).toBe(true);
      expect(playerStats.players.map((player) => player.name).sort()).toEqual(
        ownerMatch.players.map((player) => player.name).sort(),
      );
    });
  });

  describe("game.getGameScoresheetStats analytics family behavior", () => {
    test("keeps original-only stats in a local analytics family", async () => {
      const caller = await createAuthenticatedCaller(ownerLifecycle.userId);
      await ensureUserPlayer(caller);

      const gameFixture = await createGameWithAnalyticsScoresheet(caller, {
        gameName: "Original Analytics Game",
      });
      const finishedMatch = await createFinishedMatchForScoresheet(caller, {
        gameId: gameFixture.gameId,
        scoresheetId: gameFixture.scoresheetId,
        matchName: "Original Analytics Match",
      });

      const header = await caller.game.getGameStatsHeader({
        type: "original",
        id: gameFixture.gameId,
      });
      const playerStats = await caller.game.getGamePlayerStats({
        type: "original",
        id: gameFixture.gameId,
      });
      const scoresheetStats = await caller.game.getGameScoresheetStats({
        type: "original",
        id: gameFixture.gameId,
      });

      expect(header.overallMatchesPlayed).toBe(1);
      expect(playerStats.players.map((player) => player.name).sort()).toEqual(
        finishedMatch.players.map((player) => player.name).sort(),
      );
      expect(scoresheetStats).toHaveLength(1);

      const [family] = scoresheetStats;
      expect(family).toMatchObject({
        type: "original",
        id: gameFixture.scoresheetId,
        analyticsGroupingScoresheetId: gameFixture.scoresheetId,
        analyticsGroupingScoresheetSourceType: "local",
        linkageState: "original",
        contributingMatchCount: 1,
      });
      expect(family?.analyticsGroupingKey).toBe(
        `local:${String(gameFixture.scoresheetId)}`,
      );
    });

    test("keeps a shared unlinked scoresheet in its own shared analytics family", async () => {
      const ownerCaller = await createAuthenticatedCaller(
        ownerLifecycle.userId,
      );
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );

      await ensureUserPlayer(recipientCaller);

      const ownerFixture = await createGameWithAnalyticsScoresheet(
        ownerCaller,
        {
          gameName: "Shared Unlinked Game",
        },
      );
      const ownerMatch = await createFinishedMatchForScoresheet(ownerCaller, {
        gameId: ownerFixture.gameId,
        scoresheetId: ownerFixture.scoresheetId,
        matchName: "Shared Unlinked Match",
      });

      const sharedFixture = await shareFinishedMatchAnalyticsWithRecipient({
        ownerUserId: ownerLifecycle.userId,
        recipientUserId: recipientLifecycle.userId,
        gameId: ownerFixture.gameId,
        gameScoresheetId: ownerFixture.scoresheetId,
        matchId: ownerMatch.matchId,
        matchScoresheetId: ownerMatch.matchScoresheetId,
      });

      const header = await recipientCaller.game.getGameStatsHeader({
        type: "shared",
        sharedGameId: sharedFixture.sharedGameId,
      });
      const playerStats = await recipientCaller.game.getGamePlayerStats({
        type: "shared",
        sharedGameId: sharedFixture.sharedGameId,
      });
      const scoresheetStats = await recipientCaller.game.getGameScoresheetStats(
        {
          type: "shared",
          sharedGameId: sharedFixture.sharedGameId,
        },
      );

      expect(header.overallMatchesPlayed).toBe(1);
      expect(playerStats.players).toHaveLength(2);
      expect(scoresheetStats).toHaveLength(1);

      const [family] = scoresheetStats;
      expect(family).toMatchObject({
        type: "shared",
        sharedId: sharedFixture.sharedGameScoresheetId,
        analyticsGroupingScoresheetId: sharedFixture.sharedGameScoresheetId,
        analyticsGroupingScoresheetSourceType: "shared",
        linkageState: "shared_unlinked",
        contributingMatchCount: 1,
      });
      expect(family?.analyticsGroupingKey).toBe(
        `shared:${String(sharedFixture.sharedGameScoresheetId)}`,
      );
      expect(family?.contributingVisibleScoresheets).toHaveLength(1);
      expect(family?.contributingVisibleScoresheets[0]).toMatchObject({
        visibleScoresheetId: sharedFixture.sharedGameScoresheetId,
        visibleScoresheetSourceType: "shared",
        matchCount: 1,
      });
    });

    test("merges a shared scoresheet into a linked local analytics family", async () => {
      const ownerCaller = await createAuthenticatedCaller(
        ownerLifecycle.userId,
      );
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );

      await ensureUserPlayer(recipientCaller);

      const ownerFixture = await createGameWithAnalyticsScoresheet(
        ownerCaller,
        {
          gameName: "Shared Linked Source Game",
        },
      );
      const ownerMatch = await createFinishedMatchForScoresheet(ownerCaller, {
        gameId: ownerFixture.gameId,
        scoresheetId: ownerFixture.scoresheetId,
        matchName: "Shared Linked Source Match",
      });

      const recipientFixture = await createGameWithAnalyticsScoresheet(
        recipientCaller,
        {
          gameName: "Recipient Linked Game",
          scoresheetName: "Recipient Analytics Sheet",
        },
      );

      const sharedFixture = await shareFinishedMatchAnalyticsWithRecipient({
        ownerUserId: ownerLifecycle.userId,
        recipientUserId: recipientLifecycle.userId,
        gameId: ownerFixture.gameId,
        gameScoresheetId: ownerFixture.scoresheetId,
        matchId: ownerMatch.matchId,
        matchScoresheetId: ownerMatch.matchScoresheetId,
        linkedGameId: recipientFixture.gameId,
      });

      await recipientCaller.game.linkSharedScoresheetAnalytics({
        sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        analyticsLinkedScoresheetId: recipientFixture.scoresheetId,
      });
      await recipientCaller.game.linkSharedRoundsAnalytics({
        sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        links: sharedFixture.sharedGameRounds.map((sharedRound, index) => ({
          sharedRoundId: sharedRound.id,
          analyticsLinkedRoundId: recipientFixture.rounds[index]?.id ?? null,
        })),
      });

      const scoresheetStats = await recipientCaller.game.getGameScoresheetStats(
        {
          type: "shared",
          sharedGameId: sharedFixture.sharedGameId,
        },
      );

      expect(scoresheetStats).toHaveLength(1);

      const [family] = scoresheetStats;
      expect(family).toMatchObject({
        type: "original",
        id: recipientFixture.scoresheetId,
        analyticsGroupingScoresheetId: recipientFixture.scoresheetId,
        analyticsGroupingScoresheetSourceType: "local",
        linkageState: "shared_linked",
        contributingMatchCount: 1,
      });
      expect(family?.analyticsGroupingKey).toBe(
        `local:${String(recipientFixture.scoresheetId)}`,
      );
      expect(family?.contributingVisibleScoresheets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            visibleScoresheetId: sharedFixture.sharedGameScoresheetId,
            visibleScoresheetSourceType: "shared",
            matchCount: 1,
          }),
        ]),
      );
    });

    test("groups the same shared match differently for different recipients", async () => {
      const ownerCaller = await createAuthenticatedCaller(
        ownerLifecycle.userId,
      );
      const recipientACaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );
      const recipientBCaller = await createAuthenticatedCaller(
        recipientBLifecycle.userId,
      );

      await ensureUserPlayer(recipientACaller);
      await ensureUserPlayer(recipientBCaller);

      const ownerFixture = await createGameWithAnalyticsScoresheet(
        ownerCaller,
        {
          gameName: "Shared Divergence Game",
        },
      );
      const ownerMatch = await createFinishedMatchForScoresheet(ownerCaller, {
        gameId: ownerFixture.gameId,
        scoresheetId: ownerFixture.scoresheetId,
        matchName: "Shared Divergence Match",
      });

      const recipientALocal = await createGameWithAnalyticsScoresheet(
        recipientACaller,
        {
          gameName: "Recipient A Local Game",
          scoresheetName: "Recipient A Sheet",
        },
      );

      const sharedForA = await shareFinishedMatchAnalyticsWithRecipient({
        ownerUserId: ownerLifecycle.userId,
        recipientUserId: recipientLifecycle.userId,
        gameId: ownerFixture.gameId,
        gameScoresheetId: ownerFixture.scoresheetId,
        matchId: ownerMatch.matchId,
        matchScoresheetId: ownerMatch.matchScoresheetId,
        linkedGameId: recipientALocal.gameId,
      });
      const sharedForB = await shareFinishedMatchAnalyticsWithRecipient({
        ownerUserId: ownerLifecycle.userId,
        recipientUserId: recipientBLifecycle.userId,
        gameId: ownerFixture.gameId,
        gameScoresheetId: ownerFixture.scoresheetId,
        matchId: ownerMatch.matchId,
        matchScoresheetId: ownerMatch.matchScoresheetId,
      });

      await recipientACaller.game.linkSharedScoresheetAnalytics({
        sharedScoresheetId: sharedForA.sharedGameScoresheetId,
        analyticsLinkedScoresheetId: recipientALocal.scoresheetId,
      });
      await recipientACaller.game.linkSharedRoundsAnalytics({
        sharedScoresheetId: sharedForA.sharedGameScoresheetId,
        links: sharedForA.sharedGameRounds.map((sharedRound, index) => ({
          sharedRoundId: sharedRound.id,
          analyticsLinkedRoundId: recipientALocal.rounds[index]?.id ?? null,
        })),
      });

      const [
        headerA,
        headerB,
        playerStatsA,
        playerStatsB,
        scoresheetStatsA,
        scoresheetStatsB,
      ] = await Promise.all([
        recipientACaller.game.getGameStatsHeader({
          type: "shared",
          sharedGameId: sharedForA.sharedGameId,
        }),
        recipientBCaller.game.getGameStatsHeader({
          type: "shared",
          sharedGameId: sharedForB.sharedGameId,
        }),
        recipientACaller.game.getGamePlayerStats({
          type: "shared",
          sharedGameId: sharedForA.sharedGameId,
        }),
        recipientBCaller.game.getGamePlayerStats({
          type: "shared",
          sharedGameId: sharedForB.sharedGameId,
        }),
        recipientACaller.game.getGameScoresheetStats({
          type: "shared",
          sharedGameId: sharedForA.sharedGameId,
        }),
        recipientBCaller.game.getGameScoresheetStats({
          type: "shared",
          sharedGameId: sharedForB.sharedGameId,
        }),
      ]);

      expect(headerA.overallMatchesPlayed).toBe(1);
      expect(headerB.overallMatchesPlayed).toBe(1);
      expect(playerStatsA.players).toHaveLength(playerStatsB.players.length);
      expect(scoresheetStatsA).toHaveLength(1);
      expect(scoresheetStatsB).toHaveLength(1);

      expect(scoresheetStatsA[0]).toMatchObject({
        type: "original",
        id: recipientALocal.scoresheetId,
        analyticsGroupingScoresheetSourceType: "local",
        linkageState: "shared_linked",
      });
      expect(scoresheetStatsB[0]).toMatchObject({
        type: "shared",
        sharedId: sharedForB.sharedGameScoresheetId,
        analyticsGroupingScoresheetSourceType: "shared",
        linkageState: "shared_unlinked",
      });
      expect(scoresheetStatsA[0]?.analyticsGroupingKey).toBe(
        `local:${String(recipientALocal.scoresheetId)}`,
      );
      expect(scoresheetStatsB[0]?.analyticsGroupingKey).toBe(
        `shared:${String(sharedForB.sharedGameScoresheetId)}`,
      );
    });

    test("preserves mixed linked and unlinked rounds within one shared scoresheet family", async () => {
      const ownerCaller = await createAuthenticatedCaller(
        ownerLifecycle.userId,
      );
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );

      const ownerFixture = await createGameWithAnalyticsScoresheet(
        ownerCaller,
        {
          gameName: "Shared Partial Round Game",
        },
      );
      const ownerMatch = await createFinishedMatchForScoresheet(ownerCaller, {
        gameId: ownerFixture.gameId,
        scoresheetId: ownerFixture.scoresheetId,
        matchName: "Shared Partial Round Match",
      });
      const recipientFixture = await createGameWithAnalyticsScoresheet(
        recipientCaller,
        {
          gameName: "Recipient Partial Linked Game",
          scoresheetName: "Recipient Partial Sheet",
        },
      );

      const sharedFixture = await shareFinishedMatchAnalyticsWithRecipient({
        ownerUserId: ownerLifecycle.userId,
        recipientUserId: recipientLifecycle.userId,
        gameId: ownerFixture.gameId,
        gameScoresheetId: ownerFixture.scoresheetId,
        matchId: ownerMatch.matchId,
        matchScoresheetId: ownerMatch.matchScoresheetId,
        linkedGameId: recipientFixture.gameId,
      });

      const firstSharedRound = sharedFixture.sharedGameRounds[0];
      const secondSharedRound = sharedFixture.sharedGameRounds[1];
      const firstLocalRound = recipientFixture.rounds[0];

      expect(firstSharedRound).toBeDefined();
      expect(secondSharedRound).toBeDefined();
      expect(firstLocalRound).toBeDefined();

      await recipientCaller.game.linkSharedScoresheetAnalytics({
        sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        analyticsLinkedScoresheetId: recipientFixture.scoresheetId,
      });
      await recipientCaller.game.linkSharedRoundsAnalytics({
        sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        links: [
          {
            sharedRoundId: firstSharedRound!.id,
            analyticsLinkedRoundId: firstLocalRound!.id,
          },
        ],
      });

      const linkState =
        await recipientCaller.game.getSharedScoresheetAnalyticsLinkState({
          sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        });
      const scoresheetStats = await recipientCaller.game.getGameScoresheetStats(
        {
          type: "shared",
          sharedGameId: sharedFixture.sharedGameId,
        },
      );

      expect(linkState.linkageState).toBe("shared_linked");
      expect(linkState.rounds).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sharedRoundId: firstSharedRound!.id,
            analyticsLinkedRoundId: firstLocalRound!.id,
            linkageState: "shared_linked",
          }),
          expect.objectContaining({
            sharedRoundId: secondSharedRound!.id,
            analyticsLinkedRoundId: null,
            linkageState: "shared_unlinked",
          }),
        ]),
      );

      const [family] = scoresheetStats;
      expect(family).toBeDefined();
      expect(family?.linkageState).toBe("shared_linked");

      const roundByName = new Map(
        family?.rounds.map((round) => [round.name, round]) ?? [],
      );
      expect(roundByName.get("Points")?.id).toBe(firstLocalRound!.id);
      expect(roundByName.get("Bonus")?.id).toBe(secondSharedRound!.id);
    });
  });
});
