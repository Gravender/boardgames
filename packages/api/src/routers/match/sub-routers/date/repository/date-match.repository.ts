import { and, eq, gte, lt, or, sql } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { location, player, team } from "@board-games/db/schema";
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
        .orderBy(team.matchId, team.id)
        .groupBy(team.matchId, team.id),
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
            'playerType',${playersByMatch.playerType}
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
        comment: vMatchCanonical.comment,
        type: vMatchCanonical.visibilitySource,
        finished: vMatchCanonical.finished,
        game: sql<{
          id: number;
          type: "original" | "shared";
        }>`json_build_object(
            'id', ${vMatchCanonical.canonicalGameId},
            'type', ${vMatchCanonical.visibilitySource}
          )`.as("game"),
        location: sql<{ id: number; name: string }>`json_build_object(
            'id', ${location.id},
            'name', ${location.name}
          )`.as("location"),
        teams: sql<{ id: number; name: string }[]>`teams_agg.teams`.as("teams"),
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
          }[]
        >`players_agg.match_players`.as("match_players"),
      })
      .from(vMatchCanonical)
      .where(
        and(
          gte(vMatchCanonical.matchDate, dayStartUtc),
          lt(vMatchCanonical.matchDate, nextDayUtc),
          eq(vMatchCanonical.visibleToUserId, args.userId),
        ),
      )
      .innerJoin(location, eq(location.id, vMatchCanonical.canonicalLocationId))
      .leftJoin(teamsAgg, eq(teamsAgg.matchId, vMatchCanonical.matchId))
      .leftJoin(playersAgg, eq(playersAgg.matchId, vMatchCanonical.matchId))
      .orderBy(vMatchCanonical.matchDate);
    return {
      date: input.date,
      matches: matches,
    };
  }
  public async getMatchesByCalender(
    args: GetMatchesByCalenderArgs,
  ): Promise<GetMatchesByCalenderOutputType> {
    const matches = await db
      .select({
        date: sql<Date>`date_trunc('day', ${vMatchCanonical.matchDate}) AS day`,
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
