import { TRPCError } from "@trpc/server";
import { and, eq, gte, lt, or, sql } from "drizzle-orm";

import type {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
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

import type {
  GetMatchesByCalenderOutputType,
  GetMatchesByDateOutputType,
} from "../date-match.output";
import type {
  GetMatchesByCalenderArgs,
  GetMatchesByDateArgs,
} from "./date-match.repository.types";
import { aggregatePlayerStats } from "../../../../../utils/player";

class DateMatchRepository {
  public async getMatchesByDate(
    args: GetMatchesByDateArgs,
  ): Promise<GetMatchesByDateOutputType> {
    const { input } = args;
    const year = input.date.getUTCFullYear();
    const month = input.date.getUTCMonth();
    const day = input.date.getUTCDate();

    const dayStartUtc = new Date(Date.UTC(year, month, day, 0, 0, 0));
    const nextDayUtc = new Date(Date.UTC(year, month, day + 1, 0, 0, 0));
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
            playerType: sql<"original" | "shared">`
            CASE
              WHEN ${vMatchPlayerCanonicalForUser.sharedPlayerId} IS NULL
                   OR ${vMatchPlayerCanonicalForUser.linkedPlayerId} IS NOT NULL
              THEN 'original'
              ELSE 'shared'
            END
          `.as("player_type"),
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
              playerType: "original" | "shared";
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

    const matches = await db
      .with(teamsByMatch, teamsAgg, playersByMatch, playersAgg)
      .select({
        id: vMatchCanonical.matchId,
        name: vMatchCanonical.name,
        date: vMatchCanonical.matchDate,
        duration: match.duration,
        comment: vMatchCanonical.comment,
        type: vMatchCanonical.visibilitySource,
        finished: vMatchCanonical.finished,
        game: sql<{
          id: number;
          linkedGameId: number | null;
          type: "original" | "shared";
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
            'type', ${vMatchCanonical.visibilitySource},
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
        location: sql<{ id: number; name: string } | null>`CASE
            WHEN ${location.id} IS NULL THEN NULL
            ELSE json_build_object(
              'id', ${location.id},
              'name', ${location.name}
            )
          END`.as("location"),
        scoresheet: sql<{
          id: number;
          parentId: number | null;
          name: string;
          gameId: number;
          createdBy: string;
          createdAt: Date;
          updatedAt: Date | null;
          deletedAt: Date | null;
          isCoop: boolean;
          winCondition: (typeof scoreSheetWinConditions)[number];
          targetScore: number;
          roundsScore: (typeof scoreSheetRoundsScore)[number];
          type: "Template" | "Default" | "Match" | "Game";
        }>`json_build_object(
                    'id', ${scoresheet.id},
                    'parentId', ${scoresheet.parentId},
                    'name', ${scoresheet.name},
                    'gameId', ${scoresheet.gameId},
                    'createdBy', ${scoresheet.createdBy},
                    'createdAt', ${scoresheet.createdAt},
                    'updatedAt', ${scoresheet.updatedAt},
                    'deletedAt', ${scoresheet.deletedAt},
                    'isCoop', ${scoresheet.isCoop},
                    'winCondition', ${scoresheet.winCondition},
                    'targetScore', ${scoresheet.targetScore},
                    'roundsScore', ${scoresheet.roundsScore},
                    'type', ${scoresheet.type}
                  )`.as("scoresheet"),
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
            playerType: "original" | "shared";
            image: {
              name: string;
              url: string | null;
              type: "file" | "svg";
              usageType: "game" | "player" | "match";
            } | null;
          }[]
        >`coalesce(players_agg.match_players, '[]'::json)`.as("match_players"),
      })
      .from(vMatchCanonical)
      .where(
        and(
          gte(vMatchCanonical.matchDate, dayStartUtc),
          lt(vMatchCanonical.matchDate, nextDayUtc),
          eq(vMatchCanonical.visibleToUserId, args.userId),
        ),
      )
      .leftJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .leftJoin(location, eq(location.id, vMatchCanonical.canonicalLocationId))
      .leftJoin(teamsAgg, eq(teamsAgg.matchId, vMatchCanonical.matchId))
      .leftJoin(playersAgg, eq(playersAgg.matchId, vMatchCanonical.matchId))
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(game, eq(game.id, vMatchCanonical.canonicalGameId))
      .leftJoin(image, eq(image.id, game.imageId))
      .orderBy(vMatchCanonical.matchDate);
    const currentUserPlayer = await db.query.player.findFirst({
      where: {
        isUser: true,
        createdBy: args.userId,
      },
    });
    if (!currentUserPlayer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Current user not found.",
      });
    }
    const mappedMatches = matches.map((m) => {
      return {
        ...m,
        duration: m.duration,
        gameId: m.game.id,
        gameImage: m.game.image,
        gameName: m.game.name,
        linkedGameId: m.game.linkedGameId ?? undefined,
        locationName: m.location?.name,
        outcome: {
          score:
            m.matchPlayers.find((mp) => mp.playerId === currentUserPlayer.id)
              ?.score ?? 0,
          isWinner:
            m.matchPlayers.find((mp) => mp.playerId === currentUserPlayer.id)
              ?.winner ?? false,
          placement:
            m.matchPlayers.find((mp) => mp.playerId === currentUserPlayer.id)
              ?.placement ?? 0,
        },
        players: m.matchPlayers.map((mp) => ({
          id: mp.playerId,
          type: mp.playerType,
          name: mp.name,
          score: mp.score,
          isWinner: mp.winner ?? false,
          placement: mp.placement,
          teamId: mp.teamId,
          isUser: mp.playerId === currentUserPlayer.id,
          image: mp.image
            ? {
                name: mp.image.name,
                url: mp.image.url,
                type: mp.image.type,
                usageType: "player" as const,
              }
            : null,
        })),
        scoresheet: m.scoresheet,
      };
    });
    return {
      date: input.date,
      matches: matches.map((match) => {
        const userMatchPlayer = match.matchPlayers.find(
          (mp) => mp.playerId === currentUserPlayer.id,
        );
        return {
          ...match,
          hasUser: userMatchPlayer !== undefined,
          won: userMatchPlayer?.winner ?? false,
        };
      }),
      playerStats: aggregatePlayerStats(mappedMatches),
    };
  }
  public async getMatchesByCalender(
    args: GetMatchesByCalenderArgs,
  ): Promise<GetMatchesByCalenderOutputType> {
    const matches = await db
      .select({
        date: sql<Date>`date_trunc('day', ${vMatchCanonical.matchDate})`.as(
          "date",
        ),
        count: sql<number>`count(*)`.as("count"),
      })
      .from(vMatchCanonical)
      .where(eq(vMatchCanonical.visibleToUserId, args.userId))
      .groupBy(sql`date_trunc('day', ${vMatchCanonical.matchDate})`)
      .orderBy(sql`date_trunc('day', ${vMatchCanonical.matchDate})`);
    return matches;
  }
}
export const dateMatchRepository = new DateMatchRepository();
