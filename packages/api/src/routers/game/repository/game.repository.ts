import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@board-games/db/client";
import {
  game,
  image,
  location,
  match,
  player,
  team,
} from "@board-games/db/schema";
import {
  vGameRoleCanonical,
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import type { GetGameArgs, GetGameRolesArgs } from "./game.repository.types";

class GameRepository {
  public async getGameMatches(args: GetGameArgs) {
    const { input } = args;
    const teamsByMatch = db.$with("teams_by_match").as(
      db
        .selectDistinctOn([team.matchId, team.id], {
          matchId: team.matchId,
          id: team.id,
          name: team.name,
        })
        .from(team)
        .orderBy(team.matchId, team.id),
    );

    // Now aggregate them into json
    const teamsAgg = db.$with("teams_agg").as(
      db
        .select({
          matchId: teamsByMatch.matchId,
          teams: sql<
            { id: number; name: string }[]
          >`json_agg(json_build_object('id', ${teamsByMatch.id}, 'name', ${teamsByMatch.name}) ORDER BY ${teamsByMatch.id})`.as(
            "teams",
          ),
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
            playerImageId: image.id,
            playerImageName: image.name,
            playerImageUrl: image.url,
            playerImageType: image.type,
            playerImageUsageType: image.usageType,
            playerType: vMatchPlayerCanonicalForUser.playerSourceType,
            sharedPlayerId: vMatchPlayerCanonicalForUser.sharedPlayerId,
            linkedPlayerId: vMatchPlayerCanonicalForUser.linkedPlayerId,
          },
        )
        .from(vMatchPlayerCanonicalForUser)
        .where(
          or(
            eq(vMatchPlayerCanonicalForUser.ownerId, args.userId),
            eq(vMatchPlayerCanonicalForUser.sharedWithId, args.userId),
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
          matchPlayers: sql<
            {
              id: number;
              playerId: number;
              name: string;
              score: number | null;
              teamId: number | null;
              placement: number | null;
              winner: boolean | null;
              type: "original" | "shared";
              playerType: "original" | "shared" | "linked" | "not-shared";
              sharedPlayerId: number | null;
              linkedPlayerId: number | null;
              image: {
                name: string;
                url: string | null;
                type: "file" | "svg";
                usageType: "game" | "player" | "match";
              } | null;
            }[]
          >`json_agg(json_build_object(
            'id', ${playersByMatch.baseMatchPlayerId},
            'playerId', ${playersByMatch.playerId},
            'name',      ${playersByMatch.playerName},
            'score', ${playersByMatch.score},
            'teamId', ${playersByMatch.teamId},
            'placement', ${playersByMatch.placement},
            'winner', ${playersByMatch.winner},
            'type', ${playersByMatch.type},
            'playerType',${playersByMatch.playerType},
            'sharedPlayerId', ${playersByMatch.sharedPlayerId},
            'linkedPlayerId', ${playersByMatch.linkedPlayerId},
            'image',
              CASE
                WHEN ${playersByMatch.playerImageId} IS NULL THEN NULL
                ELSE json_build_object(
                  'name', ${playersByMatch.playerImageName},
                  'url', ${playersByMatch.playerImageUrl},
                  'type', ${playersByMatch.playerImageType},
                  'usageType', ${playersByMatch.playerImageUsageType}
                )
              END
          ) ORDER BY ${playersByMatch.baseMatchPlayerId})`.as("match_players"),
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
          name: vMatchCanonical.name,
          date: vMatchCanonical.matchDate,
          comment: vMatchCanonical.comment,
          type: vMatchCanonical.visibilitySource,
          finished: vMatchCanonical.finished,
          duration: match.duration,
          game: sql<{
            id: number;
            linkedGameId: number | null;
            sharedGameId: number | null;
            type: "original" | "shared" | "linked";
            name: string;
            image: {
              name: string;
              url: string | null;
              type: "file" | "svg";
              usageType: "game" | "player" | "match";
            } | null;
          }>`json_build_object(
        'id', ${vMatchCanonical.canonicalGameId},
        'linkedGameId', ${vMatchCanonical.linkedGameId},
        'sharedGameId', ${vMatchCanonical.sharedGameId},
        'type', ${vMatchCanonical.gameVisibilitySource},
        'name', ${game.name},
        'image',
          CASE
            WHEN ${game.imageId} IS NULL THEN NULL
            ELSE json_build_object(
              'name', ${image.name},
              'url', ${image.url},
              'type', ${image.type},
              'usageType', ${image.usageType}
            )
          END
      )`.as("game"),
          location: sql<{
            id: number;
            name: string;
          } | null>`CASE
            WHEN ${location.id} IS NULL THEN NULL
            ELSE json_build_object(
              'id', ${location.id},
              'name', ${location.name}
            )
          END`.as("location"),
          teams: sql<
            { id: number; name: string }[]
          >`coalesce(teams_agg.teams, '[]'::json)`.as("teams"),
          matchPlayers: sql<
            {
              id: number;
              playerId: number;
              name: string;
              score: number | null;
              teamId: number | null;
              placement: number | null;
              winner: boolean | null;
              type: "original" | "shared";
              playerType: "original" | "shared" | "linked" | "not-shared";
              sharedPlayerId: number | null;
              linkedPlayerId: number | null;
              image: {
                name: string;
                url: string | null;
                type: "file" | "svg";
                usageType: "game" | "player" | "match";
              } | null;
            }[]
          >`coalesce(players_agg.match_players, '[]'::json)`.as("matchPlayers"),
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
          name: vMatchCanonical.name,
          date: vMatchCanonical.matchDate,
          comment: vMatchCanonical.comment,
          type: vMatchCanonical.visibilitySource,
          finished: vMatchCanonical.finished,
          duration: match.duration,
          game: sql<{
            id: number;
            linkedGameId: number | null;
            sharedGameId: number;
            type: "linked" | "shared";
            name: string;
            image: {
              name: string;
              url: string | null;
              type: "file" | "svg";
              usageType: "game" | "player" | "match";
            } | null;
          }>`json_build_object(
        'id', ${vMatchCanonical.canonicalGameId},
        'linkedGameId', ${vMatchCanonical.linkedGameId},
        'sharedGameId', ${vMatchCanonical.sharedGameId},
        'type', ${vMatchCanonical.gameVisibilitySource},
        'name', ${game.name},
        'image',
          CASE
            WHEN ${game.imageId} IS NULL THEN NULL
            ELSE json_build_object(
              'name', ${image.name},
              'url', ${image.url},
              'type', ${image.type},
              'usageType', ${image.usageType}
            )
          END
      )`.as("game"),
          location: sql<{
            id: number;
            name: string;
          } | null>`CASE
            WHEN ${location.id} IS NULL THEN NULL
            ELSE json_build_object(
              'id', ${location.id},
              'name', ${location.name}
            )
          END`.as("location"),
          teams: sql<
            { id: number; name: string }[]
          >`coalesce(teams_agg.teams, '[]'::json)`.as("teams"),
          matchPlayers: sql<
            {
              id: number;
              playerId: number;
              name: string;
              score: number | null;
              teamId: number | null;
              placement: number | null;
              winner: boolean | null;
              type: "shared";
              playerType: "linked" | "shared";
              sharedPlayerId: number | null;
              linkedPlayerId: number | null;
              image: {
                name: string;
                url: string | null;
                type: "file" | "svg";
                usageType: "game" | "player" | "match";
              } | null;
            }[]
          >`coalesce(players_agg.match_players, '[]'::json)`.as("matchPlayers"),
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

  public async getGameRoles(args: GetGameRolesArgs) {
    const { input } = args;
    let canonicalGameId: number;

    if (input.type === "original") {
      const returnedGame = await db.query.game.findFirst({
        where: {
          id: input.id,
          createdBy: args.userId,
          deletedAt: {
            isNull: true,
          },
        },
        columns: {
          id: true,
        },
      });
      if (!returnedGame) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found.",
        });
      }
      canonicalGameId = returnedGame.id;
    } else {
      const returnedSharedGame = await db.query.sharedGame.findFirst({
        where: {
          id: input.sharedGameId,
          sharedWithId: args.userId,
        },
        columns: {
          id: true,
          linkedGameId: true,
          gameId: true,
        },
      });
      if (!returnedSharedGame) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared game not found.",
        });
      }
      canonicalGameId =
        returnedSharedGame.linkedGameId ?? returnedSharedGame.gameId;
    }

    const rows = await db
      .select({
        type: vGameRoleCanonical.sourceType,
        roleId: vGameRoleCanonical.canonicalGameRoleId,
        name: vGameRoleCanonical.name,
        description: vGameRoleCanonical.description,
        permission: vGameRoleCanonical.permission,
      })
      .from(vGameRoleCanonical)
      .where(
        and(
          eq(vGameRoleCanonical.canonicalGameId, canonicalGameId),
          eq(vGameRoleCanonical.visibleToUserId, args.userId),
          isNull(vGameRoleCanonical.linkedGameRoleId),
          input.type === "shared"
            ? eq(vGameRoleCanonical.sourceType, "shared")
            : sql`true`,
        ),
      )
      .orderBy(asc(vGameRoleCanonical.name));

    const uniqueRoles = new Map<
      number,
      {
        id: number;
        name: string;
        description: string | null;
        type: "original" | "shared" | "linked";
        permission: "view" | "edit";
      }
    >();

    for (const role of rows) {
      const existing = uniqueRoles.get(role.roleId);
      if (
        existing &&
        !(existing.type === "original" && role.type === "shared")
      ) {
        continue;
      }
      uniqueRoles.set(role.roleId, {
        id: role.roleId,
        name: role.name,
        description: role.description,
        type: role.type,
        permission: role.permission,
      });
    }

    return {
      roles: Array.from(uniqueRoles.values()),
    };
  }
}
export const gameRepository = new GameRepository();
