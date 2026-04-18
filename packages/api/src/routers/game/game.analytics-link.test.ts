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
  gameTestLifecycle,
} from "./game-test-fixtures";

describe("Game analytics link router integration", () => {
  const ownerLifecycle = gameTestLifecycle();
  const recipientLifecycle = gameTestLifecycle();
  const thirdUserLifecycle = gameTestLifecycle();

  beforeAll(async () => {
    await ownerLifecycle.deleteTestUser();
    await recipientLifecycle.deleteTestUser();
    await thirdUserLifecycle.deleteTestUser();
  });

  afterAll(async () => {
    await ownerLifecycle.deleteTestUser();
    await recipientLifecycle.deleteTestUser();
    await thirdUserLifecycle.deleteTestUser();
  });

  beforeEach(async () => {
    await ownerLifecycle.createTestUser();
    await recipientLifecycle.createTestUser();
    await thirdUserLifecycle.createTestUser();
  });

  afterEach(async () => {
    await ownerLifecycle.deleteTestUser();
    await recipientLifecycle.deleteTestUser();
    await thirdUserLifecycle.deleteTestUser();
  });

  const createSharedFixture = async () => {
    const ownerCaller = await createAuthenticatedCaller(ownerLifecycle.userId);

    const ownerFixture = await createGameWithAnalyticsScoresheet(ownerCaller, {
      gameName: "Analytics Link Source Game",
    });
    const ownerMatch = await createFinishedMatchForScoresheet(ownerCaller, {
      gameId: ownerFixture.gameId,
      scoresheetId: ownerFixture.scoresheetId,
      matchName: "Analytics Link Source Match",
    });

    const sharedFixture = await shareFinishedMatchAnalyticsWithRecipient({
      ownerUserId: ownerLifecycle.userId,
      recipientUserId: recipientLifecycle.userId,
      gameId: ownerFixture.gameId,
      gameScoresheetId: ownerFixture.scoresheetId,
      matchId: ownerMatch.matchId,
      matchScoresheetId: ownerMatch.matchScoresheetId,
    });

    return {
      ownerFixture,
      ownerMatch,
      sharedFixture,
    };
  };

  describe("getSharedScoresheetAnalyticsLinkState", () => {
    test("returns an unlinked scoresheet state by default", async () => {
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );
      const { sharedFixture } = await createSharedFixture();

      const result =
        await recipientCaller.game.getSharedScoresheetAnalyticsLinkState({
          sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        });

      expect(result).toMatchObject({
        sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        analyticsLinkedScoresheetId: null,
        legacyLinkedScoresheetId: null,
        linkageState: "shared_unlinked",
      });
      expect(result.rounds).toEqual(
        expect.arrayContaining(
          sharedFixture.sharedGameRounds.map((sharedRound) =>
            expect.objectContaining({
              sharedRoundId: sharedRound.id,
              analyticsLinkedRoundId: null,
              legacyLinkedRoundId: null,
              linkageState: "shared_unlinked",
            }),
          ),
        ),
      );
    });
  });

  describe("linkSharedScoresheetAnalytics", () => {
    test("updates only the analytics link target", async () => {
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );
      const recipientFixture = await createGameWithAnalyticsScoresheet(
        recipientCaller,
        {
          gameName: "Recipient Link Target Game",
          scoresheetName: "Recipient Link Target Sheet",
        },
      );
      const { sharedFixture } = await createSharedFixture();

      await recipientCaller.game.linkSharedScoresheetAnalytics({
        sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        analyticsLinkedScoresheetId: recipientFixture.scoresheetId,
      });

      const result =
        await recipientCaller.game.getSharedScoresheetAnalyticsLinkState({
          sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        });

      expect(result).toMatchObject({
        sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        analyticsLinkedScoresheetId: recipientFixture.scoresheetId,
        legacyLinkedScoresheetId: null,
        linkageState: "shared_linked",
      });
    });

    test("rejects a non-recipient user", async () => {
      const thirdUserCaller = await createAuthenticatedCaller(
        thirdUserLifecycle.userId,
      );
      const { sharedFixture } = await createSharedFixture();

      await expect(
        thirdUserCaller.game.linkSharedScoresheetAnalytics({
          sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
          analyticsLinkedScoresheetId: null,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    test("rejects a local scoresheet from the wrong linked game", async () => {
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );
      const linkedGameFixture = await createGameWithAnalyticsScoresheet(
        recipientCaller,
        {
          gameName: "Recipient Linked Game",
          scoresheetName: "Recipient Linked Sheet",
        },
      );
      const wrongGameFixture = await createGameWithAnalyticsScoresheet(
        recipientCaller,
        {
          gameName: "Recipient Wrong Game",
          scoresheetName: "Recipient Wrong Sheet",
        },
      );
      const { ownerFixture, ownerMatch } = await createSharedFixture();
      const sharedFixture = await shareFinishedMatchAnalyticsWithRecipient({
        ownerUserId: ownerLifecycle.userId,
        recipientUserId: recipientLifecycle.userId,
        gameId: ownerFixture.gameId,
        gameScoresheetId: ownerFixture.scoresheetId,
        matchId: ownerMatch.matchId,
        matchScoresheetId: ownerMatch.matchScoresheetId,
        linkedGameId: linkedGameFixture.gameId,
      });

      await expect(
        recipientCaller.game.linkSharedScoresheetAnalytics({
          sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
          analyticsLinkedScoresheetId: wrongGameFixture.scoresheetId,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  describe("linkSharedRoundsAnalytics", () => {
    test("links shared rounds to rounds from the linked local scoresheet", async () => {
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );
      const recipientFixture = await createGameWithAnalyticsScoresheet(
        recipientCaller,
        {
          gameName: "Recipient Round Target Game",
          scoresheetName: "Recipient Round Target Sheet",
        },
      );
      const { ownerFixture, ownerMatch } = await createSharedFixture();
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

      const result =
        await recipientCaller.game.getSharedScoresheetAnalyticsLinkState({
          sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
        });

      expect(result.rounds).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sharedRoundId: sharedFixture.sharedGameRounds[0]?.id,
            analyticsLinkedRoundId: recipientFixture.rounds[0]?.id,
            linkageState: "shared_linked",
          }),
          expect.objectContaining({
            sharedRoundId: sharedFixture.sharedGameRounds[1]?.id,
            analyticsLinkedRoundId: recipientFixture.rounds[1]?.id,
            linkageState: "shared_linked",
          }),
        ]),
      );
    });

    test("rejects round linking before the shared scoresheet is linked", async () => {
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );
      const recipientFixture = await createGameWithAnalyticsScoresheet(
        recipientCaller,
        {
          gameName: "Recipient Unlinked Round Game",
          scoresheetName: "Recipient Unlinked Round Sheet",
        },
      );
      const { sharedFixture } = await createSharedFixture();

      await expect(
        recipientCaller.game.linkSharedRoundsAnalytics({
          sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
          links: [
            {
              sharedRoundId: sharedFixture.sharedGameRounds[0]!.id,
              analyticsLinkedRoundId: recipientFixture.rounds[0]!.id,
            },
          ],
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    test("rejects a shared round from another shared scoresheet", async () => {
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );
      const recipientFixture = await createGameWithAnalyticsScoresheet(
        recipientCaller,
        {
          gameName: "Recipient Foreign Shared Round Game",
          scoresheetName: "Recipient Foreign Shared Round Sheet",
        },
      );

      const firstFixture = await createSharedFixture();
      const secondFixture = await createSharedFixture();

      await recipientCaller.game.linkSharedScoresheetAnalytics({
        sharedScoresheetId: firstFixture.sharedFixture.sharedGameScoresheetId,
        analyticsLinkedScoresheetId: recipientFixture.scoresheetId,
      });

      await expect(
        recipientCaller.game.linkSharedRoundsAnalytics({
          sharedScoresheetId: firstFixture.sharedFixture.sharedGameScoresheetId,
          links: [
            {
              sharedRoundId:
                secondFixture.sharedFixture.sharedGameRounds[0]!.id,
              analyticsLinkedRoundId: recipientFixture.rounds[0]!.id,
            },
          ],
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    test("rejects a local round outside the linked local scoresheet", async () => {
      const recipientCaller = await createAuthenticatedCaller(
        recipientLifecycle.userId,
      );
      const recipientFixture = await createGameWithAnalyticsScoresheet(
        recipientCaller,
        {
          gameName: "Recipient Linked Round Parent Game",
          scoresheetName: "Recipient Linked Round Parent Sheet",
        },
      );
      const wrongRoundFixture = await createGameWithAnalyticsScoresheet(
        recipientCaller,
        {
          gameName: "Recipient Wrong Round Game",
          scoresheetName: "Recipient Wrong Round Sheet",
        },
      );
      const { ownerFixture, ownerMatch } = await createSharedFixture();
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

      await expect(
        recipientCaller.game.linkSharedRoundsAnalytics({
          sharedScoresheetId: sharedFixture.sharedGameScoresheetId,
          links: [
            {
              sharedRoundId: sharedFixture.sharedGameRounds[0]!.id,
              analyticsLinkedRoundId: wrongRoundFixture.rounds[0]!.id,
            },
          ],
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });
});
