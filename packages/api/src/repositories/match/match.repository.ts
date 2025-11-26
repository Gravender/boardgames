import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import {
  match,
  matchPlayer,
  scoresheet,
  sharedMatch,
} from "@board-games/db/schema";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import type {
  GetMatchOutputType,
  GetMatchScoresheetOutputType,
} from "../../routers/match/match.output";
import type {
  DeleteMatchArgs,
  GetMatchArgs,
  GetMatchPlayersAndTeamsArgs,
  GetMatchScoresheetArgs,
  InsertMatchInputType,
  InsertSharedMatchInputType,
  UpdateMatchArgs,
} from "./match.repository.types";
import { Logger } from "../../common/logger";

class MatchRepository {
  private readonly logger = new Logger(MatchRepository.name);
  public async insert(input: InsertMatchInputType, tx?: TransactionType) {
    const database = tx ?? db;
    const [returningMatch] = await database
      .insert(match)
      .values(input)
      .returning();
    return returningMatch;
  }
  public async insertSharedMatch(
    input: InsertSharedMatchInputType,
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const [returningMatch] = await database
      .insert(sharedMatch)
      .values(input)
      .returning();
    return returningMatch;
  }
  public async get<TConfig extends QueryConfig<"match">>(
    filters: {
      id: NonNullable<Filter<"match">["id"]>;
      createdBy: NonNullable<Filter<"match">["createdBy"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"match", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, createdBy, ...queryConfig } = filters;
    const result = await database.query.match.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        ...(queryConfig as unknown as TConfig).where,
        id,
        createdBy,
        deletedAt: { isNull: true },
      },
    });
    return result as InferQueryResult<"match", TConfig> | undefined;
  }
  public async getShared<TConfig extends QueryConfig<"sharedMatch">>(
    filters: {
      id: NonNullable<Filter<"sharedMatch">["id"]>;
      sharedWithId: NonNullable<Filter<"sharedMatch">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedMatch", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedMatch.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        ...(queryConfig as unknown as TConfig).where,
        id,
        sharedWithId,
      },
    });
    return result as InferQueryResult<"sharedMatch", TConfig> | undefined;
  }
  public async getMatch(args: GetMatchArgs): Promise<GetMatchOutputType> {
    const { input } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: args.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          location: true,
          game: {
            with: {
              image: true,
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match not found.",
        });
      }
      return {
        type: "original" as const,
        id: returnedMatch.id,
        date: returnedMatch.date,
        name: returnedMatch.name,
        game: {
          id: returnedMatch.gameId,
          type: "original" as const,
          image: returnedMatch.game.image,
          name: returnedMatch.game.name,
        },
        comment: returnedMatch.comment,
        duration: returnedMatch.duration,
        finished: returnedMatch.finished,
        running: returnedMatch.running,
        startTime: returnedMatch.startTime,
        location: returnedMatch.location
          ? {
              id: returnedMatch.location.id,
              name: returnedMatch.location.name,
              type: "original" as const,
            }
          : null,
      };
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.sharedMatchId,
          sharedWithId: args.userId,
        },
        with: {
          match: true,
          sharedGame: {
            with: {
              game: {
                with: {
                  image: true,
                },
              },
              linkedGame: { with: { image: true } },
            },
          },
          sharedLocation: {
            with: {
              location: true,
              linkedLocation: true,
            },
          },
        },
      });
      if (!returnedSharedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      }
      return {
        type: "shared" as const,
        id: returnedSharedMatch.matchId,
        sharedMatchId: returnedSharedMatch.id,
        permissions: returnedSharedMatch.permission,
        date: returnedSharedMatch.match.date,
        name: returnedSharedMatch.match.name,
        game: returnedSharedMatch.sharedGame.linkedGame
          ? {
              id: returnedSharedMatch.sharedGame.linkedGame.id,
              type: "linked" as const,
              image: returnedSharedMatch.sharedGame.linkedGame.image,
              name: returnedSharedMatch.sharedGame.linkedGame.name,
              sharedGameId: returnedSharedMatch.sharedGame.id,
              linkedGameId: returnedSharedMatch.sharedGame.linkedGameId,
            }
          : {
              id: returnedSharedMatch.sharedGame.game.id,
              type: "shared" as const,
              image: returnedSharedMatch.sharedGame.game.image,
              name: returnedSharedMatch.sharedGame.game.name,
              sharedGameId: returnedSharedMatch.sharedGame.id,
              linkedGameId: returnedSharedMatch.sharedGame.linkedGameId,
            },
        comment: returnedSharedMatch.match.comment,
        duration: returnedSharedMatch.match.duration,
        finished: returnedSharedMatch.match.finished,
        running: returnedSharedMatch.match.running,
        startTime: returnedSharedMatch.match.startTime,
        location: returnedSharedMatch.sharedLocation
          ? returnedSharedMatch.sharedLocation.linkedLocation
            ? {
                id: returnedSharedMatch.sharedLocation.linkedLocation.id,
                sharedId: returnedSharedMatch.sharedLocation.id,
                name: returnedSharedMatch.sharedLocation.linkedLocation.name,
                type: "linked" as const,
              }
            : {
                sharedId: returnedSharedMatch.sharedLocation.id,
                name: returnedSharedMatch.sharedLocation.location.name,
                type: "shared" as const,
              }
          : null,
      };
    }
  }
  public async getMatchScoresheet(
    args: GetMatchScoresheetArgs,
  ): Promise<GetMatchScoresheetOutputType> {
    const { input } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: args.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          scoresheet: {
            columns: {
              id: true,
              winCondition: true,
              targetScore: true,
              roundsScore: true,
              isCoop: true,
            },
            with: {
              rounds: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match not found.",
        });
      }
      return {
        id: returnedMatch.scoresheet.id,
        winCondition: returnedMatch.scoresheet.winCondition,
        targetScore: returnedMatch.scoresheet.targetScore,
        roundsScore: returnedMatch.scoresheet.roundsScore,
        isCoop: returnedMatch.scoresheet.isCoop,
        rounds: returnedMatch.scoresheet.rounds.map((round) => ({
          id: round.id,
          name: round.name,
          order: round.order,
          color: round.color,
          type: round.type,
          score: round.score,
        })),
      };
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.sharedMatchId,
          sharedWithId: args.userId,
        },
        with: {
          match: {
            with: {
              scoresheet: {
                with: {
                  rounds: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!returnedSharedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      }
      return {
        id: returnedSharedMatch.match.scoresheet.id,
        winCondition: returnedSharedMatch.match.scoresheet.winCondition,
        targetScore: returnedSharedMatch.match.scoresheet.targetScore,
        roundsScore: returnedSharedMatch.match.scoresheet.roundsScore,
        isCoop: returnedSharedMatch.match.scoresheet.isCoop,
        rounds: returnedSharedMatch.match.scoresheet.rounds.map((round) => ({
          id: round.id,
          name: round.name,
          order: round.order,
          color: round.color,
          type: round.type,
          score: round.score,
        })),
      };
    }
  }
  public async getMatchPlayersAndTeams(args: GetMatchPlayersAndTeamsArgs) {
    const { input } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: args.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          matchPlayers: {
            with: {
              player: {
                with: {
                  image: true,
                },
              },
              playerRounds: true,
              roles: true,
            },
            orderBy: {
              order: "asc",
            },
          },
          teams: true,
          scoresheet: {
            with: {
              rounds: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match not found.",
        });
      }
      return {
        type: "original" as const,
        teams: returnedMatch.teams,
        players: returnedMatch.matchPlayers,
        scoresheet: returnedMatch.scoresheet,
      };
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.sharedMatchId,
          sharedWithId: args.userId,
        },
        with: {
          match: {
            with: {
              teams: true,
              scoresheet: {
                with: {
                  rounds: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
              },
            },
          },
          sharedMatchPlayers: {
            with: {
              roles: {
                with: {
                  sharedGameRole: {
                    with: {
                      gameRole: true,
                      linkedGameRole: true,
                    },
                  },
                },
              },
              matchPlayer: {
                with: {
                  playerRounds: true,
                  player: {
                    with: {
                      image: true,
                    },
                  },
                  roles: true,
                },
              },
              sharedPlayer: {
                with: {
                  linkedPlayer: {
                    with: {
                      image: true,
                    },
                  },
                  player: {
                    with: {
                      image: true,
                    },
                  },
                },
                where: {
                  sharedWithId: args.userId,
                },
              },
            },
          },
        },
      });
      if (!returnedSharedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      }
      return {
        type: "shared" as const,
        teams: returnedSharedMatch.match.teams,
        players: returnedSharedMatch.sharedMatchPlayers,
        scoresheet: returnedSharedMatch.match.scoresheet,
      };
    }
  }
  public async getMatchSummary(args: GetMatchArgs) {
    const { input } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: args.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          location: true,
          game: true,
          scoresheet: true,
          matchPlayers: {
            with: {
              player: true,
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match not found.",
        });
      }
      const matchesWithSameScoresheet = db
        .$with("matches_with_same_scoresheet")
        .as(
          db
            .select({ matchId: vMatchCanonical.matchId })
            .from(vMatchCanonical)
            .innerJoin(
              scoresheet,
              eq(vMatchCanonical.canonicalScoresheetId, scoresheet.id),
            )
            .where(
              and(
                eq(scoresheet.parentId, returnedMatch.scoresheet.parentId ?? 0),
                eq(vMatchCanonical.finished, true),
                eq(vMatchCanonical.visibleToUserId, args.userId),
              ),
            )
            .groupBy(vMatchCanonical.matchId),
        );
      const firstMatchPerPlayer = db.$with("first_match_per_player").as(
        db
          .selectDistinctOn([vMatchPlayerCanonicalForUser.canonicalPlayerId], {
            canonicalPlayerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
            firstMatchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
          })
          .from(vMatchPlayerCanonicalForUser)
          .innerJoin(
            match,
            eq(match.id, vMatchPlayerCanonicalForUser.canonicalMatchId),
          )
          .where(
            or(
              eq(vMatchPlayerCanonicalForUser.ownerId, args.userId),
              eq(vMatchPlayerCanonicalForUser.sharedWithId, args.userId),
            ),
          )
          // earliest by date, then by id for tie-breaking
          .orderBy(
            vMatchPlayerCanonicalForUser.canonicalPlayerId,
            asc(match.date),
            asc(vMatchPlayerCanonicalForUser.canonicalMatchId),
          ),
      );
      const matchPlayersResults = await db
        .with(matchesWithSameScoresheet, firstMatchPerPlayer)
        .selectDistinctOn([vMatchPlayerCanonicalForUser.baseMatchPlayerId], {
          id: vMatchPlayerCanonicalForUser.baseMatchPlayerId,
          score: vMatchPlayerCanonicalForUser.score,
          placement: vMatchPlayerCanonicalForUser.placement,
          winner: vMatchPlayerCanonicalForUser.winner,
          teamId: vMatchPlayerCanonicalForUser.teamId,
          sourceType: vMatchPlayerCanonicalForUser.sourceType,
          canonicalPlayerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
          isFirstMatchForCurrent: sql<boolean>`${firstMatchPerPlayer.firstMatchId} = ${returnedMatch.id}`,
        })
        .from(vMatchPlayerCanonicalForUser)
        .innerJoin(
          matchesWithSameScoresheet,
          eq(
            vMatchPlayerCanonicalForUser.canonicalMatchId,
            matchesWithSameScoresheet.matchId,
          ),
        )
        .innerJoin(
          firstMatchPerPlayer,
          eq(
            firstMatchPerPlayer.canonicalPlayerId,
            vMatchPlayerCanonicalForUser.canonicalPlayerId,
          ),
        )
        .where(
          and(
            or(
              eq(vMatchPlayerCanonicalForUser.ownerId, args.userId),
              eq(vMatchPlayerCanonicalForUser.sharedWithId, args.userId),
            ),
            inArray(
              vMatchPlayerCanonicalForUser.canonicalPlayerId,
              returnedMatch.matchPlayers.map((mp) => mp.playerId),
            ),
          ),
        );
      return {
        scoresheet: returnedMatch.scoresheet,
        players: returnedMatch.matchPlayers.map((mp) => ({
          id: mp.id,
          playerId: mp.playerId,
          name: mp.player.name,
          playerType: "original" as const,
          type: "original" as const,
        })),
        matchPlayers: matchPlayersResults,
      };
    }

    const returnedSharedMatch = await db.query.sharedMatch.findFirst({
      where: {
        id: input.sharedMatchId,
        sharedWithId: args.userId,
      },
      with: {
        sharedMatchPlayers: {
          with: {
            sharedPlayer: {
              with: {
                player: true,
                linkedPlayer: true,
              },
            },
          },
        },
        sharedScoresheet: {
          with: {
            linkedScoresheet: true,
            scoresheet: true,
          },
        },
      },
    });
    if (!returnedSharedMatch) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shared match not found.",
      });
    }
    const parentScoresheet =
      returnedSharedMatch.sharedScoresheet.linkedScoresheet ??
      returnedSharedMatch.sharedScoresheet.scoresheet;
    const matchesWithSameScoresheet = db
      .$with("matches_with_same_scoresheet")
      .as(
        db
          .select({ matchId: vMatchCanonical.matchId })
          .from(vMatchCanonical)
          .innerJoin(
            scoresheet,
            eq(vMatchCanonical.canonicalScoresheetId, scoresheet.id),
          )
          .where(
            and(
              eq(scoresheet.parentId, parentScoresheet.parentId ?? 0),
              eq(vMatchCanonical.finished, true),
              eq(vMatchCanonical.visibleToUserId, args.userId),
            ),
          )
          .groupBy(vMatchCanonical.matchId),
      );
    const firstMatchPerPlayer = db.$with("first_match_per_player").as(
      db
        .selectDistinctOn([vMatchPlayerCanonicalForUser.canonicalPlayerId], {
          canonicalPlayerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
          firstMatchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
        })
        .from(vMatchPlayerCanonicalForUser)
        .innerJoin(
          match,
          eq(match.id, vMatchPlayerCanonicalForUser.canonicalMatchId),
        )
        .where(
          or(
            eq(vMatchPlayerCanonicalForUser.ownerId, args.userId),
            eq(vMatchPlayerCanonicalForUser.sharedWithId, args.userId),
          ),
        )
        // earliest by date, then by id for tie-breaking
        .orderBy(
          vMatchPlayerCanonicalForUser.canonicalPlayerId,
          asc(match.date),
          asc(vMatchPlayerCanonicalForUser.canonicalMatchId),
        ),
    );
    const matchPlayersResults = await db
      .with(matchesWithSameScoresheet, firstMatchPerPlayer)
      .selectDistinctOn([vMatchPlayerCanonicalForUser.baseMatchPlayerId], {
        id: vMatchPlayerCanonicalForUser.baseMatchPlayerId,
        score: vMatchPlayerCanonicalForUser.score,
        placement: vMatchPlayerCanonicalForUser.placement,
        winner: vMatchPlayerCanonicalForUser.winner,
        teamId: vMatchPlayerCanonicalForUser.teamId,
        sourceType: vMatchPlayerCanonicalForUser.sourceType,
        canonicalPlayerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
        isFirstMatchForCurrent: sql<boolean>`${firstMatchPerPlayer.firstMatchId} = ${returnedSharedMatch.matchId}`,
      })
      .from(vMatchPlayerCanonicalForUser)
      .innerJoin(
        matchesWithSameScoresheet,
        eq(
          vMatchPlayerCanonicalForUser.canonicalMatchId,
          matchesWithSameScoresheet.matchId,
        ),
      )
      .innerJoin(
        firstMatchPerPlayer,
        eq(
          firstMatchPerPlayer.canonicalPlayerId,
          vMatchPlayerCanonicalForUser.canonicalPlayerId,
        ),
      )
      .where(
        and(
          or(
            eq(vMatchPlayerCanonicalForUser.ownerId, args.userId),
            eq(vMatchPlayerCanonicalForUser.sharedWithId, args.userId),
          ),
          inArray(
            vMatchPlayerCanonicalForUser.canonicalPlayerId,
            returnedSharedMatch.sharedMatchPlayers.map(
              (smp) =>
                smp.sharedPlayer?.linkedPlayerId ??
                smp.sharedPlayer?.playerId ??
                0,
            ),
          ),
        ),
      );
    return {
      scoresheet: parentScoresheet,
      players: returnedSharedMatch.sharedMatchPlayers
        .map((smp) => {
          const sharedPlayer = smp.sharedPlayer;
          if (sharedPlayer === null) return null;
          const linkedPlayer = sharedPlayer.linkedPlayer;
          if (linkedPlayer)
            return {
              id: smp.matchPlayerId,
              playerId: linkedPlayer.id,
              name: linkedPlayer.name,
              playerType: "original" as const,
              type: "shared" as const,
            };
          return {
            id: smp.matchPlayerId,
            playerId: sharedPlayer.playerId,
            name: sharedPlayer.player.name,
            playerType: "shared" as const,
            type: "shared" as const,
          };
        })
        .filter((player) => player !== null),
      matchPlayers: matchPlayersResults,
    };
  }
  public async deleteMatch(args: DeleteMatchArgs) {
    const { input } = args;

    const returnedMatch = await db.query.match.findFirst({
      where: {
        id: input.id,
        createdBy: args.userId,
      },
    });
    if (!returnedMatch)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Match not found.",
      });
    await db
      .update(matchPlayer)
      .set({ deletedAt: new Date() })
      .where(eq(matchPlayer.matchId, returnedMatch.id));
    await db
      .update(match)
      .set({ deletedAt: new Date() })
      .where(eq(match.id, returnedMatch.id));
    await db
      .update(scoresheet)
      .set({ deletedAt: new Date() })
      .where(eq(scoresheet.id, returnedMatch.scoresheetId));
  }

  public async unfinishedMatch(args: {
    input: {
      matchId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedMatch] = await database
      .update(match)
      .set({ finished: false })
      .where(eq(match.id, input.matchId))
      .returning();
    return returnedMatch;
  }

  public async updateMatch(args: UpdateMatchArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedMatch] = await database
      .update(match)
      .set({
        name: input.name,
        date: input.date,
        locationId: input.locationId,
      })
      .where(eq(match.id, input.id))
      .returning();
    return returnedMatch;
  }
}
export const matchRepository = new MatchRepository();
