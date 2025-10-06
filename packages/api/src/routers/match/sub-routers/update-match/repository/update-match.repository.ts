import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { differenceInSeconds } from "date-fns";
import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { match, matchPlayer, roundPlayer, team } from "@board-games/db/schema";
import { vMatchPlayerCanonicalForUser } from "@board-games/db/views";
import { calculatePlacement } from "@board-games/shared";

import type {
  MatchPauseRepoArgs,
  MatchResetDurationRepoArgs,
  MatchStartRepoArgs,
  UpdateMatchCommentRepoArgs,
  UpdateMatchDetailsRepoArgs,
  UpdateMatchFinishRepoArgs,
  UpdateMatchManualWinnerRepoArgs,
  UpdateMatchPlacementsRepoArgs,
  UpdateMatchPlayerScoreRepoArgs,
  UpdateMatchRoundScoreRepoArgs,
} from "./update-match.repository.types";
import { Logger } from "~/common/logger";

class UpdateMatchRepository {
  private readonly logger = new Logger(UpdateMatchRepository.name);
  public async matchStart(args: MatchStartRepoArgs) {
    const { input, userId } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: { id: input.id, createdBy: userId, deletedAt: { isNull: true } },
      });
      if (!returnedMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      await db
        .update(match)
        .set({ running: true, finished: false, startTime: new Date() })
        .where(and(eq(match.id, input.id), eq(match.createdBy, userId)));
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: { matchId: input.id, sharedWithId: userId },
      });
      if (!returnedSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (returnedSharedMatch.permission !== "edit") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to start this match.",
        });
      }
      await db
        .update(match)
        .set({ running: true, finished: false, startTime: new Date() })
        .where(eq(match.id, input.id));
    }
  }
  public async matchPause(args: MatchPauseRepoArgs) {
    const { input, userId } = args;
    const currentTime = new Date();
    if (input.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: { id: input.id, createdBy: userId },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      if (foundMatch.running === false)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match is not running.",
        });
      if (!foundMatch.startTime)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match start time is not set.",
        });
      const timeDelta = differenceInSeconds(currentTime, foundMatch.startTime);
      const accumulatedDuration = foundMatch.duration + timeDelta;
      await db
        .update(match)
        .set({
          duration: accumulatedDuration,
          running: false,
          startTime: null,
          endTime: new Date(),
        })
        .where(eq(match.id, input.id));
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: { matchId: input.id, sharedWithId: userId },
      });
      if (!returnedSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (returnedSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to pause this match.",
        });
      const foundMatch = await db.query.match.findFirst({
        where: { id: input.id },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      if (foundMatch.running === false)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match is not running.",
        });
      if (!foundMatch.startTime)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match start time is not set.",
        });
      const timeDelta = differenceInSeconds(currentTime, foundMatch.startTime);
      const accumulatedDuration = foundMatch.duration + timeDelta;
      await db
        .update(match)
        .set({
          duration: accumulatedDuration,
          running: false,
          startTime: null,
          endTime: new Date(),
        })
        .where(eq(match.id, input.id));
    }
  }
  public async matchResetDuration(args: MatchResetDurationRepoArgs) {
    const { input, userId } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: { id: input.id, createdBy: userId },
      });
      if (!returnedMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      await db
        .update(match)
        .set({ duration: 0, running: false, startTime: null, endTime: null })
        .where(and(eq(match.id, input.id), eq(match.createdBy, userId)));
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: { matchId: input.id, sharedWithId: userId },
      });
      if (!returnedSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (returnedSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to reset this match.",
        });
      await db
        .update(match)
        .set({ duration: 0, running: false, startTime: null, endTime: null })
        .where(eq(match.id, input.id));
    }
  }
  public async updateMatchRoundScore(args: UpdateMatchRoundScoreRepoArgs) {
    const { input, userId } = args;

    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.id,
          sharedWithId: userId,
        },
      });
      if (!foundSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
    }
    if (input.type === "player") {
      const [foundMatchPlayer] = await db
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.match.id),
            eq(
              vMatchPlayerCanonicalForUser.baseMatchPlayerId,
              input.matchPlayerId,
            ),
            or(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
              eq(vMatchPlayerCanonicalForUser.ownerId, userId),
            ),
          ),
        );
      if (!foundMatchPlayer)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match player not found.",
        });
      if (foundMatchPlayer.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match player.",
        });
      const returnedPlayerRound = await db.query.roundPlayer.findFirst({
        where: {
          matchPlayerId: input.matchPlayerId,
          roundId: input.round.id,
        },
      });
      if (!returnedPlayerRound)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player round not found.",
        });
      await db
        .update(roundPlayer)
        .set({
          score: input.round.score,
        })
        .where(eq(roundPlayer.id, returnedPlayerRound.id));
    } else {
      const foundMatchPlayers = await db
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.match.id),
            eq(vMatchPlayerCanonicalForUser.teamId, input.teamId),
            or(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
              eq(vMatchPlayerCanonicalForUser.ownerId, userId),
            ),
          ),
        );
      if (foundMatchPlayers.length === 0)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team players not found.",
        });
      const allEditPermissions = foundMatchPlayers.every(
        (mp) => mp.permission === "edit",
      );
      if (!allEditPermissions)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match team.",
        });
      const returnedPlayerRounds = await db.query.roundPlayer.findMany({
        where: {
          matchPlayerId: {
            in: foundMatchPlayers.map((mp) => mp.baseMatchPlayerId),
          },
          roundId: input.round.id,
        },
      });
      if (returnedPlayerRounds.length === 0)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player rounds not found.",
        });
      await db
        .update(roundPlayer)
        .set({
          score: input.round.score,
        })
        .where(
          and(
            inArray(
              roundPlayer.id,
              returnedPlayerRounds.map((pr) => pr.id),
            ),
            inArray(
              roundPlayer.matchPlayerId,
              foundMatchPlayers.map((mp) => mp.baseMatchPlayerId),
            ),
          ),
        );
    }
  }
  public async updateMatchPlayerScore(args: UpdateMatchPlayerScoreRepoArgs) {
    const { input, userId } = args;

    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.id,
          sharedWithId: userId,
        },
      });
      if (!foundSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
    }
    if (input.type === "player") {
      const [foundMatchPlayer] = await db
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.match.id),
            eq(
              vMatchPlayerCanonicalForUser.baseMatchPlayerId,
              input.matchPlayerId,
            ),
            or(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
              eq(vMatchPlayerCanonicalForUser.ownerId, userId),
            ),
          ),
        );
      if (!foundMatchPlayer)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match player not found.",
        });
      if (foundMatchPlayer.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match player.",
        });
      await db
        .update(matchPlayer)
        .set({ score: input.score })
        .where(eq(matchPlayer.id, input.matchPlayerId));
    } else {
      const foundMatchPlayers = await db
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.match.id),
            eq(vMatchPlayerCanonicalForUser.teamId, input.teamId),
            or(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
              eq(vMatchPlayerCanonicalForUser.ownerId, userId),
            ),
          ),
        );
      if (foundMatchPlayers.length === 0)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team players not found.",
        });
      const allEditPermissions = foundMatchPlayers.every(
        (mp) => mp.permission === "edit",
      );
      if (!allEditPermissions)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match team.",
        });
      await db
        .update(matchPlayer)
        .set({ score: input.score })
        .where(
          and(
            inArray(
              matchPlayer.id,
              foundMatchPlayers.map((mp) => mp.baseMatchPlayerId),
            ),
            inArray(
              matchPlayer.matchId,
              foundMatchPlayers.map((mp) => mp.canonicalMatchId),
            ),
          ),
        );
    }
  }
  public async updateMatchFinalScores(args: UpdateMatchFinishRepoArgs) {
    const { input, userId } = args;
    let matchToUpdateId: number | null = null;
    if (input.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: userId,
        },
        with: {
          scoresheet: true,
          teams: true,
          matchPlayers: {
            with: {
              playerRounds: true,
            },
          },
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      matchToUpdateId = foundMatch.id;
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.id,
          sharedWithId: userId,
        },
      });
      if (!foundSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (foundSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to finish this match.",
        });
      matchToUpdateId = foundSharedMatch.matchId;
    }
    const matchToUpdate = await db.query.match.findFirst({
      where: {
        id: matchToUpdateId,
      },
      with: {
        scoresheet: true,
        teams: true,
        matchPlayers: {
          with: {
            playerRounds: true,
          },
        },
      },
    });
    if (!matchToUpdate)
      throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
    const finalPlacements = calculatePlacement(
      matchToUpdate.matchPlayers.map((mp) => ({
        id: mp.id,
        rounds: mp.playerRounds.map((pr) => ({ score: pr.score })),
        teamId: mp.teamId,
      })),
      matchToUpdate.scoresheet,
    );
    if (finalPlacements.length > 0) {
      const ids = finalPlacements.map((p) => p.id);
      const scoreSqlChunks: SQL[] = [sql`(case`];
      const placementSqlChunks: SQL[] = [sql`(case`];
      const winnerSqlChunks: SQL[] = [sql`(case`];

      for (const player of finalPlacements) {
        scoreSqlChunks.push(
          sql`when ${matchPlayer.id} = ${player.id} then ${sql`${player.score}::integer`}`,
        );
        placementSqlChunks.push(
          sql`when ${matchPlayer.id} = ${player.id} then ${sql`${player.placement}::integer`}`,
        );
        winnerSqlChunks.push(
          sql`when ${matchPlayer.id} = ${player.id} then ${player.placement === 1}::boolean`,
        );
      }

      scoreSqlChunks.push(sql`end)`);
      placementSqlChunks.push(sql`end)`);
      winnerSqlChunks.push(sql`end)`);

      // Join each array of CASE chunks into a single SQL expression
      const finalScoreSql = sql.join(scoreSqlChunks, sql.raw(" "));
      const finalPlacementSql = sql.join(placementSqlChunks, sql.raw(" "));
      const finalWinnerSql = sql.join(winnerSqlChunks, sql.raw(" "));

      // Perform the bulk update
      await db
        .update(matchPlayer)
        .set({
          score: finalScoreSql,
          placement: finalPlacementSql,
          winner: finalWinnerSql,
        })
        .where(inArray(matchPlayer.id, ids));
    }
  }
  public async updateMatchFinish(args: UpdateMatchFinishRepoArgs) {
    const { input, userId } = args;
    let matchToUpdateId: number | null = null;
    if (input.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: userId,
        },
        with: {
          scoresheet: true,
          teams: true,
          matchPlayers: {
            with: {
              playerRounds: true,
            },
          },
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      matchToUpdateId = foundMatch.id;
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.id,
          sharedWithId: userId,
        },
      });
      if (!foundSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (foundSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to finish this match.",
        });
      matchToUpdateId = foundSharedMatch.matchId;
    }
    const matchToUpdate = await db.query.match.findFirst({
      where: {
        id: matchToUpdateId,
      },
    });
    if (!matchToUpdate)
      throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
    if (matchToUpdate.running) {
      const currentTime = new Date();
      if (!matchToUpdate.startTime) {
        this.logger.error("Match start time is not set. Finishing match.", {
          input,
          userId,
        });
        await db
          .update(match)
          .set({
            running: false,
            startTime: null,
            endTime: new Date(),
            finished: true,
          })
          .where(eq(match.id, matchToUpdate.id));
      } else {
        const timeDelta = differenceInSeconds(
          currentTime,
          matchToUpdate.startTime,
        );
        const accumulatedDuration = matchToUpdate.duration + timeDelta;
        await db
          .update(match)
          .set({
            duration: accumulatedDuration,
            running: false,
            startTime: null,
            endTime: new Date(),
            finished: true,
          })
          .where(eq(match.id, matchToUpdate.id));
      }
    } else {
      await db
        .update(match)
        .set({
          running: false,
          startTime: null,
          endTime: new Date(),
          finished: true,
        })
        .where(eq(match.id, matchToUpdate.id));
    }
  }
  public async updateMatchManualWinner(args: UpdateMatchManualWinnerRepoArgs) {
    const { input, userId } = args;

    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.id,
          sharedWithId: userId,
        },
      });
      if (!foundSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (foundSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match.",
        });
    }
    const foundMatchPlayers = await db
      .select()
      .from(vMatchPlayerCanonicalForUser)
      .where(
        and(
          eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.match.id),
          or(
            eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
            eq(vMatchPlayerCanonicalForUser.ownerId, userId),
          ),
        ),
      );
    if (foundMatchPlayers.length === 0)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Match players not found.",
      });
    const allEditPermissions = foundMatchPlayers.every(
      (mp) => mp.permission === "edit",
    );
    if (!allEditPermissions)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Does not have permission to edit these match players.",
      });
    await db
      .update(match)
      .set({ finished: true })
      .where(eq(match.id, input.match.id));
    if (input.winners.length > 0) {
      await db
        .update(matchPlayer)
        .set({ winner: false })
        .where(
          and(
            eq(matchPlayer.matchId, input.match.id),
            notInArray(
              matchPlayer.id,
              input.winners.map((winner) => winner.id),
            ),
          ),
        );
      await db
        .update(matchPlayer)
        .set({ winner: true })
        .where(
          and(
            eq(matchPlayer.matchId, input.match.id),
            inArray(
              matchPlayer.id,
              input.winners.map((winner) => winner.id),
            ),
          ),
        );
    } else {
      await db
        .update(matchPlayer)
        .set({ winner: false })
        .where(eq(matchPlayer.matchId, input.match.id));
    }
  }
  public async updateMatchPlacements(args: UpdateMatchPlacementsRepoArgs) {
    const { input, userId } = args;

    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.id,
          sharedWithId: userId,
        },
      });
      if (!foundSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (foundSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match.",
        });
    }
    const foundMatchPlayers = await db
      .select()
      .from(vMatchPlayerCanonicalForUser)
      .where(
        and(
          eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.match.id),
          or(
            eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
            eq(vMatchPlayerCanonicalForUser.ownerId, userId),
          ),
        ),
      );
    if (foundMatchPlayers.length === 0)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Match players not found.",
      });
    const allEditPermissions = foundMatchPlayers.every(
      (mp) => mp.permission === "edit",
    );
    if (!allEditPermissions)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Does not have permission to edit these match players.",
      });
    await db
      .update(match)
      .set({
        finished: true,
      })
      .where(eq(match.id, input.match.id));
    const ids = input.playersPlacement.map((p) => p.id);

    const placementSqlChunks: SQL[] = [sql`(case`];
    const winnerSqlChunks: SQL[] = [sql`(case`];

    for (const player of input.playersPlacement) {
      placementSqlChunks.push(
        sql`when ${matchPlayer.id} = ${player.id} then ${sql`${player.placement}::integer`}`,
      );
      winnerSqlChunks.push(
        sql`when ${matchPlayer.id} = ${player.id} then ${player.placement === 1}::boolean`,
      );
    }

    placementSqlChunks.push(sql`end)`);
    winnerSqlChunks.push(sql`end)`);

    // Join each array of CASE chunks into a single SQL expression
    const finalPlacementSql = sql.join(placementSqlChunks, sql.raw(" "));
    const finalWinnerSql = sql.join(winnerSqlChunks, sql.raw(" "));

    // Perform the bulk update
    await db
      .update(matchPlayer)
      .set({
        placement: finalPlacementSql,
        winner: finalWinnerSql,
      })
      .where(inArray(matchPlayer.id, ids));
  }
  public async updateMatchComment(args: UpdateMatchCommentRepoArgs) {
    const { input, userId } = args;

    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.id,
          sharedWithId: userId,
        },
      });
      if (!foundSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (foundSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match.",
        });
    }
    await db
      .update(match)
      .set({ comment: input.comment })
      .where(eq(match.id, input.match.id));
  }
  public async updateMatchDetails(args: UpdateMatchDetailsRepoArgs) {
    const { input, userId } = args;

    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.id,
          sharedWithId: userId,
        },
      });
      if (!foundSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (foundSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match.",
        });
    }
    if (input.type === "player") {
      const [returnedMatchPlayer] = await db
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.match.id),
            eq(vMatchPlayerCanonicalForUser.baseMatchPlayerId, input.id),
            or(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
              eq(vMatchPlayerCanonicalForUser.ownerId, userId),
            ),
          ),
        );
      if (!returnedMatchPlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match player not found.",
        });
      }
      if (returnedMatchPlayer.permission !== "edit") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match player.",
        });
      }
      await db
        .update(matchPlayer)
        .set({ details: input.details })
        .where(eq(matchPlayer.id, input.id));
    } else {
      await db
        .update(team)
        .set({
          details: input.details,
        })
        .where(eq(team.id, input.teamId));
    }
  }
}

export const updateMatchRepository = new UpdateMatchRepository();
