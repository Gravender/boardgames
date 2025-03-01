import { currentUser } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";
import {
  aliasedTable,
  and,
  count,
  countDistinct,
  desc,
  eq,
  inArray,
  max,
  ne,
  sql,
  sumDistinct,
} from "drizzle-orm";
import { z } from "zod";

import type { selectScoreSheetSchema } from "@board-games/db/schema";
import {
  game,
  group,
  groupPlayer,
  image,
  insertPlayerSchema,
  match,
  matchPlayer,
  player,
  roundPlayer,
  selectGameSchema,
  selectGroupSchema,
  selectPlayerSchema,
} from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const playerRouter = createTRPCRouter({
  getPlayersByGame: protectedUserProcedure
    .input(
      z.object({
        game: selectGameSchema.pick({ id: true }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sq = ctx.db
        .select({
          playerId: player.id,
          matches: sql<number>`count(${match.id})`.as("matches"),
          name: player.name,
          imageId: player.imageId,
        })
        .from(player)
        .leftJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
        .leftJoin(
          match,
          and(
            eq(match.id, matchPlayer.matchId),
            eq(match.gameId, input.game.id),
          ),
        )
        .where(and(eq(player.createdBy, ctx.userId)))
        .groupBy(player.id)
        .orderBy(desc(count(match.id)))
        .as("sq");
      const players = await ctx.db
        .select({
          playerId: sq.playerId,
          matches: sq.matches,
          name: sq.name,
          imageUrl: image.url,
        })
        .from(image)
        .rightJoin(sq, eq(image.id, sq.imageId));
      if (players.length === 0) {
        const user = await currentUser();
        await ctx.db.insert(player).values({
          createdBy: ctx.userId,
          userId: ctx.userId,
          name: user?.fullName ?? "Me",
        });
        const returnedPlayer = await ctx.db.query.player.findFirst({
          where: and(eq(player.createdBy, ctx.userId)),
          with: { image: true },
        });
        if (!returnedPlayer) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
        const returnPlay: {
          id: number;
          name: string;
          matches: number;
          imageUrl: string;
        } = {
          id: returnedPlayer.id,
          name: returnedPlayer.name,
          matches: 0,
          imageUrl: returnedPlayer.image?.url ?? "",
        };
        return [returnPlay];
      }
      return players.map<{
        id: number;
        name: string;
        matches: number;
        imageUrl: string;
      }>((player) => {
        return {
          id: player.playerId,
          name: player.name,
          matches: player.matches,
          imageUrl: player.imageUrl ?? "",
        };
      });
    }),
  getPlayersByGroup: protectedUserProcedure
    .input(
      z.object({
        group: selectGroupSchema.pick({ id: true }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const queriedGroup = ctx.db
        .select({
          playerId: groupPlayer.playerId,
        })
        .from(group)
        .leftJoin(groupPlayer, eq(group.id, groupPlayer.groupId))
        .where(eq(group.id, input.group.id))
        .as("queriedGroup");
      return ctx.db
        .select({
          id: player.id,
          name: player.name,
          imageUrl: max(image.url).as("imageUrl"),
          matches: count(matchPlayer.id).as("matches"),
          ingroup: sql<boolean>`MAX(${queriedGroup.playerId}) IS NOT NULL`.as(
            "ingroup",
          ),
        })
        .from(player)
        .leftJoin(image, eq(image.id, player.imageId))
        .leftJoin(queriedGroup, eq(queriedGroup.playerId, player.id))
        .leftJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
        .leftJoin(match, eq(match.id, matchPlayer.matchId))
        .innerJoin(
          game,
          and(eq(game.id, match.gameId), eq(game.deleted, false)),
        )
        .groupBy(player.id)
        .orderBy(
          sql<boolean>`MAX(${queriedGroup.playerId}) IS NOT NULL`.as("ingroup"),
          player.name,
        );
    }),
  getPlayers: protectedUserProcedure.query(async ({ ctx }) => {
    const latestMatchesQuery = ctx.db
      .select({
        playerId: matchPlayer.playerId,
        lastPlayed: match.date,
        matches:
          sql<number>`COUNT(${matchPlayer.id}) OVER (PARTITION BY ${matchPlayer.playerId})`.as(
            "matches",
          ),
        gameName: game.name,
        gameId: game.id,
        rowNumber: sql<number>`ROW_NUMBER() OVER (
      PARTITION BY ${matchPlayer.playerId}
      ORDER BY ${match.date} DESC
    )`.as("rowNumber"),
      })
      .from(matchPlayer)
      .leftJoin(match, eq(match.id, matchPlayer.matchId))
      .innerJoin(game, and(eq(game.id, match.gameId), eq(game.deleted, false)))
      .as("latestMatches");
    const players = await ctx.db
      .select({
        id: player.id,
        matches: latestMatchesQuery.matches,
        name: player.name,
        imageUrl: image.url,
        lastPlayed: latestMatchesQuery.lastPlayed,
        gameName: latestMatchesQuery.gameName,
        gameId: latestMatchesQuery.gameId,
      })
      .from(player)
      .leftJoin(image, eq(image.id, player.imageId))
      .leftJoin(
        latestMatchesQuery,
        and(
          eq(latestMatchesQuery.playerId, player.id),
          eq(latestMatchesQuery.rowNumber, 1),
        ),
      )
      .where(eq(player.createdBy, ctx.userId))
      .orderBy(desc(latestMatchesQuery.matches));
    return players;
  }),
  getPlayer: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const matchPlayers = aliasedTable(matchPlayer, "matchPlayers");
      const players = aliasedTable(player, "players");
      const sq = ctx.db
        .select({
          matchId: sql<number>`${match.id}`.as("matchId"),
          matchDate: match.date,
          matchName: match.name,
          matchDuration: match.duration,
          matchFinished: match.finished,
          gameId: sql`${match.gameId}`.as("matchGameId"),
          gameName: sql<string>`${game.name}`.as("matchGameName"),
          gameImageUrl: image.url,
          players: sql<
            {
              id: number;
              name: string;
              score: number | null;
              isWinner: boolean | null;
              playerId: number;
            }[]
          >`
      json_agg(
        json_build_object(
          'matchPlayerId', ${matchPlayers.id},
          'name', ${players.name},
          'score', ${matchPlayers.score},
          'isWinner', ${matchPlayers.winner},
          'playerId', ${players.id}
        )
      ) OVER (PARTITION BY ${match.id})
    `.as("players"),
          outcome: sql<{
            score: number | null;
            isWinner: boolean | null;
          }>`
      json_build_object(
        'score', CASE WHEN ${matchPlayer.playerId} = ${input.id} THEN ${matchPlayer.score} END,
        'isWinner', CASE WHEN ${matchPlayer.playerId} = ${input.id} AND ${matchPlayer.winner} THEN true ELSE false END
      )
    `.as("outcome"),
          rowNumber:
            sql<number>`ROW_NUMBER() OVER (PARTITION BY ${match.id} ORDER BY ${match.date} DESC)`.as(
              "rowNumber",
            ),
        })
        .from(match)
        .innerJoin(
          game,
          and(eq(game.id, match.gameId), eq(game.deleted, false)),
        )
        .rightJoin(
          matchPlayer,
          and(
            eq(match.id, matchPlayer.matchId),
            eq(matchPlayer.playerId, input.id),
          ),
        )
        .leftJoin(image, eq(game.imageId, image.id))
        .leftJoin(matchPlayers, eq(match.id, matchPlayers.matchId))
        .leftJoin(players, eq(players.id, matchPlayers.playerId))
        .where(eq(match.finished, true))
        .as("sq");
      const gamesSubquery = ctx.db
        .select({
          id: sql<number>`${game.id}`.as("gameDistinctId"),
          name: game.name,
          imageUrl: max(image.url).as("gameImageUrl"),
          wins: sql<number>`SUM(CASE WHEN ${matchPlayer.playerId} = ${input.id} AND ${matchPlayer.winner} AND ${match.finished}  THEN 1 ELSE 0 END)`.as(
            "wins",
          ),
          plays:
            sql<number>`SUM(CASE WHEN ${matchPlayer.playerId} = ${input.id} AND ${match.finished} THEN 1 ELSE 0 END)`.as(
              "plays",
            ),
          winRate:
            sql<number>`SUM(CASE WHEN ${matchPlayer.playerId} = ${input.id} AND ${matchPlayer.winner} AND ${match.finished} THEN 1 ELSE 0 END) * 1.0 / 
            NULLIF(SUM(CASE WHEN ${matchPlayer.playerId} = ${input.id} AND ${match.finished} THEN 1 ELSE 0 END),0)`.as(
              "winRate",
            ),
        })
        .from(game)
        .rightJoin(match, eq(match.gameId, game.id))
        .rightJoin(
          matchPlayer,
          and(
            eq(match.id, matchPlayer.matchId),
            eq(matchPlayer.playerId, input.id),
          ),
        )
        .leftJoin(image, eq(game.imageId, image.id))
        .where(eq(game.deleted, false))
        .groupBy(game.id, game.name)
        .orderBy(game.name)
        .as("gamesSubquery");
      const [outPlayer] = await ctx.db
        .select({
          id: player.id,
          name: player.name,
          imageUrl: max(image.url).as("imageUrl"),
          players: countDistinct(matchPlayers.playerId)
            .mapWith(Number)
            .as("players"),
          winRate:
            sql<number>`SUM(CASE WHEN ${matchPlayer.winner} THEN 1 ELSE 0 END)::FLOAT / COUNT(${matchPlayer.id})`.as(
              "winRate",
            ),
          duration: sumDistinct(match.duration).mapWith(Number).as("duration"),
          matches: sql<
            {
              id: number;
              name: string;
              date: Date;
              duration: number;
              finished: boolean;
              gameId: number;
              gameName: string;
              gameImageUrl: string | undefined;
              players: {
                id: number;
                name: string;
                score: number | null;
                isWinner: boolean | null;
                playerId: number;
              }[];
              outcome: {
                score: number | null;
                isWinner: boolean | null;
              };
            }[]
          >`
      json_agg(
         DISTINCT jsonb_build_object(
          'id', ${sq.matchId},
          'name', ${sq.matchName},
          'date', ${sq.matchDate},
          'duration', ${sq.matchDuration},
          'finished', ${sq.matchFinished},
          'gameName', ${sq.gameName},
          'gameId', ${sq.gameId},
          'gameImageUrl', ${sq.gameImageUrl},
          'players', ${sq.players},
          'outcome', ${sq.outcome}
        )
      )
          `.as("matches"),
          games: sql<
            {
              id: number;
              name: string;
              imageUrl: string;
              wins: number;
              plays: number;
              winRate: number;
            }[]
          >`
    json_agg(
      DISTINCT jsonb_build_object(
        'id', ${gamesSubquery.id},
        'name', ${gamesSubquery.name},
        'imageUrl', ${gamesSubquery.imageUrl},
        'wins', ${gamesSubquery.wins},
        'plays', ${gamesSubquery.plays},
        'winRate', ${gamesSubquery.winRate}
      )
    )
    `.as("games"),
        })
        .from(player)
        .leftJoin(image, eq(image.id, player.imageId))
        .leftJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
        .leftJoin(match, eq(match.id, matchPlayer.matchId))
        .leftJoin(
          matchPlayers,
          and(
            eq(match.id, matchPlayers.matchId),
            ne(matchPlayers.playerId, input.id),
          ),
        )
        .leftJoin(game, eq(game.id, match.gameId))
        .leftJoin(gamesSubquery, eq(game.id, gamesSubquery.id))
        .leftJoin(
          sq,
          and(eq(sq.rowNumber, 1), eq(sq.matchId, matchPlayer.matchId)),
        )
        .where(eq(player.id, input.id))
        .groupBy(player.id);
      if (!outPlayer) {
        return null;
      }
      outPlayer.matches.sort((a, b) => compareAsc(b.date, a.date));
      return outPlayer;
    }),
  create: protectedUserProcedure
    .input(insertPlayerSchema.pick({ name: true, imageId: true }))
    .mutation(async ({ ctx, input }) => {
      const returnedPlayer = await ctx.db
        .insert(player)
        .values({
          createdBy: ctx.userId,
          imageId: input.imageId,
          name: input.name,
        })
        .returning();
      if (!returnedPlayer[0]) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      const returnedPlayerImage = await ctx.db.query.player.findFirst({
        where: and(
          eq(player.id, returnedPlayer[0].id),
          eq(player.createdBy, ctx.userId),
        ),
        with: {
          image: true,
        },
      });
      return {
        id: returnedPlayer[0].id,
        name: returnedPlayer[0].name,
        imageUrl: returnedPlayerImage?.image?.url ?? null,
        matches: 0,
      };
    }),
  update: protectedUserProcedure
    .input(
      insertPlayerSchema
        .pick({ id: true, imageId: true })
        .required({ id: true })
        .extend({ name: z.string().optional() }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(player)
        .set({
          name: input.name,
          imageId: input.imageId,
        })
        .where(eq(player.id, input.id));
    }),
  deletePlayer: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const matchPlayers = await ctx.db
        .select()
        .from(matchPlayer)
        .where(eq(matchPlayer.playerId, input.id));
      await ctx.db.delete(roundPlayer).where(
        inArray(
          roundPlayer.matchPlayerId,
          matchPlayers.map((matchPlayer) => matchPlayer.id),
        ),
      );
      await ctx.db.delete(matchPlayer).where(
        inArray(
          matchPlayer.id,
          matchPlayers.map((matchPlayer) => matchPlayer.id),
        ),
      );
      const matches = await ctx.db.query.match.findMany({
        where: inArray(
          match.id,
          matchPlayers.map((matchPlayer) => matchPlayer.matchId),
        ),
        with: {
          matchPlayers: true,
          scoresheet: true,
        },
      });
      const calculateWinners = ({
        scores,
        scoresheet,
      }: {
        scores: { id: number; score: number }[];
        scoresheet: z.infer<typeof selectScoreSheetSchema>;
      }) => {
        if (scoresheet.winCondition === "Highest Score") {
          const maxScore = Math.max(...scores.map((player) => player.score));
          return scores.filter((player) => player.score === maxScore);
        }
        if (scoresheet.winCondition === "Lowest Score") {
          const minScore = Math.min(...scores.map((player) => player.score));
          return scores.filter((player) => player.score === minScore);
        }
        if (scoresheet.winCondition === "Target Score") {
          return scores.filter(
            (player) => player.score === scoresheet.targetScore,
          );
        }
        return [];
      };
      for (const returnedMatch of matches) {
        const finalScores = returnedMatch.matchPlayers.map((mPlayer) => ({
          id: mPlayer.id,
          score: mPlayer.score ?? 0,
        }));
        const winners = calculateWinners({
          scores: finalScores,
          scoresheet: returnedMatch.scoresheet,
        });
        await ctx.db
          .update(matchPlayer)
          .set({ winner: true })
          .where(
            inArray(
              matchPlayer.id,
              winners.map((winner) => winner.id),
            ),
          );
        const losers = returnedMatch.matchPlayers.filter(
          (mPlayer) => !winners.find((winner) => winner.id === mPlayer.id),
        );
        await ctx.db
          .update(matchPlayer)
          .set({ winner: false })
          .where(
            inArray(
              matchPlayer.id,
              losers.map((loser) => loser.id),
            ),
          );
      }

      await ctx.db.delete(groupPlayer).where(eq(groupPlayer.id, input.id));
      await ctx.db.delete(player).where(eq(player.id, input.id));
    }),
});
