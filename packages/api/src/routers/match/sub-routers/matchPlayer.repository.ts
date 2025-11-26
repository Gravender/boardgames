import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import {
  matchPlayer,
  matchPlayerRole,
  roundPlayer,
  sharedMatchPlayer,
} from "@board-games/db/schema";

import type { InsertSharedMatchPlayerInputType } from "./matchPlayer.repository.types";

class MatchPlayerRepository {
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
    const [returnedMatchRoundPlayer] = await database
      .insert(matchPlayerRole)
      .values(input)
      .returning();
    return returnedMatchRoundPlayer;
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
}
export const matchPlayerRepository = new MatchPlayerRepository();
