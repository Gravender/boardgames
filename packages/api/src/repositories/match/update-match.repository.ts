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
  UpdateMatchTeamRepoArgs,
} from "./update-match.repository.types";
import { Logger } from "../../common/logger";

class UpdateMatchRepository {
  private readonly logger = new Logger(UpdateMatchRepository.name);
  public async matchStart(args: MatchStartRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({ running: true, finished: false, startTime: new Date() })
      .where(eq(match.id, input.id));
  }
  public async matchPause(args: MatchPauseRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({
        duration: input.duration,
        running: false,
        startTime: null,
        endTime: new Date(),
      })
      .where(eq(match.id, input.id));
  }
  public async matchResetDuration(args: MatchResetDurationRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(match)
      .set({ duration: 0, running: false, startTime: null, endTime: null })
      .where(eq(match.id, input.id));
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
            input.type === "original"
              ? eq(vMatchPlayerCanonicalForUser.baseMatchPlayerId, input.id)
              : eq(
                  vMatchPlayerCanonicalForUser.sharedMatchPlayerId,
                  input.sharedMatchPlayerId,
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
      if (input.teamId !== undefined) {
        if (input.teamId !== null) {
          const [foundTeam] = await tx
            .select()
            .from(team)
            .where(eq(team.id, input.teamId));
          if (!foundTeam)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Team not found.",
            });
          if (foundTeam.matchId !== foundMatchPlayer.canonicalMatchId)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Team does not belong to this match.",
            });
        }
        await tx
          .update(matchPlayer)
          .set({ teamId: input.teamId })
          .where(eq(matchPlayer.id, foundMatchPlayer.baseMatchPlayerId));
      }
      if (input.rolesToAdd.length > 0) {
        const originalRoles = input.rolesToAdd
          .map((roleToAdd) => {
            if (roleToAdd.type === "original") {
              return roleToAdd.id;
            }
            return null;
          })
          .filter((roleToAdd) => {
            return roleToAdd !== null;
          });
        const sharedRoles = input.rolesToAdd
          .map((roleToAdd) => {
            if (roleToAdd.type !== "original") {
              return roleToAdd.sharedId;
            }
            return null;
          })
          .filter((roleToAdd) => {
            return roleToAdd !== null;
          });
        if (input.type === "original") {
          if (originalRoles.length > 0) {
            await tx.insert(matchPlayerRole).values(
              originalRoles.map((roleId) => ({
                matchPlayerId: input.id,
                roleId: roleId,
              })),
            );
          }
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
                gameRoleId: sharedRoleToAdd,
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
              matchPlayerId: input.id,
              roleId: linkedGameRoleId,
            });
          }
        }
        if (input.type === "shared") {
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
                gameRoleId: sharedRoleToAdd,
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
        const originalRoles = input.rolesToRemove
          .map((roleToRemove) => {
            if (roleToRemove.type === "original") {
              return roleToRemove.id;
            }
            return null;
          })
          .filter((roleToRemove) => {
            return roleToRemove !== null;
          });
        const sharedRoles = input.rolesToRemove
          .map((roleToRemove) => {
            if (roleToRemove.type !== "original") {
              return roleToRemove.sharedId;
            }
            return null;
          })
          .filter((roleToRemove) => {
            return roleToRemove !== null;
          });
        if (input.type === "original") {
          if (originalRoles.length > 0) {
            await tx
              .delete(matchPlayerRole)
              .where(
                and(
                  eq(matchPlayerRole.matchPlayerId, input.id),
                  inArray(matchPlayerRole.roleId, originalRoles),
                ),
              );
          }
          if (sharedRoles.length > 0) {
            throw new TRPCError({
              code: "METHOD_NOT_SUPPORTED",
              message: "Original roles not allowed for shared match players.",
            });
          }
        }
        if (input.type === "shared") {
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
                gameRoleId: sharedRoleToRemove,
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
              .filter((pRole) => pRole.type === "original")
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
              .filter((pRole) => pRole.type !== "original")
              .map((role) => ({
                matchPlayerId: p.id,
                sharedRoleId: role.sharedId,
              })),
          );
          const mappedRolesToAdd: {
            matchPlayerId: number;
            roleId: number;
          }[] = [];
          for (const sharedRoleToAdd of sharedRoles) {
            const returnedSharedRole = await tx.query.sharedGameRole.findFirst({
              where: {
                gameRoleId: sharedRoleToAdd.sharedRoleId,
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
            p.roles.map((role) => ({
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
            const originalRolesToAdd = rolesToAdd
              .map((roleToAdd) => {
                if (roleToAdd.role.type === "original") {
                  return {
                    matchPlayerId: roleToAdd.matchPlayerId,
                    roleId: roleToAdd.role.id,
                  };
                }
                return null;
              })
              .filter((roleToAdd) => {
                return roleToAdd !== null;
              });
            const sharedRolesToAdd = rolesToAdd
              .map((roleToAdd) => {
                if (roleToAdd.role.type !== "original") {
                  return {
                    matchPlayerId: roleToAdd.matchPlayerId,
                    sharedRoleId: roleToAdd.role.sharedId,
                  };
                }
                return null;
              })
              .filter((roleToAdd) => {
                return roleToAdd !== null;
              });
            if (originalRolesToAdd.length > 0) {
              await tx.insert(matchPlayerRole).values(
                originalRolesToAdd.map((roleToAdd) => {
                  return {
                    matchPlayerId: roleToAdd.matchPlayerId,
                    roleId: roleToAdd.roleId,
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
                      gameRoleId: sharedRoleToAdd.sharedRoleId,
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
            for (const roleToRemove of rolesToRemove) {
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
                  vMatchPlayerCanonicalForUser.sharedMatchPlayerId,
                  input.playersToAdd.map((p) => p.sharedMatchPlayerId),
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
                  foundMatchPlayers.map((p) => p.baseMatchPlayerId),
                ),
              ),
            );
          for (const matchPlayerToAdd of input.playersToAdd) {
            if (matchPlayerToAdd.roles.length > 0) {
              const matchPlayerWithRoles =
                await tx.query.sharedMatchPlayer.findFirst({
                  where: {
                    id: matchPlayerToAdd.sharedMatchPlayerId,
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

              const filteredRoles = matchPlayerToAdd.roles
                .filter((roleToAdd) =>
                  matchPlayerWithRoles.roles.some(
                    (r) => r.sharedGameRole.gameRoleId === roleToAdd.sharedId,
                  ),
                )
                .map((roleToAdd) => {
                  const foundSharedGameRole = sharedGameRoles.find(
                    (r) => r.id === roleToAdd.sharedId,
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
                  vMatchPlayerCanonicalForUser.sharedMatchPlayerId,
                  input.playersToRemove.map((p) => p.sharedMatchPlayerId),
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
                  foundMatchPlayers.map((p) => p.baseMatchPlayerId),
                ),
              ),
            );
          for (const matchPlayerToRemove of input.playersToRemove) {
            const foundMatchPlayer = foundMatchPlayers.find(
              (p) =>
                p.sharedMatchPlayerId ===
                matchPlayerToRemove.sharedMatchPlayerId,
            );
            if (!foundMatchPlayer) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to find match player.",
              });
            }
            if (matchPlayerToRemove.roles.length > 0) {
              const matchPlayerWithRoles =
                await tx.query.sharedMatchPlayer.findFirst({
                  where: {
                    id: matchPlayerToRemove.sharedMatchPlayerId,
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
              const mappedRolesToRemove = matchPlayerToRemove.roles.map(
                (roleToRemove) => {
                  const foundSharedGameRole = matchPlayerWithRoles.roles.find(
                    (r) => r.sharedGameRole.id === roleToRemove.sharedId,
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
                },
              );
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
                  eq(
                    matchPlayerRole.matchPlayerId,
                    foundMatchPlayer.baseMatchPlayerId,
                  ),
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
                  vMatchPlayerCanonicalForUser.sharedMatchPlayerId,
                  input.playersToUpdate.map((p) => p.sharedMatchPlayerId),
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
          for (const matchPlayerToUpdate of input.playersToUpdate) {
            const foundMatchPlayer = foundMatchPlayers.find(
              (p) =>
                p.sharedMatchPlayerId ===
                matchPlayerToUpdate.sharedMatchPlayerId,
            );
            if (!foundMatchPlayer) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to find match player.",
              });
            }
            const matchPlayerWithRoles =
              await tx.query.sharedMatchPlayer.findFirst({
                where: {
                  id: matchPlayerToUpdate.sharedMatchPlayerId,
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
            if (matchPlayerToUpdate.rolesToAdd.length > 0) {
              const filteredRoles = matchPlayerToUpdate.rolesToAdd
                .filter((roleToAdd) =>
                  matchPlayerWithRoles.roles.some(
                    (r) => r.sharedGameRole.id === roleToAdd.sharedId,
                  ),
                )
                .map((roleToAdd) => {
                  const foundSharedGameRole = sharedGameRoles.find(
                    (r) => r.id === roleToAdd.sharedId,
                  );
                  if (!foundSharedGameRole) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Failed to find shared game role.",
                    });
                  }
                  return {
                    matchPlayerId: matchPlayerWithRoles.matchPlayerId,
                    gameRoleId: foundSharedGameRole.gameRoleId,
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
            if (matchPlayerToUpdate.rolesToRemove.length > 0) {
              const filteredRoles = matchPlayerToUpdate.rolesToRemove.map(
                (roleToRemove) => {
                  const foundSharedGameRole = sharedGameRoles.find(
                    (r) => r.id === roleToRemove.sharedId,
                  );
                  if (!foundSharedGameRole) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Failed to find shared game role.",
                    });
                  }
                  return {
                    matchPlayerId: matchPlayerWithRoles.matchPlayerId,
                    gameRoleId: foundSharedGameRole.gameRoleId,
                    sharedMatchPlayerId: matchPlayerWithRoles.id,
                    sharedGameRoleId: foundSharedGameRole.id,
                  };
                },
              );
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
                  eq(
                    matchPlayerRole.matchPlayerId,
                    foundMatchPlayer.baseMatchPlayerId,
                  ),
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
