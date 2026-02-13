import { TRPCError } from "@trpc/server";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { caseWhen } from "drizzle-plus";
import { jsonAgg, jsonAggNotNull, jsonBuildObject } from "drizzle-plus/pg";

import { db } from "@board-games/db/client";
import {
  game,
  image,
  location,
  match,
  player,
  scoresheet,
  team,
} from "@board-games/db/schema";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import type { GetGameArgs } from "./game.repository.types";

class GameMatchesRepository {
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
            isUser: player.isUser,
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
              isUser: playersByMatch.isUser,
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
          winCondition: scoresheet.winCondition,
          isCoop: scoresheet.isCoop,
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
        .innerJoin(
          scoresheet,
          eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
        )
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
          winCondition: scoresheet.winCondition,
          isCoop: scoresheet.isCoop,
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
        .innerJoin(
          scoresheet,
          eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
        )
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
}

export const gameMatchesRepository = new GameMatchesRepository();
