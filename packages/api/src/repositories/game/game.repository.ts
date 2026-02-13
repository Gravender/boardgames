import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import {
  game,
  match,
  matchPlayer,
  scoresheet,
  sharedGame,
} from "@board-games/db/schema";

import type { CreateGameArgs, UpdateGameArgs } from "./game.repository.types";

interface GameBaseFilter {
  id: NonNullable<Filter<"game">["id"]>;
  createdBy: NonNullable<Filter<"game">["createdBy"]>;
}

class GameRepository {
  public async getGame<TConfig extends QueryConfig<"game">>(
    filters: GameBaseFilter & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"game", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, createdBy, ...queryConfig } = filters;
    const result = await database.query.game.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        id,
        createdBy,
        deletedAt: { isNull: true },
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"game", TConfig> | undefined;
  }

  public async getGameWithLinkedGames(
    filters: GameBaseFilter,
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const { id, createdBy } = filters;
    const result = await database.query.game.findFirst({
      where: {
        id: id,
        createdBy: createdBy,
      },
      with: {
        linkedGames: {
          where: {
            sharedWithId: createdBy,
          },
        },
      },
    });
    return result;
  }

  public async getSharedGame<TConfig extends QueryConfig<"sharedGame">>(
    filters: {
      id: NonNullable<Filter<"sharedGame">["id"]>;
      sharedWithId: NonNullable<Filter<"sharedGame">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedGame", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedGame.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        id: id,
        sharedWithId: sharedWithId,
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"sharedGame", TConfig> | undefined;
  }

  public async getSharedGameByGameId<TConfig extends QueryConfig<"sharedGame">>(
    filters: {
      gameId: NonNullable<Filter<"sharedGame">["gameId"]>;
      sharedWithId: NonNullable<Filter<"sharedGame">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedGame", TConfig> | undefined> {
    const database = tx ?? db;
    const { gameId, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedGame.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        gameId: gameId,
        sharedWithId: sharedWithId,
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"sharedGame", TConfig> | undefined;
  }

  public async createGame(args: CreateGameArgs) {
    const { input, userId, tx } = args;
    const database = tx ?? db;
    const [returningGame] = await database
      .insert(game)
      .values({
        name: input.name,
        ownedBy: input.ownedBy,
        playersMin: input.playersMin,
        playersMax: input.playersMax,
        playtimeMin: input.playtimeMin,
        playtimeMax: input.playtimeMax,
        yearPublished: input.yearPublished,
        description: input.description,
        rules: input.rules,
        imageId: input.imageId,
        createdBy: userId,
      })
      .returning();
    return returningGame;
  }

  public async updateGame(args: UpdateGameArgs) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [updatedGame] = await database
      .update(game)
      .set({
        name: input.name,
        ownedBy: input.ownedBy,
        playersMin: input.playersMin,
        playersMax: input.playersMax,
        playtimeMin: input.playtimeMin,
        playtimeMax: input.playtimeMax,
        yearPublished: input.yearPublished,
        imageId: input.imageId,
      })
      .where(eq(game.id, input.id))
      .returning();
    return updatedGame;
  }

  public async getGamesForUser(userId: string) {
    return db.query.game.findMany({
      columns: {
        id: true,
        name: true,
        createdAt: true,
        playersMin: true,
        playersMax: true,
        playtimeMin: true,
        playtimeMax: true,
        yearPublished: true,
        ownedBy: true,
      },
      where: {
        createdBy: userId,
        deletedAt: {
          isNull: true,
        },
      },
      with: {
        image: true,
        matches: {
          where: { finished: true },
          orderBy: { date: "desc" },
          with: {
            location: true,
          },
        },
        sharedGameMatches: {
          where: { sharedWithId: userId },
          with: {
            match: {
              where: { finished: true },
            },
            sharedLocation: {
              with: {
                location: true,
                linkedLocation: true,
              },
            },
          },
        },
      },
    });
  }

  public async getUnlinkedSharedGames(userId: string) {
    return db.query.sharedGame.findMany({
      where: {
        linkedGameId: {
          isNull: true,
        },
        sharedWithId: userId,
      },
      with: {
        game: {
          with: {
            image: true,
          },
        },
        sharedMatches: {
          where: { sharedWithId: userId },
          with: {
            match: {
              where: { finished: true },
              columns: {
                id: true,
                date: true,
              },
            },
            sharedLocation: {
              with: {
                location: true,
                linkedLocation: true,
              },
            },
          },
        },
      },
    });
  }

  public async getGameForSharing(args: { gameId: number; userId: string }) {
    return db.query.game.findFirst({
      where: {
        id: args.gameId,
        createdBy: args.userId,
        deletedAt: {
          isNull: true,
        },
      },
      with: {
        matches: {
          with: {
            matchPlayers: {
              with: {
                player: true,
                team: true,
              },
            },
            location: true,
            teams: true,
          },
          orderBy: (matches, { desc }) => [desc(matches.date)],
        },
        scoresheets: true,
        image: true,
      },
    });
  }

  public async softDeleteGame(args: { gameId: number; userId: string }) {
    return db.transaction(async (tx) => {
      await tx
        .update(sharedGame)
        .set({ linkedGameId: null })
        .where(
          and(
            eq(sharedGame.linkedGameId, args.gameId),
            eq(sharedGame.sharedWithId, args.userId),
          ),
        );

      const updatedMatches = await tx
        .update(match)
        .set({ deletedAt: new Date() })
        .where(
          and(eq(match.gameId, args.gameId), eq(match.createdBy, args.userId)),
        )
        .returning();

      if (updatedMatches.length > 0) {
        await tx
          .update(matchPlayer)
          .set({ deletedAt: new Date() })
          .where(
            inArray(
              matchPlayer.matchId,
              updatedMatches.map((uMatch) => uMatch.id),
            ),
          );
      }

      await tx
        .update(scoresheet)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(scoresheet.gameId, args.gameId),
            eq(scoresheet.createdBy, args.userId),
          ),
        );

      const [deletedGame] = await tx
        .update(game)
        .set({ deletedAt: new Date() })
        .where(and(eq(game.id, args.gameId), eq(game.createdBy, args.userId)))
        .returning();

      if (!deletedGame) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete game",
        });
      }

      return deletedGame;
    });
  }
}

export const gameRepository = new GameRepository();
