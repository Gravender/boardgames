import { and, eq, inArray } from "drizzle-orm";

import type {
  Filter,
  InferManyQueryResult,
  ManyQueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import {
  matchPlayer,
  matchPlayerRole,
  roundPlayer,
  sharedMatchPlayer,
} from "@board-games/db/schema";

import type { InsertSharedMatchPlayerInputType } from "./matchPlayer.repository.types";

class MatchPlayerRepository {
  public async getMany<TConfig extends ManyQueryConfig<"matchPlayer">>(
    filters: {
      matchId: NonNullable<Filter<"matchPlayer">["matchId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferManyQueryResult<"matchPlayer", TConfig>> {
    const database = tx ?? db;
    const { matchId, ...queryConfig } = filters;
    const result = await database.query.matchPlayer.findMany({
      ...(queryConfig as unknown as TConfig),
      where: {
        ...(queryConfig as unknown as TConfig).where,
        matchId: matchId,
        deletedAt: {
          isNull: true,
        },
      },
    });
    return result as InferManyQueryResult<"matchPlayer", TConfig>;
  }
  public async insert(args: {
    input: {
      matchId: number;
      playerId: number;
      teamId: number | null;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedMatchPlayer] = await database
      .insert(matchPlayer)
      .values({
        matchId: input.matchId,
        playerId: input.playerId,
        teamId: input.teamId,
      })
      .returning();
    return returnedMatchPlayer;
  }
  public async insertMatchPlayers(args: {
    input: {
      matchId: number;
      playerId: number;
      teamId: number | null;
    }[];
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returnedMatchPlayers = await database
      .insert(matchPlayer)
      .values(input)
      .returning();
    return returnedMatchPlayers;
  }
  public async insertSharedMatchPlayer(args: {
    input: InsertSharedMatchPlayerInputType;
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedSharedMatchPlayer] = await database
      .insert(sharedMatchPlayer)
      .values(input)
      .returning();
    return returnedSharedMatchPlayer;
  }
  public async insertRound(args: {
    input: {
      roundId: number;
      matchPlayerId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedMatchRoundPlayer] = await database
      .insert(roundPlayer)
      .values(input)
      .returning();
    return returnedMatchRoundPlayer;
  }
  public async insertRounds(args: {
    input: {
      roundId: number;
      matchPlayerId: number;
    }[];
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returnedMatchRoundPlayers = await database
      .insert(roundPlayer)
      .values(input)
      .returning();
    return returnedMatchRoundPlayers;
  }
  public async insertMatchPlayerRole(args: {
    input: {
      matchPlayerId: number;
      roleId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedMatchPlayerRole] = await database
      .insert(matchPlayerRole)
      .values(input)
      .returning();
    return returnedMatchPlayerRole;
  }
  public async insertMatchPlayerRoles(args: {
    input: {
      matchPlayerId: number;
      roleId: number;
    }[];
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returnedMatchPlayerRoles = await database
      .insert(matchPlayerRole)
      .values(input)
      .returning();
    return returnedMatchPlayerRoles;
  }
  public async updateMatchPlayerTeam(args: {
    input: {
      id: number;
      teamId: number | null;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [updatedMatchPlayer] = await database
      .update(matchPlayer)
      .set({
        teamId: input.teamId,
      })
      .where(eq(matchPlayer.id, input.id))
      .returning();
    return updatedMatchPlayer;
  }
  public async updateMatchPlayerPlacementAndScore(args: {
    input: {
      id: number;
      placement: number | null;
      score: number | null;
      winner: boolean;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [updatedMatchPlayer] = await database
      .update(matchPlayer)
      .set({
        placement: input.placement,
        score: input.score,
        winner: input.winner,
      })
      .where(eq(matchPlayer.id, input.id))
      .returning();
    return updatedMatchPlayer;
  }
  public async deleteMatchPlayers(args: {
    input: {
      matchId: number;
      matchPlayerIds: number[];
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const deletedMatchPlayers = await database
      .update(matchPlayer)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(matchPlayer.matchId, input.matchId),
          inArray(matchPlayer.id, input.matchPlayerIds),
        ),
      )
      .returning();
    return deletedMatchPlayers;
  }
  public async deleteMatchPlayerRoles(args: {
    input: {
      matchPlayerId: number;
      roleIds: number[];
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const deletedMatchPlayerRoles = await database
      .delete(matchPlayerRole)
      .where(
        and(
          eq(matchPlayerRole.matchPlayerId, input.matchPlayerId),
          inArray(matchPlayerRole.roleId, input.roleIds),
        ),
      )
      .returning();
    return deletedMatchPlayerRoles;
  }
}
export const matchPlayerRepository = new MatchPlayerRepository();
