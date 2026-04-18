import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import { eq } from "drizzle-orm";
import { db } from "@board-games/db/client";
import { sharedRound, sharedScoresheet } from "@board-games/db/schema";

import {
  createFinishedMatchForScoresheet,
  createGameWithAnalyticsScoresheet,
  getLocalOriginalScoresheetsForUser,
  getMatchById,
  getSharedScoresheetById,
  shareFinishedMatchAnalyticsWithRecipient,
} from "../game/game.analytics-test-fixtures";
import {
  createAuthenticatedCaller,
  createPlayers,
  matchTestLifecycle,
} from "./match-test-fixtures";

describe("Match creation from shared scoresheets seeds analytics linkage", () => {
  const ownerLifecycle = matchTestLifecycle();
  const recipientLifecycle = matchTestLifecycle();

  beforeAll(async () => {
    await ownerLifecycle.deleteTestUser();
    await recipientLifecycle.deleteTestUser();
  });

  afterAll(async () => {
    await ownerLifecycle.deleteTestUser();
    await recipientLifecycle.deleteTestUser();
  });

  beforeEach(async () => {
    await ownerLifecycle.createTestUser();
    await recipientLifecycle.createTestUser();
  });

  afterEach(async () => {
    await ownerLifecycle.deleteTestUser();
    await recipientLifecycle.deleteTestUser();
  });

  const createRecipientSharedMatch = async (options: {
    recipientUserId: string;
    sharedGameId: number;
    sharedScoresheetId: number;
    matchName: string;
  }) => {
    const recipientCaller = await createAuthenticatedCaller(
      options.recipientUserId,
    );
    const players = await createPlayers(
      recipientCaller,
      2,
      `${options.matchName} Player`,
    );

    return recipientCaller.match.createMatch({
      name: options.matchName,
      date: new Date("2026-03-12T12:00:00.000Z"),
      game: { type: "shared", sharedGameId: options.sharedGameId },
      scoresheet: { type: "shared", sharedId: options.sharedScoresheetId },
      players: players.map((player) => ({
        type: "original" as const,
        id: player.id,
        roles: [],
        teamId: null,
      })),
      teams: [],
      location: null,
    });
  };

  test("materializes a local original and analytics-links it on first shared create", async () => {
    const ownerCaller = await createAuthenticatedCaller(ownerLifecycle.userId);

    const ownerFixture = await createGameWithAnalyticsScoresheet(ownerCaller, {
      gameName: "Shared Create Source Game",
    });
    const ownerMatch = await createFinishedMatchForScoresheet(ownerCaller, {
      gameId: ownerFixture.gameId,
      scoresheetId: ownerFixture.scoresheetId,
      matchName: "Shared Create Source Match",
    });

    const sharedFixture = await shareFinishedMatchAnalyticsWithRecipient({
      ownerUserId: ownerLifecycle.userId,
      recipientUserId: recipientLifecycle.userId,
      gameId: ownerFixture.gameId,
      gameScoresheetId: ownerFixture.scoresheetId,
      matchId: ownerMatch.matchId,
      matchScoresheetId: ownerMatch.matchScoresheetId,
    });

    const createdMatch = await createRecipientSharedMatch({
      recipientUserId: recipientLifecycle.userId,
      sharedGameId: sharedFixture.sharedGameId,
      sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
      matchName: "Recipient First Shared Match",
    });

    const sharedGameRow = await db.query.sharedGame.findFirst({
      where: {
        id: sharedFixture.sharedGameId,
      },
    });
    const linkedGameId = sharedGameRow?.linkedGameId ?? null;

    expect(linkedGameId).not.toBeNull();

    const localOriginals = await getLocalOriginalScoresheetsForUser({
      userId: recipientLifecycle.userId,
      gameId: linkedGameId!,
    });
    expect(localOriginals).toHaveLength(1);

    const [localOriginal] = localOriginals;
    expect(localOriginal).toMatchObject({
      type: "Game",
      forkedFromScoresheetId: ownerFixture.scoresheetId,
      forkedFromSharedScoresheetId: sharedFixture.sharedGameScoresheetId,
    });

    const sharedScoresheetRow = await getSharedScoresheetById(
      sharedFixture.sharedGameScoresheetId,
    );
    expect(sharedScoresheetRow).toMatchObject({
      id: sharedFixture.sharedGameScoresheetId,
      analyticsLinkedScoresheetId: localOriginal?.id,
      linkedScoresheetId: localOriginal?.id,
    });

    expect(sharedScoresheetRow?.sharedRounds).toHaveLength(
      localOriginal?.rounds.length ?? 0,
    );
    sharedScoresheetRow?.sharedRounds.forEach((sharedRoundRow, index) => {
      expect(sharedRoundRow.analyticsLinkedRoundId).toBe(
        localOriginal?.rounds[index]?.id,
      );
      expect(sharedRoundRow.linkedRoundId).toBe(
        localOriginal?.rounds[index]?.id,
      );
    });

    const createdMatchRow = await getMatchById(createdMatch.id);
    expect(createdMatchRow).toBeDefined();

    const matchScoresheetRow = await db.query.scoresheet.findFirst({
      where: {
        id: createdMatchRow!.scoresheetId,
      },
    });

    expect(matchScoresheetRow).toMatchObject({
      type: "Match",
      parentId: localOriginal?.id,
      forkedFromScoresheetId: localOriginal?.id,
    });
  });

  test("reuses the same materialized local original across concurrent shared creates", async () => {
    const ownerCaller = await createAuthenticatedCaller(ownerLifecycle.userId);

    const ownerFixture = await createGameWithAnalyticsScoresheet(ownerCaller, {
      gameName: "Shared Reuse Source Game",
    });
    const ownerMatch = await createFinishedMatchForScoresheet(ownerCaller, {
      gameId: ownerFixture.gameId,
      scoresheetId: ownerFixture.scoresheetId,
      matchName: "Shared Reuse Source Match",
    });

    const sharedFixture = await shareFinishedMatchAnalyticsWithRecipient({
      ownerUserId: ownerLifecycle.userId,
      recipientUserId: recipientLifecycle.userId,
      gameId: ownerFixture.gameId,
      gameScoresheetId: ownerFixture.scoresheetId,
      matchId: ownerMatch.matchId,
      matchScoresheetId: ownerMatch.matchScoresheetId,
    });

    const [firstMatch, secondMatch] = await Promise.all([
      createRecipientSharedMatch({
        recipientUserId: recipientLifecycle.userId,
        sharedGameId: sharedFixture.sharedGameId,
        sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        matchName: "Recipient Reuse Shared Match One",
      }),
      createRecipientSharedMatch({
        recipientUserId: recipientLifecycle.userId,
        sharedGameId: sharedFixture.sharedGameId,
        sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        matchName: "Recipient Reuse Shared Match Two",
      }),
    ]);

    const sharedGameRow = await db.query.sharedGame.findFirst({
      where: {
        id: sharedFixture.sharedGameId,
      },
    });

    const localOriginals = await getLocalOriginalScoresheetsForUser({
      userId: recipientLifecycle.userId,
      gameId: sharedGameRow!.linkedGameId!,
    });

    expect(localOriginals).toHaveLength(1);

    const [localOriginal] = localOriginals;
    const firstMatchRow = await getMatchById(firstMatch.id);
    const secondMatchRow = await getMatchById(secondMatch.id);

    const firstMatchScoresheet = await db.query.scoresheet.findFirst({
      where: {
        id: firstMatchRow!.scoresheetId,
      },
    });
    const secondMatchScoresheet = await db.query.scoresheet.findFirst({
      where: {
        id: secondMatchRow!.scoresheetId,
      },
    });

    expect(firstMatchScoresheet?.parentId).toBe(localOriginal?.id);
    expect(secondMatchScoresheet?.parentId).toBe(localOriginal?.id);

    const sharedScoresheetRow = await getSharedScoresheetById(
      sharedFixture.sharedGameScoresheetId,
    );
    expect(sharedScoresheetRow?.analyticsLinkedScoresheetId).toBe(
      localOriginal?.id,
    );
  });

  test("rejects a shared scoresheet that does not belong to the selected shared game", async () => {
    const ownerCaller = await createAuthenticatedCaller(ownerLifecycle.userId);
    const recipientCaller = await createAuthenticatedCaller(
      recipientLifecycle.userId,
    );

    const firstFixture = await createGameWithAnalyticsScoresheet(ownerCaller, {
      gameName: "Scoped Shared Game One",
    });
    const firstMatch = await createFinishedMatchForScoresheet(ownerCaller, {
      gameId: firstFixture.gameId,
      scoresheetId: firstFixture.scoresheetId,
      matchName: "Scoped Shared Match One",
    });
    const secondFixture = await createGameWithAnalyticsScoresheet(ownerCaller, {
      gameName: "Scoped Shared Game Two",
    });
    const secondMatch = await createFinishedMatchForScoresheet(ownerCaller, {
      gameId: secondFixture.gameId,
      scoresheetId: secondFixture.scoresheetId,
      matchName: "Scoped Shared Match Two",
    });

    const sharedFixtureOne = await shareFinishedMatchAnalyticsWithRecipient({
      ownerUserId: ownerLifecycle.userId,
      recipientUserId: recipientLifecycle.userId,
      gameId: firstFixture.gameId,
      gameScoresheetId: firstFixture.scoresheetId,
      matchId: firstMatch.matchId,
      matchScoresheetId: firstMatch.matchScoresheetId,
    });
    const sharedFixtureTwo = await shareFinishedMatchAnalyticsWithRecipient({
      ownerUserId: ownerLifecycle.userId,
      recipientUserId: recipientLifecycle.userId,
      gameId: secondFixture.gameId,
      gameScoresheetId: secondFixture.scoresheetId,
      matchId: secondMatch.matchId,
      matchScoresheetId: secondMatch.matchScoresheetId,
    });

    const createdPlayers = await createPlayers(
      recipientCaller,
      2,
      "Scoped Shared Player",
    );

    await expect(
      recipientCaller.match.createMatch({
        name: "Scoped Shared Mismatch",
        date: new Date("2026-03-14T12:00:00.000Z"),
        game: { type: "shared", sharedGameId: sharedFixtureOne.sharedGameId },
        scoresheet: {
          type: "shared",
          sharedId: sharedFixtureTwo.sharedGameScoresheetId,
        },
        players: createdPlayers.map((player) => ({
          type: "original" as const,
          id: player.id,
          roles: [],
          teamId: null,
        })),
        teams: [],
        location: null,
      }),
    ).rejects.toThrow("Shared scoresheet not found. For Create Match");
  });

  test("promotes a legacy materialized copy into analytics linkage without duplicating it", async () => {
    const ownerCaller = await createAuthenticatedCaller(ownerLifecycle.userId);
    const recipientCaller = await createAuthenticatedCaller(
      recipientLifecycle.userId,
    );

    const ownerFixture = await createGameWithAnalyticsScoresheet(ownerCaller, {
      gameName: "Legacy Promotion Source Game",
    });
    const ownerMatch = await createFinishedMatchForScoresheet(ownerCaller, {
      gameId: ownerFixture.gameId,
      scoresheetId: ownerFixture.scoresheetId,
      matchName: "Legacy Promotion Source Match",
    });
    const recipientFixture = await createGameWithAnalyticsScoresheet(
      recipientCaller,
      {
        gameName: "Recipient Legacy Local Game",
        scoresheetName: "Recipient Legacy Local Sheet",
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

    await db
      .update(sharedScoresheet)
      .set({
        linkedScoresheetId: recipientFixture.scoresheetId,
        analyticsLinkedScoresheetId: null,
      })
      .where(eq(sharedScoresheet.id, sharedFixture.sharedGameScoresheetId));

    for (const [
      index,
      sharedRoundRow,
    ] of sharedFixture.sharedGameRounds.entries()) {
      await db
        .update(sharedRound)
        .set({
          linkedRoundId: recipientFixture.rounds[index]!.id,
          analyticsLinkedRoundId: null,
        })
        .where(eq(sharedRound.id, sharedRoundRow.id));
    }

    const createdMatch = await createRecipientSharedMatch({
      recipientUserId: recipientLifecycle.userId,
      sharedGameId: sharedFixture.sharedGameId,
      sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
      matchName: "Recipient Legacy Promotion Match",
    });

    const localOriginals = await getLocalOriginalScoresheetsForUser({
      userId: recipientLifecycle.userId,
      gameId: recipientFixture.gameId,
    });

    expect(localOriginals).toHaveLength(1);
    expect(localOriginals[0]).toMatchObject({
      id: recipientFixture.scoresheetId,
      forkedFromSharedScoresheetId: sharedFixture.sharedGameScoresheetId,
    });

    const sharedScoresheetRow = await getSharedScoresheetById(
      sharedFixture.sharedGameScoresheetId,
    );
    expect(sharedScoresheetRow).toMatchObject({
      analyticsLinkedScoresheetId: recipientFixture.scoresheetId,
      linkedScoresheetId: recipientFixture.scoresheetId,
    });
    sharedScoresheetRow?.sharedRounds.forEach((sharedRoundRow, index) => {
      expect(sharedRoundRow.analyticsLinkedRoundId).toBe(
        recipientFixture.rounds[index]?.id,
      );
      expect(sharedRoundRow.linkedRoundId).toBe(
        recipientFixture.rounds[index]?.id,
      );
    });

    const createdMatchRow = await getMatchById(createdMatch.id);
    const matchScoresheetRow = await db.query.scoresheet.findFirst({
      where: {
        id: createdMatchRow!.scoresheetId,
      },
    });

    expect(matchScoresheetRow?.parentId).toBe(recipientFixture.scoresheetId);
  });
});
