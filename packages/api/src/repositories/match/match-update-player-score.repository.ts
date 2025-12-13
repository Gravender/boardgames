import type { SQL } from "drizzle-orm";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { matchPlayer } from "@board-games/db/schema";

import type {
  UpdateMatchPlayerScoreRepoArgs,
  UpdateMatchPlayersPlacementRepoArgs,
  UpdateMatchPlayersScoreRepoArgs,
  UpdateMatchPlayersWinnerRepoArgs,
} from "./match-update-player-score.repository.types";

class MatchUpdatePlayerScoreRepository {
  public async updateMatchPlayerScore(args: {
    input: { id: number; score: number | null };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(matchPlayer)
      .set({ score: input.score })
      .where(eq(matchPlayer.id, input.id));
  }

  public async updateMatchPlayersScore(args: UpdateMatchPlayersScoreRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(matchPlayer)
      .set({ score: input.score })
      .where(
        and(
          eq(matchPlayer.matchId, input.matchId),
          inArray(matchPlayer.id, input.matchPlayerIds),
        ),
      );
  }

  public async updateMatchPlayerPlacement(args: {
    input: { id: number; placement: number | null };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(matchPlayer)
      .set({ placement: input.placement })
      .where(eq(matchPlayer.id, input.id));
  }

  public async updateMatchPlayersPlacement(
    args: UpdateMatchPlayersPlacementRepoArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;

    if (input.placements.length === 0) {
      return;
    }

    const ids = input.placements.map((p) => p.id);
    const placementSqlChunks: SQL[] = [sql`(case`];

    for (const player of input.placements) {
      placementSqlChunks.push(
        sql`when ${matchPlayer.id} = ${player.id} then ${sql`${player.placement}::integer`}`,
      );
    }

    placementSqlChunks.push(sql`end)`);
    const finalPlacementSql = sql.join(placementSqlChunks, sql.raw(" "));

    await database
      .update(matchPlayer)
      .set({
        placement: finalPlacementSql,
      })
      .where(inArray(matchPlayer.id, ids));
  }

  public async updateMatchPlayerWinner(args: {
    input: { id: number; winner: boolean };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    await database
      .update(matchPlayer)
      .set({ winner: input.winner })
      .where(eq(matchPlayer.id, input.id));
  }

  public async updateMatchPlayersWinner(args: UpdateMatchPlayersWinnerRepoArgs) {
    const { input, tx } = args;
    const database = tx ?? db;

    if (input.winners.length > 0) {
      await database
        .update(matchPlayer)
        .set({ winner: false })
        .where(
          and(
            eq(matchPlayer.matchId, input.matchId),
            notInArray(
              matchPlayer.id,
              input.winners.map((winner) => winner.id),
            ),
          ),
        );
      await database
        .update(matchPlayer)
        .set({ winner: true })
        .where(
          and(
            eq(matchPlayer.matchId, input.matchId),
            inArray(
              matchPlayer.id,
              input.winners.map((winner) => winner.id),
            ),
          ),
        );
    } else {
      await database
        .update(matchPlayer)
        .set({ winner: false })
        .where(eq(matchPlayer.matchId, input.matchId));
    }
  }

  public async updateMatchPlayersScorePlacementAndWinner(args: {
    input: {
      matchId: number;
      placements: Array<{
        id: number;
        score: number;
        placement: number;
      }>;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;

    if (input.placements.length === 0) {
      return;
    }

    const ids = input.placements.map((p) => p.id);
    const scoreSqlChunks: SQL[] = [sql`(case`];
    const placementSqlChunks: SQL[] = [sql`(case`];
    const winnerSqlChunks: SQL[] = [sql`(case`];

    for (const player of input.placements) {
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

    const finalScoreSql = sql.join(scoreSqlChunks, sql.raw(" "));
    const finalPlacementSql = sql.join(placementSqlChunks, sql.raw(" "));
    const finalWinnerSql = sql.join(winnerSqlChunks, sql.raw(" "));

    await database
      .update(matchPlayer)
      .set({
        score: finalScoreSql,
        placement: finalPlacementSql,
        winner: finalWinnerSql,
      })
      .where(inArray(matchPlayer.id, ids));
  }

  public async updateMatchPlayersPlacementAndWinner(
    args: UpdateMatchPlayersPlacementRepoArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;

    if (input.placements.length === 0) {
      return;
    }

    const ids = input.placements.map((p) => p.id);
    const placementSqlChunks: SQL[] = [sql`(case`];
    const winnerSqlChunks: SQL[] = [sql`(case`];

    for (const player of input.placements) {
      placementSqlChunks.push(
        sql`when ${matchPlayer.id} = ${player.id} then ${sql`${player.placement}::integer`}`,
      );
      winnerSqlChunks.push(
        sql`when ${matchPlayer.id} = ${player.id} then ${player.placement === 1}::boolean`,
      );
    }

    placementSqlChunks.push(sql`end)`);
    winnerSqlChunks.push(sql`end)`);

    const finalPlacementSql = sql.join(placementSqlChunks, sql.raw(" "));
    const finalWinnerSql = sql.join(winnerSqlChunks, sql.raw(" "));

    await database
      .update(matchPlayer)
      .set({
        placement: finalPlacementSql,
        winner: finalWinnerSql,
      })
      .where(inArray(matchPlayer.id, ids));
  }
}

export const matchUpdatePlayerScoreRepository =
  new MatchUpdatePlayerScoreRepository();

