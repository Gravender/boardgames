import { and, eq, isNull, sql } from "drizzle-orm";

import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { match, player, sharedPlayer } from "@board-games/db/schema";

import type {
  GetPlayersArgs,
  GetPlayersByGameArgs,
  GetPlayersForMatchArgs,
  GetPlayerSummaryArgs,
  GetRecentMatchWithPlayersArgs,
  InsertSharedPlayerInputType,
} from "./player.repository.types";
import {
  getPlayersByGameRead,
  getPlayersForMatchRead,
  getPlayersRead,
  getRecentMatchWithPlayersRead,
} from "./player.read.repository";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import {
  vMatchCanonicalVisibleToUser,
  vMatchPlayerCanonicalTargetPlayer,
  vMatchPlayerCanonicalViewerForUser,
} from "../../utils/drizzle/canonical-clauses";

class PlayerRepository {
  public async insert(args: {
    input: {
      createdBy: string;
      name: string;
      imageId?: number | null;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedPlayer] = await database
      .insert(player)
      .values({
        createdBy: input.createdBy,
        name: input.name,
        imageId: input.imageId,
      })
      .returning();
    return returnedPlayer;
  }
  public async update(args: {
    input: {
      id: number;
      createdBy: string;
      name?: string;
      imageId?: number | null;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedPlayer] = await database
      .update(player)
      .set({
        name: input.name,
        imageId: input.imageId,
      })
      .where(
        and(
          eq(player.id, input.id),
          eq(player.createdBy, input.createdBy),
          isNull(player.deletedAt),
        ),
      )
      .returning();
    return returnedPlayer;
  }
  public async insertSharedPlayer(args: {
    input: InsertSharedPlayerInputType;
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedSharedPlayer] = await database
      .insert(sharedPlayer)
      .values(input)
      .returning();
    return returnedSharedPlayer;
  }
  public async getPlayersByCreatedBy(args: {
    createdBy: string;
    tx?: TransactionType;
  }) {
    const { createdBy, tx } = args;
    const database = tx ?? db;
    return database.query.player.findMany({
      columns: { id: true, name: true },
      where: { createdBy, deletedAt: { isNull: true } },
    });
  }

  /** Primary "You" player row for insights / viewer context. */
  public async getUserPlayerIdForUser(args: {
    userId: string;
    tx?: TransactionType;
  }): Promise<number | null> {
    const database = args.tx ?? db;
    const row = await database.query.player.findFirst({
      columns: { id: true },
      where: {
        createdBy: args.userId,
        isUser: true,
        deletedAt: { isNull: true },
      },
    });
    return row?.id ?? null;
  }

  public async getPlayer<TConfig extends QueryConfig<"player">>(
    filters: {
      id: NonNullable<Filter<"player">["id"]>;
      createdBy: NonNullable<Filter<"player">["createdBy"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"player", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, createdBy, ...queryConfig } = filters;
    const result = await database.query.player.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        id: id,
        createdBy: createdBy,
        deletedAt: { isNull: true },
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"player", TConfig> | undefined;
  }
  public async getSharedPlayer<TConfig extends QueryConfig<"sharedPlayer">>(
    filters: {
      id: NonNullable<Filter<"sharedPlayer">["id"]>;
      sharedWithId: NonNullable<Filter<"sharedPlayer">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedPlayer", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedPlayer.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        id: id,
        sharedWithId: sharedWithId,
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"sharedPlayer", TConfig> | undefined;
  }
  public async getSharedPlayerByPlayerId<
    TConfig extends QueryConfig<"sharedPlayer">,
  >(
    filters: {
      playerId: NonNullable<Filter<"sharedPlayer">["playerId"]>;
      sharedWithId: NonNullable<Filter<"sharedPlayer">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedPlayer", TConfig> | undefined> {
    const database = tx ?? db;
    const { playerId, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedPlayer.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        playerId: playerId,
        sharedWithId: sharedWithId,
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"sharedPlayer", TConfig> | undefined;
  }
  public async linkSharedPlayer(args: {
    input: {
      sharedPlayerId: number;
      linkedPlayerId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedSharedPlayer] = await database
      .update(sharedPlayer)
      .set({
        linkedPlayerId: input.linkedPlayerId,
      })
      .where(eq(sharedPlayer.id, input.sharedPlayerId))
      .returning();
    return returnedSharedPlayer;
  }
  /** Fetch both original and shared (unlinked) players for match setup. */
  public async getPlayersForMatch(args: GetPlayersForMatchArgs) {
    return getPlayersForMatchRead(args);
  }

  /** Fetch the five most recent matches with their players. */
  public async getRecentMatchWithPlayers(args: GetRecentMatchWithPlayersArgs) {
    return getRecentMatchWithPlayersRead(args);
  }

  public async getPlayers(args: GetPlayersArgs) {
    return getPlayersRead(args);
  }

  public async getPlayersByGame(args: GetPlayersByGameArgs) {
    return getPlayersByGameRead(args);
  }

  /** See player-insights.repository for insights rollups; align when changing win semantics. */
  public async getPlayerSummary(args: GetPlayerSummaryArgs) {
    const { userId, input, tx } = args;
    const database = tx ?? db;
    const userMatchPlayers = database.$with("user_match_players").as(
      db
        .selectDistinctOn([vMatchPlayerCanonicalForUser.canonicalMatchId], {
          matchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
          winner: vMatchPlayerCanonicalForUser.winner,
        })
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            vMatchPlayerCanonicalTargetPlayer(
              vMatchPlayerCanonicalForUser,
              input,
            ),
            vMatchPlayerCanonicalViewerForUser(
              vMatchPlayerCanonicalForUser,
              userId,
            ),
          ),
        )
        .orderBy(vMatchPlayerCanonicalForUser.canonicalMatchId),
    );
    const [stats] = await database
      .with(userMatchPlayers)
      .select({
        finishedMatches: sql<number>`
      COUNT(DISTINCT ${match.id})
      FILTER (WHERE ${match.finished} = true)
    `,

        wins: sql<number>`
      COUNT(DISTINCT ${match.id})
      FILTER (
        WHERE ${match.finished} = true
        AND ${userMatchPlayers.winner} IS TRUE
      )
    `,

        winRate: sql<number>`
      CASE
        WHEN COUNT(*) FILTER (WHERE ${match.finished} = true) = 0
        THEN 0
        ELSE
          COUNT(*) FILTER (
            WHERE ${match.finished} = true
            AND ${userMatchPlayers.winner} IS TRUE
          )::float
          /
          COUNT(*) FILTER (WHERE ${match.finished} = true)
          * 100
      END
    `,

        gamesPlayed: sql<number>`
      COUNT(DISTINCT ${vMatchCanonical.canonicalGameId})
    `,
        totalPlaytime: sql<number>`
      COALESCE(
        SUM(${match.duration})
        FILTER (
          WHERE ${match.finished} = true
          AND ${match.duration} >= 300
        ),
        0
      )
    `,
      })
      .from(vMatchCanonical)
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        userMatchPlayers,
        eq(userMatchPlayers.matchId, vMatchCanonical.matchId),
      )
      .where(vMatchCanonicalVisibleToUser(vMatchCanonical, userId));
    return stats;
  }
}
export const playerRepository = new PlayerRepository();
