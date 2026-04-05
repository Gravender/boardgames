import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
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
  sharedMatch,
  team,
} from "@board-games/db/schema";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import {
  vMatchCanonicalVisibleToUser,
  vMatchPlayerCanonicalViewerForUser,
} from "../../utils/drizzle/canonical-clauses";
import type {
  GetGameArgs,
  GetLocationMatchesArgs,
} from "./game.repository.types";

class GameMatchesRepository {
  /**
   * Shared helper that builds the CTEs (teamsByMatch, teamsAgg, playersByMatch,
   * playersAgg), the select projection, and the join chain common to both the
   * "original" and "shared" branches.  Callers supply only the differing WHERE
   * predicate on vMatchCanonical.
   */
  private async fetchMatchesForUser(args: {
    userId: string;
    where: SQL | undefined;
  }) {
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
          vMatchPlayerCanonicalViewerForUser(
            vMatchPlayerCanonicalForUser,
            args.userId,
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

    return db
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
            isUser: boolean;
          }[]
        >`coalesce(${playersAgg.matchPlayers}, '[]'::jsonb)`.as(
          "match_players",
        ),
      })
      .from(vMatchCanonical)
      .where(args.where)
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(game, eq(game.id, vMatchCanonical.canonicalGameId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .leftJoin(image, eq(image.id, game.imageId))
      .leftJoin(location, eq(location.id, vMatchCanonical.canonicalLocationId))
      .leftJoin(teamsAgg, eq(teamsAgg.matchId, vMatchCanonical.matchId))
      .leftJoin(playersAgg, eq(playersAgg.matchId, vMatchCanonical.matchId))
      .orderBy(vMatchCanonical.matchDate);
  }

  /**
   * Finished matches visible to `userId` where every member of `playerIds`
   * appears as a canonical participant. Same filter as game/location match
   * lists, with the group-specific “full roster” constraint.
   */
  public async getGroupMatchIdsForUser(args: {
    userId: string;
    playerIds: number[];
  }): Promise<number[]> {
    const { userId, playerIds } = args;
    if (playerIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({ matchId: vMatchCanonical.matchId })
      .from(vMatchPlayerCanonicalForUser)
      .innerJoin(
        vMatchCanonical,
        eq(
          vMatchCanonical.matchId,
          vMatchPlayerCanonicalForUser.canonicalMatchId,
        ),
      )
      .where(
        and(
          vMatchPlayerCanonicalViewerForUser(
            vMatchPlayerCanonicalForUser,
            userId,
          ),
          inArray(vMatchPlayerCanonicalForUser.canonicalPlayerId, playerIds),
          vMatchCanonicalVisibleToUser(vMatchCanonical, userId),
          eq(vMatchCanonical.finished, true),
        ),
      )
      .groupBy(vMatchCanonical.matchId)
      .having(
        eq(
          sql<number>`count(distinct ${vMatchPlayerCanonicalForUser.canonicalPlayerId})`,
          playerIds.length,
        ),
      );

    return rows.map((r) => r.matchId);
  }

  /**
   * Same projection as {@link getGameMatches} / {@link getLocationMatches}
   * (game, location, teams, matchPlayers); only the match filter differs.
   */
  public async getGroupMatchesForUser(args: {
    userId: string;
    playerIds: number[];
  }): Promise<GameMatchesRepositoryMatchRow[]> {
    const matchIds = await this.getGroupMatchIdsForUser(args);
    if (matchIds.length === 0) {
      return [];
    }
    const rows = await this.fetchMatchesForUser({
      userId: args.userId,
      where: inArray(vMatchCanonical.matchId, matchIds),
    });
    return rows.toSorted((a, b) => b.date.getTime() - a.date.getTime());
  }

  public async getGameMatches(args: GetGameArgs) {
    const { input } = args;

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

      const matches = await this.fetchMatchesForUser({
        userId: args.userId,
        where: and(
          eq(vMatchCanonical.canonicalGameId, returnedGame.id),
          vMatchCanonicalVisibleToUser(vMatchCanonical, args.userId),
        ),
      });

      return {
        matches,
        userPlayer,
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

      const matches = await this.fetchMatchesForUser({
        userId: args.userId,
        where: and(
          eq(vMatchCanonical.sharedGameId, returnedSharedGame.id),
          vMatchCanonicalVisibleToUser(vMatchCanonical, args.userId),
        ),
      });

      return {
        matches,
        userPlayer,
      };
    }
  }

  private async ensureUserPlayer(userId: string) {
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
    return userPlayer;
  }

  private async ensureLocationOwnedByUser(locationId: number, userId: string) {
    const returnedLocation = await db.query.location.findFirst({
      where: {
        id: locationId,
        createdBy: userId,
        deletedAt: {
          isNull: true,
        },
      },
      columns: { id: true },
    });
    if (!returnedLocation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Location not found.",
      });
    }
    return returnedLocation;
  }

  private async ensureSharedLocation(sharedId: number, userId: string) {
    const returnedSharedLocation = await db.query.sharedLocation.findFirst({
      where: {
        id: sharedId,
        sharedWithId: userId,
      },
      columns: { id: true },
    });
    if (!returnedSharedLocation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shared location not found.",
      });
    }
    return returnedSharedLocation;
  }

  private buildOriginalLocationMatchesWhere(
    locationId: number,
    userId: string,
  ): SQL {
    return and(
      eq(vMatchCanonical.canonicalLocationId, locationId),
      vMatchCanonicalVisibleToUser(vMatchCanonical, userId),
    )!;
  }

  private buildSharedLocationMatchesWhere(
    sharedLocationId: number,
    userId: string,
  ): SQL {
    const sharedMatchesForLocation = db
      .select({ id: sharedMatch.id })
      .from(sharedMatch)
      .where(
        and(
          eq(sharedMatch.sharedLocationId, sharedLocationId),
          eq(sharedMatch.sharedWithId, userId),
        ),
      );

    return and(
      vMatchCanonicalVisibleToUser(vMatchCanonical, userId),
      inArray(vMatchCanonical.sharedMatchId, sharedMatchesForLocation),
    )!;
  }

  public async getLocationMatches(args: GetLocationMatchesArgs) {
    const { input } = args;

    const userPlayer = await this.ensureUserPlayer(args.userId);

    if (input.type === "original") {
      const returnedLocation = await this.ensureLocationOwnedByUser(
        input.id,
        args.userId,
      );

      const matches = await this.fetchMatchesForUser({
        userId: args.userId,
        where: this.buildOriginalLocationMatchesWhere(
          returnedLocation.id,
          args.userId,
        ),
      });

      return {
        matches,
        userPlayer,
      };
    }

    const returnedSharedLocation = await this.ensureSharedLocation(
      input.sharedId,
      args.userId,
    );

    const matches = await this.fetchMatchesForUser({
      userId: args.userId,
      where: this.buildSharedLocationMatchesWhere(
        returnedSharedLocation.id,
        args.userId,
      ),
    });

    return {
      matches,
      userPlayer,
    };
  }
}

export const gameMatchesRepository = new GameMatchesRepository();

/** Row shape from the shared SQL builder used by both game and location match lists. */
export type GameMatchesRepositoryMatchRow = Awaited<
  ReturnType<GameMatchesRepository["fetchMatchesForUser"]>
>[number];
