import { and, eq, inArray, or } from "drizzle-orm";

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
import { vMatchPlayerCanonicalForUser } from "@board-games/db/views";

import type {
  GetAllMatchPlayersFromViewCanonicalForUserArgs,
  GetFromViewCanonicalForUserArgs,
  GetFromViewCanonicalForUserByOriginalIdArgs,
  GetFromViewCanonicalForUserBySharedIdArgs,
  GetMatchPlayersByTeamFromViewCanonicalForUserArgs,
  GetRoundPlayerArgs,
  GetRoundPlayersArgs,
  InsertMatchPlayerRoleArgs,
  InsertMatchPlayerRolesArgs,
  InsertRoundArgs,
  InsertRoundsArgs,
  InsertSharedMatchPlayerInputType,
  UpdateMatchPlayerTeamArgs,
  UpdateRoundPlayerArgs,
  UpdateRoundPlayersArgs,
} from "./matchPlayer.repository.types";

class MatchPlayerRepository {
  public async getFromViewCanonicalForUser(
    args: GetFromViewCanonicalForUserArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [foundMatchPlayer] = await database
      .select()
      .from(vMatchPlayerCanonicalForUser)
      .where(
        and(
          eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.matchId),
          eq(vMatchPlayerCanonicalForUser.baseMatchPlayerId, input.id),
          or(
            and(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, input.userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
            ),
            and(
              eq(vMatchPlayerCanonicalForUser.ownerId, input.userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
            ),
          ),
        ),
      );
    return foundMatchPlayer;
  }
  public async getFromViewCanonicalForUserByOriginalId(
    args: GetFromViewCanonicalForUserByOriginalIdArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [foundMatchPlayer] = await database
      .select()
      .from(vMatchPlayerCanonicalForUser)
      .where(
        and(
          eq(vMatchPlayerCanonicalForUser.baseMatchPlayerId, input.id),
          eq(vMatchPlayerCanonicalForUser.ownerId, input.userId),
          eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
        ),
      );
    return foundMatchPlayer;
  }
  public async getFromViewCanonicalForUserBySharedId(
    args: GetFromViewCanonicalForUserBySharedIdArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [foundMatchPlayer] = await database
      .select()
      .from(vMatchPlayerCanonicalForUser)
      .where(
        and(
          eq(
            vMatchPlayerCanonicalForUser.sharedMatchPlayerId,
            input.sharedMatchPlayerId,
          ),
          eq(vMatchPlayerCanonicalForUser.sharedWithId, input.userId),
          eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
        ),
      );
    return foundMatchPlayer;
  }
  public async getMatchPlayersByTeamFromViewCanonicalForUser(
    args: GetMatchPlayersByTeamFromViewCanonicalForUserArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returnedMatchPlayers = await database
      .select()
      .from(vMatchPlayerCanonicalForUser)
      .where(
        and(
          eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.matchId),
          eq(vMatchPlayerCanonicalForUser.teamId, input.teamId),
          or(
            and(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, input.userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
            ),
            and(
              eq(vMatchPlayerCanonicalForUser.ownerId, input.userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
            ),
          ),
        ),
      );
    return returnedMatchPlayers;
  }

  public async getAllMatchPlayersFromViewCanonicalForUser(
    args: GetAllMatchPlayersFromViewCanonicalForUserArgs,
  ) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returnedMatchPlayers = await database
      .select()
      .from(vMatchPlayerCanonicalForUser)
      .where(
        and(
          eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.matchId),
          or(
            and(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, input.userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
            ),
            and(
              eq(vMatchPlayerCanonicalForUser.ownerId, input.userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
            ),
          ),
        ),
      );
    return returnedMatchPlayers;
  }

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
  public async getRoundPlayer(args: GetRoundPlayerArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returnedRoundPlayer = await database.query.roundPlayer.findFirst({
      where: {
        roundId: input.roundId,
        matchPlayerId: input.matchPlayerId,
      },
    });
    return returnedRoundPlayer;
  }
  public async getRoundPlayers(args: GetRoundPlayersArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returnedRoundPlayers = await database.query.roundPlayer.findMany({
      where: {
        roundId: input.roundId,
        matchPlayerId: {
          in: input.matchPlayerIds,
        },
      },
    });
    return returnedRoundPlayers;
  }
  public async insertRound(args: InsertRoundArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedMatchRoundPlayer] = await database
      .insert(roundPlayer)
      .values(input)
      .returning();
    return returnedMatchRoundPlayer;
  }
  public async insertRounds(args: InsertRoundsArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returnedMatchRoundPlayers = await database
      .insert(roundPlayer)
      .values(input)
      .returning();
    return returnedMatchRoundPlayers;
  }
  public async updateRoundPlayer(args: UpdateRoundPlayerArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [updatedRoundPlayer] = await database
      .update(roundPlayer)
      .set({
        score: input.score,
        ...(input.updatedBy !== undefined && { updatedBy: input.updatedBy }),
      })
      .where(eq(roundPlayer.id, input.id))
      .returning();
    return updatedRoundPlayer;
  }
  public async updateRoundPlayers(args: UpdateRoundPlayersArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const updatedRoundPlayers = await database
      .update(roundPlayer)
      .set({
        score: input.score,
        ...(input.updatedBy !== undefined && { updatedBy: input.updatedBy }),
      })
      .where(
        and(
          eq(roundPlayer.roundId, input.roundId),
          inArray(roundPlayer.matchPlayerId, input.matchPlayerIds),
        ),
      )
      .returning();
    return updatedRoundPlayers;
  }
  public async insertMatchPlayerRole(args: InsertMatchPlayerRoleArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedMatchPlayerRole] = await database
      .insert(matchPlayerRole)
      .values(input)
      .returning();
    return returnedMatchPlayerRole;
  }
  public async insertMatchPlayerRoles(args: InsertMatchPlayerRolesArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const returnedMatchPlayerRoles = await database
      .insert(matchPlayerRole)
      .values(input)
      .returning();
    return returnedMatchPlayerRoles;
  }
  public async updateMatchPlayerTeam(args: UpdateMatchPlayerTeamArgs) {
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
  public async deleteMatchPlayersByMatchId(args: {
    input: {
      matchId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const deletedMatchPlayers = await database
      .update(matchPlayer)
      .set({ deletedAt: new Date() })
      .where(eq(matchPlayer.matchId, input.matchId))
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
  public async deleteMatchPlayersRolesByMatchPlayerId(args: {
    input: {
      matchPlayerIds: number[];
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const deletedMatchPlayerRoles = await database
      .delete(matchPlayerRole)
      .where(inArray(matchPlayerRole.matchPlayerId, input.matchPlayerIds))
      .returning();
    return deletedMatchPlayerRoles;
  }
}
export const matchPlayerRepository = new MatchPlayerRepository();
