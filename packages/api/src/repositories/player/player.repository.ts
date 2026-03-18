import { and, eq, isNull } from "drizzle-orm";

import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { player, sharedPlayer } from "@board-games/db/schema";

import type {
  GetOriginalPlayerByIdArgs,
  GetPlayersArgs,
  GetPlayersByGameArgs,
  GetPlayersForMatchArgs,
  GetRecentMatchWithPlayersArgs,
  GetSharedPlayerByIdArgs,
  InsertSharedPlayerInputType,
} from "./player.repository.types";
import {
  getOriginalPlayerByIdRead,
  getPlayersByGameRead,
  getPlayersForMatchRead,
  getPlayersRead,
  getRecentMatchWithPlayersRead,
  getSharedPlayerByIdRead,
} from "./player.read.repository";

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

  public async getOriginalPlayerById(args: GetOriginalPlayerByIdArgs) {
    return getOriginalPlayerByIdRead(args);
  }

  public async getSharedPlayerById(args: GetSharedPlayerByIdArgs) {
    return getSharedPlayerByIdRead(args);
  }
}
export const playerRepository = new PlayerRepository();
