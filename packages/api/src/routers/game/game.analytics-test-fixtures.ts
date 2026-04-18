import type { inferProcedureInput } from "@trpc/server";

import { db } from "@board-games/db/client";
import {
  match,
  matchPlayer,
  player,
  round,
  scoresheet,
  sharedGame,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  sharedScoresheet,
} from "@board-games/db/schema";

import type { AppRouter } from "../../root";
import type { TestCaller } from "../../test-fixtures";
import { createSharedRoundsForScoresheet } from "../../utils/sharing";
import { createGameFull, createPlayers } from "./game-test-fixtures";

type SharePermission = "view" | "edit";

const assertInserted = <T>(
  value: T | undefined,
  message: string,
): NonNullable<T> => {
  if (!value) {
    throw new Error(message);
  }
  return value;
};

export const createGameWithAnalyticsScoresheet = async (
  caller: TestCaller,
  options?: {
    gameName?: string;
    scoresheetName?: string;
    isCoop?: boolean;
  },
) => {
  const {
    gameName = "Analytics Game",
    scoresheetName = "Analytics Sheet",
    isCoop = false,
  } = options ?? {};

  const { gameId, scoresheetId } = await createGameFull(caller, {
    gameName,
    scoresheets: [
      {
        scoresheet: {
          name: scoresheetName,
          winCondition: isCoop ? "Manual" : "Highest Score",
          roundsScore: "Aggregate",
          isCoop,
          targetScore: 0,
        },
        rounds: [
          { name: "Points", type: "Numeric", order: 1, score: 1 },
          { name: "Bonus", type: "Checkbox", order: 2, score: 1 },
        ],
      },
    ],
  });

  const scoresheetWithRounds = await db.query.scoresheet.findFirst({
    where: {
      id: scoresheetId,
      deletedAt: {
        isNull: true,
      },
    },
    with: {
      rounds: {
        where: {
          deletedAt: {
            isNull: true,
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  const insertedScoresheet = assertInserted(
    scoresheetWithRounds,
    "Analytics scoresheet fixture was not created.",
  );

  return {
    gameId,
    scoresheetId: insertedScoresheet.id,
    scoresheetName: insertedScoresheet.name,
    rounds: insertedScoresheet.rounds,
  };
};

export const createFinishedMatchForScoresheet = async (
  caller: TestCaller,
  options: {
    gameId: number;
    scoresheetId: number;
    matchName?: string;
    matchDate?: Date;
    playerCount?: number;
    playerPrefix?: string;
  },
) => {
  const {
    gameId,
    scoresheetId,
    matchName = "Analytics Match",
    matchDate = new Date("2026-03-01T12:00:00.000Z"),
    playerCount = 2,
    playerPrefix = "Analytics Player",
  } = options;

  const players = await createPlayers(caller, playerCount, playerPrefix);

  const matchInput: inferProcedureInput<AppRouter["match"]["createMatch"]> = {
    name: matchName,
    date: matchDate,
    game: { type: "original", id: gameId },
    scoresheet: { type: "original", id: scoresheetId },
    players: players.map((createdPlayer) => ({
      type: "original" as const,
      id: createdPlayer.id,
      roles: [],
      teamId: null,
    })),
    teams: [],
    location: null,
  };

  const createdMatch = await caller.match.createMatch(matchInput);

  const matchPlayersAndTeams = await caller.match.getMatchPlayersAndTeams({
    type: "original",
    id: createdMatch.id,
  });

  const winningPlayer = assertInserted(
    matchPlayersAndTeams.players[0],
    "Match fixture did not create match players.",
  );

  await caller.match.update.updateMatchManualWinner({
    match: { type: "original", id: createdMatch.id },
    winners: [{ id: winningPlayer.baseMatchPlayerId }],
  });

  const createdMatchRow = await db.query.match.findFirst({
    where: {
      id: createdMatch.id,
    },
  });

  const createdMatchRecord = assertInserted(
    createdMatchRow,
    "Match fixture record was not found after creation.",
  );

  const createdMatchPlayers = await db.query.matchPlayer.findMany({
    where: {
      matchId: createdMatch.id,
    },
    orderBy: {
      id: "asc",
    },
  });

  return {
    matchId: createdMatch.id,
    matchScoresheetId: createdMatchRecord.scoresheetId,
    players,
    matchPlayers: createdMatchPlayers,
  };
};

export const shareFinishedMatchAnalyticsWithRecipient = async (options: {
  ownerUserId: string;
  recipientUserId: string;
  gameId: number;
  gameScoresheetId: number;
  matchId: number;
  matchScoresheetId: number;
  permission?: SharePermission;
  linkedGameId?: number | null;
}) => {
  const {
    ownerUserId,
    recipientUserId,
    gameId,
    gameScoresheetId,
    matchId,
    matchScoresheetId,
    permission = "view",
    linkedGameId = null,
  } = options;

  const matchPlayersWithPlayer = await db.query.matchPlayer.findMany({
    where: {
      matchId,
    },
    with: {
      player: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  return db.transaction(async (tx) => {
    const [createdSharedGame] = await tx
      .insert(sharedGame)
      .values({
        ownerId: ownerUserId,
        sharedWithId: recipientUserId,
        gameId,
        linkedGameId,
        permission,
      })
      .returning();

    const sharedGameRow = assertInserted(
      createdSharedGame,
      "Shared game fixture was not created.",
    );

    const [createdGameSharedScoresheet] = await tx
      .insert(sharedScoresheet)
      .values({
        ownerId: ownerUserId,
        sharedWithId: recipientUserId,
        scoresheetId: gameScoresheetId,
        sharedGameId: sharedGameRow.id,
        permission,
        type: "game",
      })
      .returning();

    const sharedGameScoresheet = assertInserted(
      createdGameSharedScoresheet,
      "Game-level shared scoresheet fixture was not created.",
    );

    const gameScoresheetRounds = await tx.query.round.findMany({
      where: {
        scoresheetId: gameScoresheetId,
        deletedAt: {
          isNull: true,
        },
      },
      orderBy: {
        order: "asc",
      },
    });

    await createSharedRoundsForScoresheet(
      tx,
      gameScoresheetRounds,
      sharedGameScoresheet.id,
      ownerUserId,
      recipientUserId,
      permission,
    );

    const [createdMatchSharedScoresheet] = await tx
      .insert(sharedScoresheet)
      .values({
        ownerId: ownerUserId,
        sharedWithId: recipientUserId,
        scoresheetId: matchScoresheetId,
        sharedGameId: sharedGameRow.id,
        parentId: sharedGameScoresheet.id,
        permission,
        type: "match",
      })
      .returning();

    const sharedMatchScoresheet = assertInserted(
      createdMatchSharedScoresheet,
      "Match-level shared scoresheet fixture was not created.",
    );

    const insertedSharedPlayers = await Promise.all(
      matchPlayersWithPlayer.map(async (matchPlayerRow) => {
        const [createdSharedPlayer] = await tx
          .insert(sharedPlayer)
          .values({
            ownerId: ownerUserId,
            sharedWithId: recipientUserId,
            playerId: matchPlayerRow.playerId,
            permission,
          })
          .returning();

        return assertInserted(
          createdSharedPlayer,
          `Shared player fixture was not created for owner player ${String(matchPlayerRow.playerId)}.`,
        );
      }),
    );

    const sharedPlayerIdByPlayerId = new Map(
      insertedSharedPlayers.map((sharedPlayerRow) => [
        sharedPlayerRow.playerId,
        sharedPlayerRow.id,
      ]),
    );

    const [createdSharedMatch] = await tx
      .insert(sharedMatch)
      .values({
        ownerId: ownerUserId,
        sharedWithId: recipientUserId,
        matchId,
        sharedGameId: sharedGameRow.id,
        sharedScoresheetId: sharedMatchScoresheet.id,
        permission,
      })
      .returning();

    const sharedMatchRow = assertInserted(
      createdSharedMatch,
      "Shared match fixture was not created.",
    );

    const insertedSharedMatchPlayers = await Promise.all(
      matchPlayersWithPlayer.map(async (matchPlayerRow) => {
        const [createdSharedMatchPlayer] = await tx
          .insert(sharedMatchPlayer)
          .values({
            ownerId: ownerUserId,
            sharedWithId: recipientUserId,
            matchPlayerId: matchPlayerRow.id,
            sharedMatchId: sharedMatchRow.id,
            sharedPlayerId:
              sharedPlayerIdByPlayerId.get(matchPlayerRow.playerId) ?? null,
            permission,
          })
          .returning();

        return assertInserted(
          createdSharedMatchPlayer,
          `Shared match player fixture was not created for match player ${String(matchPlayerRow.id)}.`,
        );
      }),
    );

    const sharedGameRounds = await tx.query.sharedRound.findMany({
      where: {
        sharedScoresheetId: sharedGameScoresheet.id,
      },
      with: {
        round: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return {
      sharedGameId: sharedGameRow.id,
      sharedGameScoresheetId: sharedGameScoresheet.id,
      sharedGameRounds,
      sharedMatchId: sharedMatchRow.id,
      sharedMatchScoresheetId: sharedMatchScoresheet.id,
      sharedPlayers: insertedSharedPlayers,
      sharedMatchPlayers: insertedSharedMatchPlayers,
    };
  });
};

export const getScoresheetById = async (scoresheetId: number) => {
  return db.query.scoresheet.findFirst({
    where: {
      id: scoresheetId,
    },
    with: {
      rounds: {
        where: {
          deletedAt: {
            isNull: true,
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });
};

export const getSharedScoresheetById = async (sharedScoresheetId: number) => {
  return db.query.sharedScoresheet.findFirst({
    where: {
      id: sharedScoresheetId,
    },
    with: {
      sharedRounds: {
        with: {
          round: true,
        },
        orderBy: {
          id: "asc",
        },
      },
    },
  });
};

export const getMatchById = async (matchId: number) => {
  return db.query.match.findFirst({
    where: {
      id: matchId,
    },
  });
};

export const getLocalOriginalScoresheetsForUser = async (options: {
  userId: string;
  gameId: number;
}) => {
  return db.query.scoresheet.findMany({
    where: {
      createdBy: options.userId,
      gameId: options.gameId,
      deletedAt: {
        isNull: true,
      },
      type: {
        OR: [{ eq: "Game" }, { eq: "Default" }],
      },
    },
    with: {
      rounds: {
        where: {
          deletedAt: {
            isNull: true,
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });
};

export const getSharedMatchById = async (sharedMatchId: number) => {
  return db.query.sharedMatch.findFirst({
    where: {
      id: sharedMatchId,
    },
  });
};

export const getSharedPlayersForRecipient = async (options: {
  ownerUserId: string;
  recipientUserId: string;
}) => {
  return db.query.sharedPlayer.findMany({
    where: {
      ownerId: options.ownerUserId,
      sharedWithId: options.recipientUserId,
    },
    orderBy: {
      id: "asc",
    },
  });
};
