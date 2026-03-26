import { db } from "@board-games/db/client";
import {
  game,
  match,
  matchPlayer,
  scoresheet,
  sharedGame,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  sharedScoresheet,
  team,
} from "@board-games/db/schema";

import { createContextInner } from "../../../../context";
import { appRouter } from "../../../../root";
import type { TestCaller } from "../../../../test-fixtures";
import {
  createTestSession,
  createTestUser,
  deleteTestUser,
} from "../../../../test-helpers";
import { createCallerFactory } from "../../../../trpc";

export type InsightsUserIds = {
  ownerUserId: string;
  receiverUserId: string;
};

export const insertOne = async <T>(args: {
  promise: Promise<T[]>;
  message: string;
}): Promise<T> => {
  const [inserted] = await args.promise;
  if (!inserted) {
    throw new Error(args.message);
  }
  return inserted;
};

export const setupInsightsUsers = async (): Promise<InsightsUserIds> => {
  const owner = await createTestUser();
  const receiver = await createTestUser();
  return { ownerUserId: owner.id, receiverUserId: receiver.id };
};

export const teardownInsightsUsers = async (
  ids: InsightsUserIds | undefined,
): Promise<void> => {
  if (!ids) return;
  await deleteTestUser(ids.ownerUserId);
  await deleteTestUser(ids.receiverUserId);
};

export const createInsightsCallers = async (
  ids: InsightsUserIds,
): Promise<{ ownerCaller: TestCaller; receiverCaller: TestCaller }> => {
  const ownerCtx = await createContextInner({
    session: createTestSession(ids.ownerUserId),
  });
  const receiverCtx = await createContextInner({
    session: createTestSession(ids.receiverUserId),
  });
  return {
    ownerCaller: createCallerFactory(appRouter)(ownerCtx),
    receiverCaller: createCallerFactory(appRouter)(receiverCtx),
  };
};

export const createSharedPlayerFixture = async (ids: InsightsUserIds) => {
  const { ownerCaller } = await createInsightsCallers(ids);
  const ownerPlayer = await ownerCaller.newPlayer.create({
    name: "Shared Owner Player",
    imageId: null,
  });
  const insertedSharedPlayer = await insertOne({
    promise: db
      .insert(sharedPlayer)
      .values({
        ownerId: ids.ownerUserId,
        sharedWithId: ids.receiverUserId,
        playerId: ownerPlayer.id,
        permission: "view",
      })
      .returning(),
    message: "Failed to create shared player fixture.",
  });
  return {
    ownerPlayerId: ownerPlayer.id,
    sharedPlayerId: insertedSharedPlayer.id,
  };
};

export type SeedInsightsHistoryOptions = {
  /**
   * Extra copies of the competitive FFA match (same three players) so played-with cohorts
   * reach MIN_MATCHES_PER_COHORT_GROUP. Use `0` when tests need fewer than five
   * head-to-head games (e.g. top-rivals threshold).
   * @default 4
   */
  extraCompetitiveMatchCopies?: number;
};

