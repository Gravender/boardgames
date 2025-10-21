import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { differenceInSeconds } from "date-fns";
import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";

import { db } from "@board-games/db/client";
import {
  gameRole,
  match,
  matchPlayer,
  matchPlayerRole,
  roundPlayer,
  sharedGameRole,
  sharedMatchPlayerRole,
  team,
} from "@board-games/db/schema";
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
  UpdateMatchPlayerTeamAndRolesRepoArgs,
  UpdateMatchRoundScoreRepoArgs,
  UpdateMatchTeamRepoArgs,
} from "./update-match.repository.types";
import { Logger } from "../../../../../common/logger";

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
        where: { id: input.sharedMatchId, sharedWithId: userId },
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
        .where(eq(match.id, returnedSharedMatch.matchId));
    }
  }
  public async matchPause(args: MatchPauseRepoArgs) {
    const { input, userId } = args;
    const currentTime = new Date();
    if (input.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: { id: input.id, createdBy: userId, deletedAt: { isNull: true } },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      if (foundMatch.running === false)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match is not running.",
        });
      if (!foundMatch.startTime) {
        this.logger.error("Match start time is not set. Pausing match.", {
          input,
          userId,
        });
        await db
          .update(match)
          .set({
            running: false,
            startTime: null,
            endTime: new Date(),
          })
          .where(eq(match.id, input.id));
      } else {
        const timeDelta = differenceInSeconds(
          currentTime,
          foundMatch.startTime,
        );
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
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: { id: input.sharedMatchId, sharedWithId: userId },
        with: {
          match: true,
        },
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
      if (returnedSharedMatch.match.running === false)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match is not running.",
        });
      if (!returnedSharedMatch.match.startTime)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match start time is not set.",
        });
      const timeDelta = differenceInSeconds(
        currentTime,
        returnedSharedMatch.match.startTime,
      );
      const accumulatedDuration =
        returnedSharedMatch.match.duration + timeDelta;
      await db
        .update(match)
        .set({
          duration: accumulatedDuration,
          running: false,
          startTime: null,
          endTime: new Date(),
        })
        .where(eq(match.id, returnedSharedMatch.matchId));
    }
  }
  public async matchResetDuration(args: MatchResetDurationRepoArgs) {
    const { input, userId } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: { id: input.id, createdBy: userId, deletedAt: { isNull: true } },
      });
      if (!returnedMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      await db
        .update(match)
        .set({ duration: 0, running: false, startTime: null, endTime: null })
        .where(and(eq(match.id, input.id), eq(match.createdBy, userId)));
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: { id: input.sharedMatchId, sharedWithId: userId },
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
        .where(eq(match.id, returnedSharedMatch.matchId));
    }
  }
  public async updateMatchRoundScore(args: UpdateMatchRoundScoreRepoArgs) {
    const { input, userId } = args;

    let foundMatchId: number | null = null;
    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
          deletedAt: { isNull: true },
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      foundMatchId = foundMatch.id;
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.sharedMatchId,
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
      foundMatchId = foundSharedMatch.matchId;
    }
    if (input.type === "player") {
      const [foundMatchPlayer] = await db
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, foundMatchId),
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
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, foundMatchId),
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
    let foundMatchId: number | null = null;
    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
          deletedAt: { isNull: true },
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      foundMatchId = foundMatch.id;
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.sharedMatchId,
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
      foundMatchId = foundSharedMatch.matchId;
    }
    if (input.type === "player") {
      const [foundMatchPlayer] = await db
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, foundMatchId),
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
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, foundMatchId),
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
          deletedAt: { isNull: true },
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
          id: input.sharedMatchId,
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
          deletedAt: { isNull: true },
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
          id: input.sharedMatchId,
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
    let foundMatchId: number | null = null;
    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
          deletedAt: { isNull: true },
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      foundMatchId = foundMatch.id;
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.sharedMatchId,
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
      foundMatchId = foundSharedMatch.matchId;
    }
    const foundMatchPlayers = await db
      .select()
      .from(vMatchPlayerCanonicalForUser)
      .where(
        and(
          eq(vMatchPlayerCanonicalForUser.canonicalMatchId, foundMatchId),
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
      .where(eq(match.id, foundMatchId));
    if (input.winners.length > 0) {
      await db
        .update(matchPlayer)
        .set({ winner: false })
        .where(
          and(
            eq(matchPlayer.matchId, foundMatchId),
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
            eq(matchPlayer.matchId, foundMatchId),
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
        .where(eq(matchPlayer.matchId, foundMatchId));
    }
  }
  public async updateMatchPlacements(args: UpdateMatchPlacementsRepoArgs) {
    const { input, userId } = args;
    let foundMatchId: number | null = null;
    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
          deletedAt: { isNull: true },
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      foundMatchId = foundMatch.id;
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.sharedMatchId,
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
      foundMatchId = foundSharedMatch.matchId;
    }
    const foundMatchPlayers = await db
      .select()
      .from(vMatchPlayerCanonicalForUser)
      .where(
        and(
          eq(vMatchPlayerCanonicalForUser.canonicalMatchId, foundMatchId),
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
      .where(eq(match.id, foundMatchId));
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
    let foundMatchId: number | null = null;
    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
          deletedAt: { isNull: true },
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      foundMatchId = foundMatch.id;
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.sharedMatchId,
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
      foundMatchId = foundSharedMatch.matchId;
    }
    await db
      .update(match)
      .set({ comment: input.comment })
      .where(eq(match.id, foundMatchId));
  }
  public async updateMatchDetails(args: UpdateMatchDetailsRepoArgs) {
    const { input, userId } = args;
    let foundMatchId: number | null = null;
    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
          deletedAt: { isNull: true },
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      foundMatchId = foundMatch.id;
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.sharedMatchId,
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
      foundMatchId = foundSharedMatch.matchId;
    }
    if (input.type === "player") {
      const [returnedMatchPlayer] = await db
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, foundMatchId),
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
  public async updateMatchPlayerTeamAndRoles(
    args: UpdateMatchPlayerTeamAndRolesRepoArgs,
  ) {
    const { input, userId } = args;
    await db.transaction(async (tx) => {
      const [foundMatchPlayer] = await tx
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(
              vMatchPlayerCanonicalForUser.baseMatchPlayerId,
              input.matchPlayer.id,
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
      if (input.matchPlayer.teamId !== undefined) {
        await tx
          .update(matchPlayer)
          .set({ teamId: input.matchPlayer.teamId })
          .where(eq(matchPlayer.id, input.matchPlayer.id));
      }
      if (input.rolesToAdd.length > 0) {
        const originalRoles = input.rolesToAdd.filter(
          (roleToAdd) => roleToAdd.type === "original",
        );
        const sharedRoles = input.rolesToAdd.filter(
          (roleToAdd) => roleToAdd.type === "shared",
        );
        if (input.matchPlayer.type === "original") {
          await tx.insert(matchPlayerRole).values(
            originalRoles.map((roleId) => ({
              matchPlayerId: input.matchPlayer.id,
              roleId: roleId.id,
            })),
          );
          const returnedMatch = await tx.query.match.findFirst({
            where: {
              id: foundMatchPlayer.canonicalMatchId,
            },
          });
          if (!returnedMatch) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Match not found.",
            });
          }
          for (const sharedRoleToAdd of sharedRoles) {
            const returnedSharedRole = await tx.query.sharedGameRole.findFirst({
              where: {
                gameRoleId: sharedRoleToAdd.id,
                sharedWithId: userId,
              },
              with: {
                gameRole: true,
              },
            });
            if (!returnedSharedRole) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Shared role not found.",
              });
            }
            let linkedGameRoleId = returnedSharedRole.linkedGameRoleId;
            if (!linkedGameRoleId) {
              const [createdGameRole] = await tx
                .insert(gameRole)
                .values({
                  gameId: returnedMatch.gameId,
                  name: returnedSharedRole.gameRole.name,
                  description: returnedSharedRole.gameRole.description,
                  createdBy: userId,
                })
                .returning();
              if (!createdGameRole) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Failed to create game role",
                });
              }
              await tx
                .update(sharedGameRole)
                .set({ linkedGameRoleId: createdGameRole.id })
                .where(eq(sharedGameRole.id, returnedSharedRole.id));
              linkedGameRoleId = createdGameRole.id;
            }
            await tx.insert(matchPlayerRole).values({
              matchPlayerId: input.matchPlayer.id,
              roleId: linkedGameRoleId,
            });
          }
        }
        if (input.matchPlayer.type === "shared") {
          if (originalRoles.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message: "Original roles not allowed for shared match players.",
            });
          }
          if (foundMatchPlayer.sharedMatchPlayerId === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Shared Match Player not set.",
            });
          }
          for (const sharedRoleToAdd of sharedRoles) {
            const returnedSharedRole = await tx.query.sharedGameRole.findFirst({
              where: {
                gameRoleId: sharedRoleToAdd.id,
                sharedWithId: userId,
              },
              with: {
                gameRole: true,
              },
            });
            if (!returnedSharedRole) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Shared role not found.",
              });
            }
            const existingMatchPlayerRole =
              await tx.query.matchPlayerRole.findFirst({
                where: {
                  matchPlayerId: foundMatchPlayer.baseMatchPlayerId,
                  roleId: returnedSharedRole.gameRoleId,
                },
              });
            if (existingMatchPlayerRole) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Shared role already exists.",
              });
            }
            const [insertedMatchPlayerRole] = await tx
              .insert(matchPlayerRole)
              .values({
                matchPlayerId: foundMatchPlayer.baseMatchPlayerId,
                roleId: returnedSharedRole.gameRoleId,
              })
              .returning();
            if (!insertedMatchPlayerRole) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create match player role",
              });
            }
            const [insertedSharedMatchPlayerRole] = await tx
              .insert(sharedMatchPlayerRole)
              .values({
                sharedMatchPlayerId: foundMatchPlayer.sharedMatchPlayerId,
                sharedGameRoleId: returnedSharedRole.id,
              })
              .returning();
            if (!insertedSharedMatchPlayerRole) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create shared match player role",
              });
            }
          }
        }
      }
      if (input.rolesToRemove.length > 0) {
        const originalRoles = input.rolesToRemove.filter(
          (roleToRemove) => roleToRemove.type === "original",
        );
        const sharedRoles = input.rolesToRemove.filter(
          (roleToRemove) => roleToRemove.type === "shared",
        );
        if (input.matchPlayer.type === "original") {
          await tx.delete(matchPlayerRole).where(
            and(
              eq(matchPlayerRole.matchPlayerId, input.matchPlayer.id),
              inArray(
                matchPlayerRole.roleId,
                originalRoles.map((role) => role.id),
              ),
            ),
          );
          if (sharedRoles.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message: "Original roles not allowed for shared match players.",
            });
          }
        }
        if (input.matchPlayer.type === "shared") {
          if (originalRoles.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message: "Original roles not allowed for shared match players.",
            });
          }
          if (foundMatchPlayer.sharedMatchPlayerId === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Shared Match Player not set.",
            });
          }
          for (const sharedRoleToRemove of sharedRoles) {
            const returnedSharedRole = await tx.query.sharedGameRole.findFirst({
              where: {
                gameRoleId: sharedRoleToRemove.id,
                sharedWithId: userId,
              },
              with: {
                gameRole: true,
              },
            });
            if (!returnedSharedRole) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Shared role not found.",
              });
            }
            await tx
              .delete(sharedMatchPlayerRole)
              .where(
                and(
                  eq(
                    sharedMatchPlayerRole.sharedMatchPlayerId,
                    foundMatchPlayer.sharedMatchPlayerId,
                  ),
                  eq(
                    sharedMatchPlayerRole.sharedGameRoleId,
                    returnedSharedRole.id,
                  ),
                ),
              );
            await tx
              .delete(matchPlayerRole)
              .where(
                and(
                  eq(
                    matchPlayerRole.matchPlayerId,
                    foundMatchPlayer.baseMatchPlayerId,
                  ),
                  eq(matchPlayerRole.roleId, returnedSharedRole.gameRoleId),
                ),
              );
          }
        }
      }
    });
  }
  public async updateMatchTeam(args: UpdateMatchTeamRepoArgs) {
    const { input, userId } = args;
    const currentTeam = await db.query.team.findFirst({
      where: {
        id: input.team.id,
      },
    });
    if (!currentTeam)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team not found.",
      });
    if (input.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: userId,
          deletedAt: {
            isNull: true,
          },
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.sharedMatchId,
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
    if (input.team.name !== undefined) {
      await db
        .update(team)
        .set({ name: input.team.name })
        .where(eq(team.id, input.team.id));
    }
    if (input.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: userId,
          deletedAt: {
            isNull: true,
          },
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      await db.transaction(async (tx) => {
        if (input.playersToAdd.length > 0) {
          await tx
            .update(matchPlayer)
            .set({
              teamId: currentTeam.id,
            })
            .where(
              and(
                eq(matchPlayer.matchId, input.id),
                inArray(
                  matchPlayer.id,
                  input.playersToAdd.map((p) => p.id),
                ),
              ),
            );
          const originalRoles = input.playersToAdd.flatMap((p) =>
            p.roles
              .filter(
                (pRole) => pRole.type === "original" || pRole.type === "linked",
              )
              .map((role) => ({
                matchPlayerId: p.id,
                roleId: role.id,
              })),
          );
          if (originalRoles.length > 0) {
            await tx.insert(matchPlayerRole).values(originalRoles);
          }
          const sharedRoles = input.playersToAdd.flatMap((p) =>
            p.roles
              .filter((pRole) => pRole.type === "shared")
              .map((role) => ({
                matchPlayerId: p.id,
                roleId: role.id,
              })),
          );
          const mappedRolesToAdd: {
            matchPlayerId: number;
            roleId: number;
          }[] = [];
          for (const sharedRoleToAdd of sharedRoles) {
            const returnedSharedRole = await tx.query.sharedGameRole.findFirst({
              where: {
                gameRoleId: sharedRoleToAdd.roleId,
                sharedWithId: userId,
              },
              with: {
                gameRole: true,
              },
            });
            if (!returnedSharedRole) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Shared role not found.",
              });
            }
            if (returnedSharedRole.linkedGameRoleId === null) {
              const [createdGameRole] = await tx
                .insert(gameRole)
                .values({
                  gameId: foundMatch.gameId,
                  name: returnedSharedRole.gameRole.name,
                  description: returnedSharedRole.gameRole.description,
                  createdBy: userId,
                })
                .returning();
              if (!createdGameRole) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Failed to create game role",
                });
              }
              await tx
                .update(sharedGameRole)
                .set({
                  linkedGameRoleId: createdGameRole.id,
                })
                .where(eq(sharedGameRole.id, returnedSharedRole.id));
              mappedRolesToAdd.push({
                matchPlayerId: sharedRoleToAdd.matchPlayerId,
                roleId: createdGameRole.id,
              });
            } else {
              mappedRolesToAdd.push({
                matchPlayerId: sharedRoleToAdd.matchPlayerId,
                roleId: returnedSharedRole.linkedGameRoleId,
              });
            }
          }
          if (mappedRolesToAdd.length > 0) {
            await tx.insert(matchPlayerRole).values(mappedRolesToAdd);
          }
        }
        if (input.playersToRemove.length > 0) {
          const updatedMatchPlayers = await tx
            .update(matchPlayer)
            .set({
              teamId: null,
            })
            .where(
              and(
                eq(matchPlayer.matchId, input.id),
                inArray(
                  matchPlayer.id,
                  input.playersToRemove.map((p) => p.id),
                ),
              ),
            )
            .returning();
          if (updatedMatchPlayers.length < 1) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to remove players from match",
            });
          }
          const originalRolesToRemove = input.playersToRemove.flatMap((p) =>
            p.roles
              .filter(
                (pRole) => pRole.type === "original" || pRole.type === "linked",
              )
              .map((role) => ({
                matchPlayerId: p.id,
                roleId: role.id,
              })),
          );
          const sharedRolesToRemove = input.playersToRemove.flatMap((p) =>
            p.roles
              .filter((pRole) => pRole.type === "shared")
              .map((role) => ({
                matchPlayerId: p.id,
                roleId: role.id,
              })),
          );
          if (originalRolesToRemove.length > 0) {
            for (const roleToRemove of originalRolesToRemove) {
              await tx
                .delete(matchPlayerRole)
                .where(
                  and(
                    eq(
                      matchPlayerRole.matchPlayerId,
                      roleToRemove.matchPlayerId,
                    ),
                    eq(matchPlayerRole.roleId, roleToRemove.roleId),
                  ),
                );
            }
          }
          if (sharedRolesToRemove.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message: "Shared roles not allowed for original matches.",
            });
          }
        }
        if (input.playersToUpdate.length > 0) {
          const rolesToAdd = input.playersToUpdate.flatMap((p) =>
            p.rolesToAdd.map((role) => ({
              matchPlayerId: p.id,
              role: role,
            })),
          );
          const rolesToRemove = input.playersToUpdate.flatMap((p) =>
            p.rolesToRemove.map((role) => ({
              matchPlayerId: p.id,
              role: role,
            })),
          );
          if (rolesToAdd.length > 0) {
            const originalRolesToAdd = rolesToAdd.filter(
              (roleToAdd) =>
                roleToAdd.role.type === "original" ||
                roleToAdd.role.type === "linked",
            );
            const sharedRolesToAdd = rolesToAdd.filter(
              (roleToAdd) => roleToAdd.role.type === "shared",
            );
            if (originalRolesToAdd.length > 0) {
              await tx.insert(matchPlayerRole).values(
                originalRolesToAdd.map((roleToAdd) => {
                  return {
                    matchPlayerId: roleToAdd.matchPlayerId,
                    roleId: roleToAdd.role.id,
                  };
                }),
              );
            }

            if (sharedRolesToAdd.length > 0) {
              const mappedRolesToAdd: {
                matchPlayerId: number;
                roleId: number;
              }[] = [];
              for (const sharedRoleToAdd of sharedRolesToAdd) {
                const returnedSharedRole =
                  await tx.query.sharedGameRole.findFirst({
                    where: {
                      gameRoleId: sharedRoleToAdd.role.id,
                      sharedWithId: userId,
                    },
                    with: {
                      gameRole: true,
                    },
                  });
                if (!returnedSharedRole) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Shared role not found.",
                  });
                }
                if (returnedSharedRole.linkedGameRoleId === null) {
                  const [createdGameRole] = await tx
                    .insert(gameRole)
                    .values({
                      gameId: foundMatch.gameId,
                      name: returnedSharedRole.gameRole.name,
                      description: returnedSharedRole.gameRole.description,
                      createdBy: userId,
                    })
                    .returning();
                  if (!createdGameRole) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Failed to create game role",
                    });
                  }
                  await tx
                    .update(sharedGameRole)
                    .set({
                      linkedGameRoleId: createdGameRole.id,
                    })
                    .where(eq(sharedGameRole.id, returnedSharedRole.id));
                  mappedRolesToAdd.push({
                    matchPlayerId: sharedRoleToAdd.matchPlayerId,
                    roleId: createdGameRole.id,
                  });
                } else {
                  mappedRolesToAdd.push({
                    matchPlayerId: sharedRoleToAdd.matchPlayerId,
                    roleId: returnedSharedRole.linkedGameRoleId,
                  });
                }
              }
              if (mappedRolesToAdd.length > 0) {
                await tx.insert(matchPlayerRole).values(mappedRolesToAdd);
              }
            }
          }
          if (rolesToRemove.length > 0) {
            const originalRolesToRemove = rolesToRemove.filter(
              (roleToRemove) =>
                roleToRemove.role.type === "original" ||
                roleToRemove.role.type === "linked",
            );
            const sharedRolesToRemove = rolesToRemove.filter(
              (roleToRemove) => roleToRemove.role.type === "shared",
            );
            if (originalRolesToRemove.length > 0) {
              for (const roleToRemove of originalRolesToRemove) {
                await tx
                  .delete(matchPlayerRole)
                  .where(
                    and(
                      eq(
                        matchPlayerRole.matchPlayerId,
                        roleToRemove.matchPlayerId,
                      ),
                      eq(matchPlayerRole.roleId, roleToRemove.role.id),
                    ),
                  );
              }
              if (sharedRolesToRemove.length > 0) {
                throw new TRPCError({
                  code: "METHOD_NOT_SUPPORTED",
                  message: "Shared roles not allowed for original matches.",
                });
              }
            }
          }
        }
      });
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.sharedMatchId,
          sharedWithId: userId,
        },
      });
      if (!foundSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      await db.transaction(async (tx) => {
        const sharedGameRoles = await tx.query.sharedGameRole.findMany({
          where: {
            sharedGameId: foundSharedMatch.sharedGameId,
            sharedWithId: userId,
          },
        });
        if (input.playersToAdd.length > 0) {
          const foundMatchPlayers = await db
            .select()
            .from(vMatchPlayerCanonicalForUser)
            .where(
              and(
                eq(
                  vMatchPlayerCanonicalForUser.canonicalMatchId,
                  foundSharedMatch.matchId,
                ),
                inArray(
                  vMatchPlayerCanonicalForUser.baseMatchPlayerId,
                  input.playersToAdd.map((p) => p.id),
                ),
                or(
                  eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
                  eq(vMatchPlayerCanonicalForUser.ownerId, userId),
                ),
              ),
            );
          if (foundMatchPlayers.length === 0) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to find match players to update.",
            });
          }
          const allEditPermissions = foundMatchPlayers.every(
            (mp) => mp.permission === "edit",
          );
          if (!allEditPermissions)
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to edit this match team.",
            });
          await tx
            .update(matchPlayer)
            .set({
              teamId: input.team.id,
            })
            .where(
              and(
                eq(matchPlayer.matchId, foundSharedMatch.matchId),
                inArray(
                  matchPlayer.id,
                  input.playersToAdd.map((p) => p.id),
                ),
              ),
            );
          for (const matchPlayerToAdd of input.playersToAdd) {
            const rolesToAdd = matchPlayerToAdd.roles.map((role) => ({
              matchPlayerId: matchPlayerToAdd.id,
              roleId: role.id,
              type: role.type,
            }));
            if (rolesToAdd.length > 0) {
              const matchPlayerWithRoles =
                await tx.query.sharedMatchPlayer.findFirst({
                  where: {
                    matchPlayerId: matchPlayerToAdd.id,
                    sharedWithId: userId,
                  },
                  with: {
                    roles: {
                      with: {
                        sharedGameRole: true,
                      },
                    },
                  },
                });
              if (!matchPlayerWithRoles) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Match player not found.",
                });
              }
              if (matchPlayerWithRoles.permission !== "edit") {
                throw new TRPCError({
                  code: "UNAUTHORIZED",
                  message:
                    "Does not have permission to edit this match player.",
                });
              }

              const filteredRoles = rolesToAdd
                .filter((roleToAdd) =>
                  matchPlayerWithRoles.roles.some((r) =>
                    roleToAdd.type === "shared"
                      ? r.sharedGameRole.gameRoleId === roleToAdd.roleId
                      : r.sharedGameRole.linkedGameRoleId === roleToAdd.roleId,
                  ),
                )
                .map((roleToAdd) => {
                  const foundSharedGameRole = sharedGameRoles.find((r) =>
                    roleToAdd.type === "shared"
                      ? r.gameRoleId === roleToAdd.roleId
                      : r.linkedGameRoleId === roleToAdd.roleId,
                  );
                  if (!foundSharedGameRole) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Failed to find shared game role.",
                    });
                  }
                  return {
                    matchPlayerId: matchPlayerWithRoles.id,
                    gameRoleId: foundSharedGameRole.id,
                    sharedMatchPlayerId: matchPlayerWithRoles.id,
                    sharedGameRoleId: foundSharedGameRole.id,
                  };
                });
              if (filteredRoles.length > 0) {
                await tx.insert(matchPlayerRole).values(
                  filteredRoles.map((mpr) => ({
                    matchPlayerId: mpr.matchPlayerId,
                    roleId: mpr.gameRoleId,
                  })),
                );

                await tx.insert(sharedMatchPlayerRole).values(
                  filteredRoles.map((mpr) => ({
                    sharedMatchPlayerId: mpr.sharedMatchPlayerId,
                    sharedGameRoleId: mpr.sharedGameRoleId,
                  })),
                );
              }
            }
          }
        }
        if (input.playersToRemove.length > 0) {
          const foundMatchPlayers = await db
            .select()
            .from(vMatchPlayerCanonicalForUser)
            .where(
              and(
                eq(
                  vMatchPlayerCanonicalForUser.canonicalMatchId,
                  foundSharedMatch.matchId,
                ),
                inArray(
                  vMatchPlayerCanonicalForUser.baseMatchPlayerId,
                  input.playersToRemove.map((p) => p.id),
                ),
                or(
                  eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
                  eq(vMatchPlayerCanonicalForUser.ownerId, userId),
                ),
              ),
            );
          if (foundMatchPlayers.length === 0) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to find match players to update.",
            });
          }
          const allEditPermissions = foundMatchPlayers.every(
            (mp) => mp.permission === "edit",
          );
          if (!allEditPermissions)
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to edit this match team.",
            });
          await tx
            .update(matchPlayer)
            .set({
              teamId: null,
            })
            .where(
              and(
                eq(matchPlayer.matchId, foundSharedMatch.matchId),
                inArray(
                  matchPlayer.id,
                  input.playersToRemove.map((p) => p.id),
                ),
              ),
            );
          for (const matchPlayerToRemove of input.playersToRemove) {
            const rolesToRemove = matchPlayerToRemove.roles.map((role) => ({
              matchPlayerId: matchPlayerToRemove.id,
              roleId: role.id,
              type: role.type,
            }));
            if (rolesToRemove.length > 0) {
              const matchPlayerWithRoles =
                await tx.query.sharedMatchPlayer.findFirst({
                  where: {
                    matchPlayerId: matchPlayerToRemove.id,
                    sharedWithId: userId,
                  },
                  with: {
                    roles: {
                      with: {
                        sharedGameRole: true,
                      },
                    },
                  },
                });
              if (!matchPlayerWithRoles) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "Match player not found.",
                });
              }
              if (matchPlayerWithRoles.permission !== "edit") {
                throw new TRPCError({
                  code: "UNAUTHORIZED",
                  message:
                    "Does not have permission to edit this match player.",
                });
              }
              const mappedRolesToRemove = rolesToRemove.map((roleToRemove) => {
                const foundSharedGameRole = matchPlayerWithRoles.roles.find(
                  (r) =>
                    roleToRemove.type === "shared"
                      ? r.sharedGameRole.gameRoleId === roleToRemove.roleId
                      : r.sharedGameRole.linkedGameRoleId ===
                        roleToRemove.roleId,
                );
                if (!foundSharedGameRole) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to find shared game role.",
                  });
                }
                return {
                  sharedMatchPlayerId: matchPlayerWithRoles.id,
                  sharedGameRoleId: foundSharedGameRole.sharedGameRole.id,
                  gameRoleId: foundSharedGameRole.sharedGameRole.gameRoleId,
                };
              });
              await tx.delete(sharedMatchPlayerRole).where(
                and(
                  eq(
                    sharedMatchPlayerRole.sharedMatchPlayerId,
                    matchPlayerWithRoles.id,
                  ),
                  inArray(
                    sharedMatchPlayerRole.sharedGameRoleId,
                    mappedRolesToRemove.map((r) => r.sharedGameRoleId),
                  ),
                ),
              );
              await tx.delete(matchPlayerRole).where(
                and(
                  eq(matchPlayerRole.matchPlayerId, matchPlayerToRemove.id),
                  inArray(
                    matchPlayerRole.roleId,
                    mappedRolesToRemove.map((r) => r.gameRoleId),
                  ),
                ),
              );
            }
          }
        }
        if (input.playersToUpdate.length > 0) {
          for (const matchPlayerToUpdate of input.playersToUpdate) {
            const matchPlayerWithRoles =
              await tx.query.sharedMatchPlayer.findFirst({
                where: {
                  matchPlayerId: matchPlayerToUpdate.id,
                  sharedWithId: userId,
                },
                with: {
                  roles: {
                    with: {
                      sharedGameRole: true,
                    },
                  },
                },
              });
            if (!matchPlayerWithRoles) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Match player not found.",
              });
            }
            if (matchPlayerWithRoles.permission !== "edit") {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Does not have permission to edit this match player.",
              });
            }
            const rolesToAdd = matchPlayerToUpdate.rolesToAdd.map((role) => ({
              matchPlayerId: matchPlayerToUpdate.id,
              roleId: role.id,
              type: role.type,
            }));
            const rolesToRemove = matchPlayerToUpdate.rolesToRemove.map(
              (role) => ({
                matchPlayerId: matchPlayerToUpdate.id,
                roleId: role.id,
                type: role.type,
              }),
            );
            if (rolesToAdd.length > 0) {
              const filteredRoles = rolesToAdd
                .filter((roleToAdd) =>
                  matchPlayerWithRoles.roles.some((r) =>
                    roleToAdd.type === "shared"
                      ? r.sharedGameRole.gameRoleId === roleToAdd.roleId
                      : r.sharedGameRole.linkedGameRoleId === roleToAdd.roleId,
                  ),
                )
                .map((roleToAdd) => {
                  const foundSharedGameRole = sharedGameRoles.find((r) =>
                    roleToAdd.type === "shared"
                      ? r.gameRoleId === roleToAdd.roleId
                      : r.linkedGameRoleId === roleToAdd.roleId,
                  );
                  if (!foundSharedGameRole) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Failed to find shared game role.",
                    });
                  }
                  return {
                    matchPlayerId: matchPlayerWithRoles.id,
                    gameRoleId: foundSharedGameRole.id,
                    sharedMatchPlayerId: matchPlayerWithRoles.id,
                    sharedGameRoleId: foundSharedGameRole.id,
                  };
                });
              if (filteredRoles.length > 0) {
                await tx.insert(matchPlayerRole).values(
                  filteredRoles.map((mpr) => ({
                    matchPlayerId: mpr.matchPlayerId,
                    roleId: mpr.gameRoleId,
                  })),
                );

                await tx.insert(sharedMatchPlayerRole).values(
                  filteredRoles.map((mpr) => ({
                    sharedMatchPlayerId: mpr.sharedMatchPlayerId,
                    sharedGameRoleId: mpr.sharedGameRoleId,
                  })),
                );
              }
            }
            if (rolesToRemove.length > 0) {
              const filteredRoles = rolesToRemove.map((roleToRemove) => {
                const foundSharedGameRole = sharedGameRoles.find((r) =>
                  roleToRemove.type === "shared"
                    ? r.gameRoleId === roleToRemove.roleId
                    : r.linkedGameRoleId === roleToRemove.roleId,
                );
                if (!foundSharedGameRole) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to find shared game role.",
                  });
                }
                return {
                  matchPlayerId: matchPlayerWithRoles.id,
                  gameRoleId: foundSharedGameRole.id,
                  sharedMatchPlayerId: matchPlayerWithRoles.id,
                  sharedGameRoleId: foundSharedGameRole.id,
                };
              });
              await tx.delete(sharedMatchPlayerRole).where(
                and(
                  eq(
                    sharedMatchPlayerRole.sharedMatchPlayerId,
                    matchPlayerWithRoles.id,
                  ),
                  inArray(
                    sharedMatchPlayerRole.sharedGameRoleId,
                    filteredRoles.map((r) => r.sharedGameRoleId),
                  ),
                ),
              );
              await tx.delete(matchPlayerRole).where(
                and(
                  eq(matchPlayerRole.matchPlayerId, matchPlayerToUpdate.id),
                  inArray(
                    matchPlayerRole.roleId,
                    filteredRoles.map((r) => r.gameRoleId),
                  ),
                ),
              );
            }
          }
        }
      });
    }
  }
}

export const updateMatchRepository = new UpdateMatchRepository();
