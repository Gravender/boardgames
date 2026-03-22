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
  const ownerPlayer = await ownerCaller.player.create({
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

export const seedInsightsHistory = async (ids: InsightsUserIds) => {
  const { ownerCaller } = await createInsightsCallers(ids);
  const ownerTarget = await ownerCaller.player.create({
    name: "Owner Target",
    imageId: null,
  });
  const ownerRival = await ownerCaller.player.create({
    name: "Owner Rival",
    imageId: null,
  });
  const ownerTeammate = await ownerCaller.player.create({
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
