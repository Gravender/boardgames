import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { caseWhen } from "drizzle-plus";
import { jsonAgg, jsonAggNotNull, jsonBuildObject } from "drizzle-plus/pg";

import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import {
  game,
  gameRole,
  image,
  location,
  match,
  player,
  sharedGameRole,
  team,
} from "@board-games/db/schema";
import {
  vGameRoleCanonical,
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import type {
  CreateGameArgs,
  CreateGameRoleArgs,
  CreateGameRolesArgs,
  DeleteGameRoleArgs,
  DeleteSharedGameRoleArgs,
  GetGameArgs,
  GetGameRolesArgs,
  GetGameStatsHeaderArgs,
  GetGameStatsHeaderOutputType,
  GetSharedRoleArgs,
  UpdateGameArgs,
  UpdateGameRoleArgs,
} from "./game.repository.types";

interface GameBaseFilter {
  id: NonNullable<Filter<"game">["id"]>;
  createdBy: NonNullable<Filter<"game">["createdBy"]>;
}
class GameRepository {
  public async getGame<TConfig extends QueryConfig<"game">>(
    filters: GameBaseFilter & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"game", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, createdBy, ...queryConfig } = filters;
    const result = await database.query.game.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        id,
        createdBy,
        deletedAt: { isNull: true },
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"game", TConfig> | undefined;
  }
  public async getSharedGame<TConfig extends QueryConfig<"sharedGame">>(
    filters: {
      id: NonNullable<Filter<"sharedGame">["id"]>;
      sharedWithId: NonNullable<Filter<"sharedGame">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedGame", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedGame.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        id: id,
        sharedWithId: sharedWithId,
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"sharedGame", TConfig> | undefined;
  }
  public async getSharedGameByGameId<TConfig extends QueryConfig<"sharedGame">>(
    filters: {
      gameId: NonNullable<Filter<"sharedGame">["gameId"]>;
      sharedWithId: NonNullable<Filter<"sharedGame">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedGame", TConfig> | undefined> {
    const database = tx ?? db;
    const { gameId, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedGame.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        gameId: gameId,
        sharedWithId: sharedWithId,
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"sharedGame", TConfig> | undefined;
  }
  public async createGame(args: CreateGameArgs) {
    const { input, userId, tx } = args;
    const database = tx ?? db;
    const [returningGame] = await database
      .insert(game)
      .values({
        name: input.name,
        ownedBy: input.ownedBy,
        playersMin: input.playersMin,
        playersMax: input.playersMax,
        playtimeMin: input.playtimeMin,
        playtimeMax: input.playtimeMax,
        yearPublished: input.yearPublished,
        description: input.description,
        rules: input.rules,
        imageId: input.imageId,
        createdBy: userId,
      })
      .returning();
    return returningGame;
  }
  public async createGameRole(args: CreateGameRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returningGameRole] = await database
      .insert(gameRole)
      .values(input)
      .returning();
    return returningGameRole;
  }
  public async createGameRoles(args: CreateGameRolesArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returningGameRoles = await database
      .insert(gameRole)
      .values(input)
      .returning();
    return returningGameRoles;
  }

  public async getGameMatches(args: GetGameArgs) {
    const { input } = args;
    const teamsByMatch = db.$with("teams_by_match").as(
      db
        .selectDistinctOn([team.matchId, team.id], {
          matchId: team.matchId,
          teamId: sql<number>`"boardgames_team"."id"`.as("team_id"),
          teamName: sql<string>`"boardgames_team"."name"`.as("team_name"),
        })
        .from(team)
        .orderBy(team.matchId, team.id),
    );

    // Now aggregate them into json
    const teamsAgg = db.$with("teams_agg").as(
      db
        .select({
          matchId: teamsByMatch.matchId,
          teams: jsonAgg(
            jsonBuildObject({
              id: teamsByMatch.teamId,
              name: teamsByMatch.teamName,
            }),
            {
              orderBy: asc(teamsByMatch.teamId),
            },
          ).as("teams"),
        })
        .from(teamsByMatch)
        .groupBy(teamsByMatch.matchId),
    );
    const playersByMatch = db.$with("players_by_match").as(
      db
        .selectDistinctOn(
          [
            vMatchPlayerCanonicalForUser.canonicalMatchId,
            vMatchPlayerCanonicalForUser.baseMatchPlayerId,
          ],
          {
            matchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
            baseMatchPlayerId: vMatchPlayerCanonicalForUser.baseMatchPlayerId,
            playerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
            score: vMatchPlayerCanonicalForUser.score,
            teamId: vMatchPlayerCanonicalForUser.teamId,
            placement: vMatchPlayerCanonicalForUser.placement,
            winner: vMatchPlayerCanonicalForUser.winner,
            type: vMatchPlayerCanonicalForUser.sourceType,
            playerName: player.name,
            playerImage: caseWhen<{
              name: string;
              url: string | null;
              type: "file" | "svg";
              usageType: "game" | "player" | "match";
            } | null>(sql`${player.imageId} IS NULL`, sql`NULL`)
              .else(
                jsonBuildObject({
                  name: image.name,
                  url: image.url,
                  type: image.type,
                  usageType: image.usageType,
                }),
              )
              .as("player_image"),
            playerImageId: player.imageId,
            playerType: vMatchPlayerCanonicalForUser.playerSourceType,
            sharedPlayerId: vMatchPlayerCanonicalForUser.sharedPlayerId,
            linkedPlayerId: vMatchPlayerCanonicalForUser.linkedPlayerId,
          },
        )
        .from(vMatchPlayerCanonicalForUser)
        .where(
          or(
            and(
              eq(vMatchPlayerCanonicalForUser.ownerId, args.userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
            ),
            and(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, args.userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
            ),
          ),
        )
        .innerJoin(
          player,
          eq(player.id, vMatchPlayerCanonicalForUser.canonicalPlayerId),
        )
        .leftJoin(image, eq(image.id, player.imageId))
        .orderBy(
          vMatchPlayerCanonicalForUser.canonicalMatchId,
          vMatchPlayerCanonicalForUser.baseMatchPlayerId,
        ),
    );

    const playersAgg = db.$with("players_agg").as(
      db
        .select({
          matchId: playersByMatch.matchId,
          matchPlayers: jsonAggNotNull(
            jsonBuildObject({
              id: playersByMatch.baseMatchPlayerId,
              playerId: playersByMatch.playerId,
              name: playersByMatch.playerName,
              score: playersByMatch.score,
              teamId: playersByMatch.teamId,
              placement: playersByMatch.placement,
              winner: playersByMatch.winner,
              type: playersByMatch.type,
              playerType: playersByMatch.playerType,
              sharedPlayerId: playersByMatch.sharedPlayerId,
              linkedPlayerId: playersByMatch.linkedPlayerId,
              image: playersByMatch.playerImage,
            }),
            { orderBy: asc(playersByMatch.baseMatchPlayerId) },
          ).as("match_players"),
        })
        .from(playersByMatch)
        .groupBy(playersByMatch.matchId),
    );
    const userPlayer = await db.query.player.findFirst({
      where: {
        isUser: true,
        createdBy: args.userId,
      },
    });
    if (!userPlayer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Current user not found.",
      });
    }
    if (input.type === "original") {
      const returnedGame = await db.query.game.findFirst({
        where: {
          id: input.id,
          createdBy: args.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          matches: true,
        },
      });
      if (!returnedGame) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found.",
        });
      }
      const matches = await db
        .with(teamsByMatch, teamsAgg, playersByMatch, playersAgg)
        .select({
          id: vMatchCanonical.matchId,
          sharedMatchId: vMatchCanonical.sharedMatchId,
          permissions: vMatchCanonical.permission,
          name: vMatchCanonical.name,
          date: vMatchCanonical.matchDate,
          comment: vMatchCanonical.comment,
          type: vMatchCanonical.visibilitySource,
          finished: vMatchCanonical.finished,
          duration: match.duration,
          game: jsonBuildObject({
            id: vMatchCanonical.canonicalGameId,
            linkedGameId: vMatchCanonical.linkedGameId,
            sharedGameId: vMatchCanonical.sharedGameId,
            type: vMatchCanonical.gameVisibilitySource,
            name: game.name,
            image: caseWhen<{
              name: string;
              url: string | null;
              type: "file" | "svg";
              usageType: "game" | "player" | "match";
            } | null>(sql`${game.imageId} IS NULL`, sql`NULL`).else(
              jsonBuildObject({
                name: image.name,
                url: image.url,
                type: image.type,
                usageType: image.usageType,
              }),
            ),
          }).as("game"),
          location: caseWhen<{ id: number; name: string } | null>(
            sql`${location.id} IS NULL`,
            sql`NULL`,
          )
            .else(
              jsonBuildObject({
                id: location.id,
                name: location.name,
              }),
            )
            .as("location"),
          teams: sql<
            { id: number; name: string }[]
          >`coalesce(${teamsAgg.teams}, '[]'::jsonb)`.as("teams"),
          matchPlayers: playersAgg.matchPlayers,
        })
        .from(vMatchCanonical)
        .where(
          and(
            eq(vMatchCanonical.canonicalGameId, returnedGame.id),
            eq(vMatchCanonical.visibleToUserId, args.userId),
          ),
        )
        .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
        .innerJoin(game, eq(game.id, vMatchCanonical.canonicalGameId))
        .leftJoin(image, eq(image.id, game.imageId))
        .leftJoin(
          location,
          eq(location.id, vMatchCanonical.canonicalLocationId),
        )
        .leftJoin(teamsAgg, eq(teamsAgg.matchId, vMatchCanonical.matchId))
        .leftJoin(playersAgg, eq(playersAgg.matchId, vMatchCanonical.matchId))
        .orderBy(vMatchCanonical.matchDate);

      return {
        matches: matches,
        userPlayer: userPlayer,
      };
    } else {
      const returnedSharedGame = await db.query.sharedGame.findFirst({
        where: {
          id: input.sharedGameId,
          sharedWithId: args.userId,
        },
      });
      if (!returnedSharedGame) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared game not found.",
        });
      }
      const matches = await db
        .with(teamsByMatch, teamsAgg, playersByMatch, playersAgg)
        .select({
          id: vMatchCanonical.matchId,
          sharedMatchId: vMatchCanonical.sharedMatchId,
          permissions: vMatchCanonical.permission,
          name: vMatchCanonical.name,
          date: vMatchCanonical.matchDate,
          comment: vMatchCanonical.comment,
          type: vMatchCanonical.visibilitySource,
          finished: vMatchCanonical.finished,
          duration: match.duration,
          game: jsonBuildObject({
            id: vMatchCanonical.canonicalGameId,
            linkedGameId: vMatchCanonical.linkedGameId,
            sharedGameId: vMatchCanonical.sharedGameId,
            type: vMatchCanonical.gameVisibilitySource,
            name: game.name,
            image: caseWhen<{
              name: string;
              url: string | null;
              type: "file" | "svg";
              usageType: "game" | "player" | "match";
            } | null>(sql`${game.imageId} IS NULL`, sql`NULL`).else(
              jsonBuildObject({
                name: image.name,
                url: image.url,
                type: image.type,
                usageType: image.usageType,
              }),
            ),
          }).as("game"),
          location: caseWhen<{ id: number; name: string } | null>(
            sql`${location.id} IS NULL`,
            sql`NULL`,
          )
            .else(
              jsonBuildObject({
                id: location.id,
                name: location.name,
              }),
            )
            .as("location"),
          teams: sql<
            { id: number; name: string }[]
          >`coalesce(${teamsAgg.teams}, '[]'::jsonb)`.as("teams"),
          matchPlayers: playersAgg.matchPlayers,
        })
        .from(vMatchCanonical)
        .where(
          and(
            eq(vMatchCanonical.sharedGameId, returnedSharedGame.id),
            eq(vMatchCanonical.visibleToUserId, args.userId),
          ),
        )
        .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
        .innerJoin(game, eq(game.id, vMatchCanonical.canonicalGameId))
        .leftJoin(image, eq(image.id, game.imageId))
        .leftJoin(
          location,
          eq(location.id, vMatchCanonical.canonicalLocationId),
        )
        .leftJoin(teamsAgg, eq(teamsAgg.matchId, vMatchCanonical.matchId))
        .leftJoin(playersAgg, eq(playersAgg.matchId, vMatchCanonical.matchId))
        .orderBy(vMatchCanonical.matchDate);
      return {
        matches: matches,
        userPlayer: userPlayer,
      };
    }
  }

  public async getGameStatsHeader(
    args: GetGameStatsHeaderArgs,
  ): Promise<GetGameStatsHeaderOutputType> {
    const { input, userId } = args;

    // Get user player
    const userPlayer = await db.query.player.findFirst({
      where: {
        isUser: true,
        createdBy: userId,
      },
    });
    if (!userPlayer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Current user not found.",
      });
    }

    // Create a CTE for user match players to check participation and wins
    const userMatchPlayers = db.$with("user_match_players").as(
      db
        .select({
          matchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
          winner: vMatchPlayerCanonicalForUser.winner,
        })
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(
              vMatchPlayerCanonicalForUser.canonicalPlayerId,
              userPlayer.id,
            ),
            or(
              and(
                eq(vMatchPlayerCanonicalForUser.ownerId, userId),
                eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
              ),
              and(
                eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
                eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
              ),
            ),
          ),
        ),
    );

    // Aggregate stats from matches
    const [stats] = await db
      .with(userMatchPlayers)
      .select({
        overallMatchesPlayed: sql<number>`COUNT(*) FILTER (WHERE ${match.finished} = true)`,
        userMatchesPlayed: sql<number>`COUNT(*) FILTER (WHERE ${match.finished} = true AND ${userMatchPlayers.matchId} IS NOT NULL)`,
        userWins: sql<number>`COUNT(*) FILTER (WHERE ${match.finished} = true AND ${userMatchPlayers.winner} IS TRUE)`,
        totalPlaytime: sql<number>`COALESCE(SUM(${match.duration}) FILTER (WHERE ${match.finished} = true AND ${match.duration} >= 300), 0)`,
        userTotalPlaytime: sql<number>`COALESCE(SUM(${match.duration}) FILTER (WHERE ${match.finished} = true AND ${match.duration} >= 300 AND ${userMatchPlayers.matchId} IS NOT NULL), 0)`,
        avgPlaytime: sql<number>`COALESCE(AVG(${match.duration}) FILTER (WHERE ${match.finished} = true AND ${match.duration} >= 300), 0)`,
        userAvgPlaytime: sql<number>`COALESCE(AVG(${match.duration}) FILTER (WHERE ${match.finished} = true AND ${match.duration} >= 300 AND ${userMatchPlayers.matchId} IS NOT NULL), 0)`,
      })
      .from(vMatchCanonical)
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .leftJoin(
        userMatchPlayers,
        eq(userMatchPlayers.matchId, vMatchCanonical.matchId),
      )
      .where(
        and(
          input.type === "original" ? eq(vMatchCanonical.canonicalGameId, input.id) : eq(vMatchCanonical.sharedGameId, input.sharedGameId),
          eq(vMatchCanonical.visibleToUserId, userId),
        ),
      );

    if (!stats) {
      return {
        winRate: 0,
        avgPlaytime: 0,
        totalPlaytime: 0,
        userTotalPlaytime: 0,
        userAvgPlaytime: 0,
        overallMatchesPlayed: 0,
        userMatchesPlayed: 0,
      };
    }

    const winRate =
      stats.userMatchesPlayed > 0
        ? (stats.userWins / stats.userMatchesPlayed) * 100
        : 0;

    return {
      winRate: Number(Number(winRate).toFixed(2)),
      avgPlaytime: Number(Number(stats.avgPlaytime).toFixed(0)),
      totalPlaytime: Number(stats.totalPlaytime),
      userTotalPlaytime: Number(stats.userTotalPlaytime),
      userAvgPlaytime: Number(Number(stats.userAvgPlaytime).toFixed(0)),
      overallMatchesPlayed: Number(stats.overallMatchesPlayed),
      userMatchesPlayed: Number(stats.userMatchesPlayed),
    };
  }

  public async getGameRoles(args: GetGameRolesArgs) {
    const { input, tx } = args;

    const rows = await tx
      .select({
        type: vGameRoleCanonical.sourceType,
        roleId: vGameRoleCanonical.canonicalGameRoleId,
        sharedRoleId: vGameRoleCanonical.sharedGameRoleId,
        name: vGameRoleCanonical.name,
        description: vGameRoleCanonical.description,
        permission: vGameRoleCanonical.permission,
      })
      .from(vGameRoleCanonical)
      .where(
        and(
          eq(vGameRoleCanonical.canonicalGameId, input.canonicalGameId),
          eq(vGameRoleCanonical.visibleToUserId, args.userId),
          isNull(vGameRoleCanonical.linkedGameRoleId),
          input.sourceType === "shared"
            ? eq(vGameRoleCanonical.sourceType, "shared")
            : sql`true`,
        ),
      )
      .orderBy(asc(vGameRoleCanonical.name));

    return {
      rows,
    };
  }

  public async updateGame(args: UpdateGameArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [updatedGame] = await database
      .update(game)
      .set({
        name: input.name,
        ownedBy: input.ownedBy,
        playersMin: input.playersMin,
        playersMax: input.playersMax,
        playtimeMin: input.playtimeMin,
        playtimeMax: input.playtimeMax,
        yearPublished: input.yearPublished,
        imageId: input.imageId,
      })
      .where(eq(game.id, input.id))
      .returning();
    return updatedGame;
  }

  public async updateGameRole(args: UpdateGameRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(gameRole)
      .set({
        name: input.name,
        description: input.description,
      })
      .where(eq(gameRole.id, input.id));
  }

  public async deleteGameRole(args: DeleteGameRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(gameRole)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(gameRole.gameId, input.gameId),
          inArray(gameRole.id, input.roleIds),
        ),
      );
  }

  public async getSharedRole(args: GetSharedRoleArgs) {
    const { input, userId, tx } = args;
    const database = tx ?? db;
    const returnedSharedRole = await database.query.sharedGameRole.findFirst({
      where: {
        id: input.sharedRoleId,
        sharedWithId: userId,
      },
      with: {
        gameRole: true,
      },
    });
    return returnedSharedRole;
  }

  public async deleteSharedGameRole(args: DeleteSharedGameRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .delete(sharedGameRole)
      .where(inArray(sharedGameRole.id, input.sharedRoleIds));
  }
}
export const gameRepository = new GameRepository();