export const seedInsightsHistory = async (
  ids: InsightsUserIds,
  options?: SeedInsightsHistoryOptions,
) => {
  const extraCopies = options?.extraCompetitiveMatchCopies ?? 4;
  const { ownerCaller } = await createInsightsCallers(ids);
  const ownerTarget = await ownerCaller.newPlayer.create({
    name: "Owner Target",
    imageId: null,
  });
  const ownerRival = await ownerCaller.newPlayer.create({
    name: "Owner Rival",
    imageId: null,
  });
  const ownerTeammate = await ownerCaller.newPlayer.create({
    name: "Owner Teammate",
    imageId: null,
  });

  const competitiveGame = await insertOne({
    promise: db
      .insert(game)
      .values({ name: "Insights Competitive Game", createdBy: ids.ownerUserId })
      .returning(),
    message: "Failed to create competitive game fixture.",
  });
  const coopGame = await insertOne({
    promise: db
      .insert(game)
      .values({ name: "Insights Coop Game", createdBy: ids.ownerUserId })
      .returning(),
    message: "Failed to create coop game fixture.",
  });

  const competitiveScoresheet = await insertOne({
    promise: db
      .insert(scoresheet)
      .values({
        name: "Insights Competitive Scoresheet",
        gameId: competitiveGame.id,
        createdBy: ids.ownerUserId,
        isCoop: false,
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        targetScore: 0,
        type: "Default",
      })
      .returning(),
    message: "Failed to create competitive scoresheet fixture.",
  });
  const coopScoresheet = await insertOne({
    promise: db
      .insert(scoresheet)
      .values({
        name: "Insights Coop Scoresheet",
        gameId: coopGame.id,
        createdBy: ids.ownerUserId,
        isCoop: true,
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        targetScore: 0,
        type: "Default",
      })
      .returning(),
    message: "Failed to create coop scoresheet fixture.",
  });

  const competitiveMatch = await insertOne({
    promise: db
      .insert(match)
      .values({
        name: "Insights Competitive Match",
        createdBy: ids.ownerUserId,
        gameId: competitiveGame.id,
        scoresheetId: competitiveScoresheet.id,
        date: new Date("2026-01-10T12:00:00.000Z"),
        finished: true,
        running: false,
        duration: 3600,
      })
      .returning(),
    message: "Failed to create competitive match fixture.",
  });
  const coopMatch = await insertOne({
    promise: db
      .insert(match)
      .values({
        name: "Insights Coop Match",
        createdBy: ids.ownerUserId,
        gameId: coopGame.id,
        scoresheetId: coopScoresheet.id,
        date: new Date("2026-02-15T12:00:00.000Z"),
        finished: true,
        running: false,
        duration: 2400,
      })
      .returning(),
    message: "Failed to create coop match fixture.",
  });

  const teamAlpha = await insertOne({
    promise: db
      .insert(team)
      .values({ matchId: coopMatch.id, name: "Alpha" })
      .returning(),
    message: "Failed to create team fixture.",
  });

  const targetCompetitiveMp = await insertOne({
    promise: db
      .insert(matchPlayer)
      .values({
        matchId: competitiveMatch.id,
        playerId: ownerTarget.id,
        winner: false,
        score: 12,
        placement: 2,
      })
      .returning(),
    message: "Failed to create target competitive match player fixture.",
  });
  const rivalCompetitiveMp = await insertOne({
    promise: db
      .insert(matchPlayer)
      .values({
        matchId: competitiveMatch.id,
        playerId: ownerRival.id,
        winner: true,
        score: 18,
        placement: 1,
      })
      .returning(),
    message: "Failed to create rival competitive match player fixture.",
  });
  const teammateCompetitiveMp = await insertOne({
    promise: db
      .insert(matchPlayer)
      .values({
        matchId: competitiveMatch.id,
        playerId: ownerTeammate.id,
        winner: false,
        score: 8,
        placement: 3,
      })
      .returning(),
    message: "Failed to create teammate competitive match player fixture.",
  });

  const targetCoopMp = await insertOne({
    promise: db
      .insert(matchPlayer)
      .values({
        matchId: coopMatch.id,
        playerId: ownerTarget.id,
        teamId: teamAlpha.id,
        winner: true,
        score: 22,
        placement: 1,
      })
      .returning(),
    message: "Failed to create target coop match player fixture.",
  });
  const teammateCoopMp = await insertOne({
    promise: db
      .insert(matchPlayer)
      .values({
        matchId: coopMatch.id,
        playerId: ownerTeammate.id,
        teamId: teamAlpha.id,
        winner: true,
        score: 21,
        placement: 1,
      })
      .returning(),
    message: "Failed to create teammate coop match player fixture.",
  });
  const rivalCoopMp = await insertOne({
    promise: db
      .insert(matchPlayer)
      .values({
        matchId: coopMatch.id,
        playerId: ownerRival.id,
        winner: false,
        score: 16,
        placement: 2,
      })
      .returning(),
    message: "Failed to create rival coop match player fixture.",
  });

  const targetSharedPlayer = await insertOne({
    promise: db
      .insert(sharedPlayer)
      .values({
        ownerId: ids.ownerUserId,
        sharedWithId: ids.receiverUserId,
        playerId: ownerTarget.id,
        permission: "view",
      })
      .returning(),
    message: "Failed to create target shared player fixture.",
  });
  const rivalSharedPlayer = await insertOne({
    promise: db
      .insert(sharedPlayer)
      .values({
        ownerId: ids.ownerUserId,
        sharedWithId: ids.receiverUserId,
        playerId: ownerRival.id,
        permission: "view",
      })
      .returning(),
    message: "Failed to create rival shared player fixture.",
  });
  const teammateSharedPlayer = await insertOne({
    promise: db
      .insert(sharedPlayer)
      .values({
        ownerId: ids.ownerUserId,
        sharedWithId: ids.receiverUserId,
        playerId: ownerTeammate.id,
        permission: "view",
      })
      .returning(),
    message: "Failed to create teammate shared player fixture.",
  });

  const competitiveSharedGame = await insertOne({
    promise: db
      .insert(sharedGame)
      .values({
        ownerId: ids.ownerUserId,
        sharedWithId: ids.receiverUserId,
        gameId: competitiveGame.id,
        permission: "view",
      })
      .returning(),
    message: "Failed to create competitive shared game fixture.",
  });
  const coopSharedGame = await insertOne({
    promise: db
      .insert(sharedGame)
      .values({
        ownerId: ids.ownerUserId,
        sharedWithId: ids.receiverUserId,
        gameId: coopGame.id,
        permission: "view",
      })
      .returning(),
    message: "Failed to create coop shared game fixture.",
  });

  const competitiveSharedScoresheet = await insertOne({
    promise: db
      .insert(sharedScoresheet)
      .values({
        ownerId: ids.ownerUserId,
        sharedWithId: ids.receiverUserId,
        scoresheetId: competitiveScoresheet.id,
        sharedGameId: competitiveSharedGame.id,
        type: "game",
        isDefault: true,
        permission: "view",
      })
      .returning(),
    message: "Failed to create competitive shared scoresheet fixture.",
  });
  const coopSharedScoresheet = await insertOne({
    promise: db
      .insert(sharedScoresheet)
      .values({
        ownerId: ids.ownerUserId,
        sharedWithId: ids.receiverUserId,
        scoresheetId: coopScoresheet.id,
        sharedGameId: coopSharedGame.id,
        type: "game",
        isDefault: true,
        permission: "view",
      })
      .returning(),
    message: "Failed to create coop shared scoresheet fixture.",
  });

  /** Same lineup repeated so played-with cohorts reach MIN_MATCHES_PER_COHORT_GROUP in insights. */
  type MatchPlayerRow = typeof targetCompetitiveMp;
  const extraCompetitiveSharedLinks: {
    sharedMatchId: number;
    mp: MatchPlayerRow;
  }[] = [];
  for (let extra = 0; extra < extraCopies; extra++) {
    const m = await insertOne({
      promise: db
        .insert(match)
        .values({
          name: `Insights Competitive Match Extra ${extra + 1}`,
          createdBy: ids.ownerUserId,
          gameId: competitiveGame.id,
          scoresheetId: competitiveScoresheet.id,
          date: new Date(Date.UTC(2026, 0, 11 + extra, 12, 0, 0)),
          finished: true,
          running: false,
          duration: 3600,
        })
        .returning(),
      message: "Failed to create extra competitive match fixture.",
    });
    const tMp = await insertOne({
      promise: db
        .insert(matchPlayer)
        .values({
          matchId: m.id,
          playerId: ownerTarget.id,
          winner: false,
          score: 12,
          placement: 2,
        })
        .returning(),
      message:
        "Failed to create extra target competitive match player fixture.",
    });
    const rMp = await insertOne({
      promise: db
        .insert(matchPlayer)
        .values({
          matchId: m.id,
          playerId: ownerRival.id,
          winner: true,
          score: 18,
          placement: 1,
        })
        .returning(),
      message: "Failed to create extra rival competitive match player fixture.",
    });
    const tmMp = await insertOne({
      promise: db
        .insert(matchPlayer)
        .values({
          matchId: m.id,
          playerId: ownerTeammate.id,
          winner: false,
          score: 8,
          placement: 3,
        })
        .returning(),
      message:
        "Failed to create extra teammate competitive match player fixture.",
    });
    const sm = await insertOne({
      promise: db
        .insert(sharedMatch)
        .values({
          ownerId: ids.ownerUserId,
          sharedWithId: ids.receiverUserId,
          matchId: m.id,
          sharedGameId: competitiveSharedGame.id,
          sharedScoresheetId: competitiveSharedScoresheet.id,
          permission: "view",
        })
        .returning(),
      message: "Failed to create extra competitive shared match fixture.",
    });
    extraCompetitiveSharedLinks.push(
      { sharedMatchId: sm.id, mp: tMp },
      { sharedMatchId: sm.id, mp: rMp },
      { sharedMatchId: sm.id, mp: tmMp },
    );
  }

  const competitiveSharedMatch = await insertOne({
    promise: db
      .insert(sharedMatch)
      .values({
        ownerId: ids.ownerUserId,
        sharedWithId: ids.receiverUserId,
        matchId: competitiveMatch.id,
        sharedGameId: competitiveSharedGame.id,
        sharedScoresheetId: competitiveSharedScoresheet.id,
        permission: "view",
      })
      .returning(),
    message: "Failed to create competitive shared match fixture.",
  });
  const coopSharedMatch = await insertOne({
    promise: db
      .insert(sharedMatch)
      .values({
        ownerId: ids.ownerUserId,
        sharedWithId: ids.receiverUserId,
        matchId: coopMatch.id,
        sharedGameId: coopSharedGame.id,
        sharedScoresheetId: coopSharedScoresheet.id,
        permission: "view",
      })
      .returning(),
    message: "Failed to create coop shared match fixture.",
  });

  const sharedPlayerByOwnerPlayerId = new Map<number, number>([
    [ownerTarget.id, targetSharedPlayer.id],
    [ownerRival.id, rivalSharedPlayer.id],
    [ownerTeammate.id, teammateSharedPlayer.id],
  ]);

  const sharedMatchLinks = [
    { sharedMatchId: competitiveSharedMatch.id, mp: targetCompetitiveMp },
    { sharedMatchId: competitiveSharedMatch.id, mp: rivalCompetitiveMp },
    { sharedMatchId: competitiveSharedMatch.id, mp: teammateCompetitiveMp },
    ...extraCompetitiveSharedLinks,
    { sharedMatchId: coopSharedMatch.id, mp: targetCoopMp },
    { sharedMatchId: coopSharedMatch.id, mp: rivalCoopMp },
    { sharedMatchId: coopSharedMatch.id, mp: teammateCoopMp },
  ];

  for (const link of sharedMatchLinks) {
    await db.insert(sharedMatchPlayer).values({
      ownerId: ids.ownerUserId,
      sharedWithId: ids.receiverUserId,
      matchPlayerId: link.mp.id,
      sharedMatchId: link.sharedMatchId,
      sharedPlayerId: sharedPlayerByOwnerPlayerId.get(link.mp.playerId) ?? null,
      permission: "view",
    });
  }

  return {
    ownerTargetPlayerId: ownerTarget.id,
    receiverSharedTargetPlayerId: targetSharedPlayer.id,
  };
};
