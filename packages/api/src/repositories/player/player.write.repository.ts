import { and, eq, isNull } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import {
  matchPlayer,
  player,
  sharedMatchPlayer,
  sharedPlayer,
} from "@board-games/db/schema";

class PlayerWriteRepository {
  /** Single query: player row for share flow (heavy relation graph). */
  public async getPlayerForShare(args: {
    id: number;
    createdBy: string;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    return database.query.player.findFirst({
      where: {
        id: args.id,
        createdBy: args.createdBy,
        deletedAt: { isNull: true },
      },
      with: {
        image: true,
        matchPlayers: {
          with: {
            match: {
              with: {
                matchPlayers: {
                  with: {
                    player: true,
                    team: true,
                  },
                },
                game: {
                  with: {
                    image: true,
                  },
                },
                location: true,
                teams: true,
              },
            },
          },
        },
      },
    });
  }

  /** Single query: verify active owned player exists. */
  public async findActiveOwnedPlayerId(args: {
    playerId: number;
    createdBy: string;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    return database.query.player.findFirst({
      columns: { id: true },
      where: {
        id: args.playerId,
        createdBy: args.createdBy,
        deletedAt: { isNull: true },
      },
    });
  }

  /** Single statement: soft-delete all match_player rows for a player. */
  public async markMatchPlayersDeletedForPlayerId(args: {
    playerId: number;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    return database
      .update(matchPlayer)
      .set({ deletedAt: new Date() })
      .where(eq(matchPlayer.playerId, args.playerId))
      .returning();
  }

  /** Single query: matches (with players + scoresheet) for placement recompute. */
  public async listMatchesForPlacementRecompute(args: {
    matchIds: number[];
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    if (args.matchIds.length === 0) {
      return [];
    }
    return database.query.match.findMany({
      where: {
        id: {
          in: args.matchIds,
        },
      },
      with: {
        matchPlayers: {
          with: {
            playerRounds: true,
          },
        },
        scoresheet: true,
      },
    });
  }

  /** Single statement: update one match_player placement/score/winner. */
  public async updateMatchPlayerPlacementScoreAndWinner(args: {
    matchPlayerId: number;
    placement: number;
    score: number | null;
    winner: boolean;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    const [row] = await database
      .update(matchPlayer)
      .set({
        placement: args.placement,
        score: args.score,
        winner: args.winner,
      })
      .where(eq(matchPlayer.id, args.matchPlayerId))
      .returning({ id: matchPlayer.id });
    return row;
  }

  /** Single statement: soft-delete owned player row. */
  public async softDeleteOwnedPlayerRow(args: {
    playerId: number;
    createdBy: string;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    const [row] = await database
      .update(player)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(player.id, args.playerId),
          eq(player.createdBy, args.createdBy),
          isNull(player.deletedAt),
        ),
      )
      .returning({ id: player.id });
    return row !== undefined;
  }

  /** Single statement: unlink linked_player_id for recipient shares. */
  public async clearLinkedPlayerOnSharedPlayersForUser(args: {
    recipientUserId: string;
    linkedPlayerId: number;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    await database
      .update(sharedPlayer)
      .set({ linkedPlayerId: null })
      .where(
        and(
          eq(sharedPlayer.sharedWithId, args.recipientUserId),
          eq(sharedPlayer.linkedPlayerId, args.linkedPlayerId),
        ),
      );
  }

  /** Single query: shared_player row visible to recipient. */
  public async findSharedPlayerIdForRecipient(args: {
    sharedPlayerId: number;
    sharedWithId: string;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    return database.query.sharedPlayer.findFirst({
      columns: { id: true },
      where: {
        id: args.sharedPlayerId,
        sharedWithId: args.sharedWithId,
      },
    });
  }

  /** Single statement: detach shared_match_player.shared_player_id for recipient. */
  public async clearSharedMatchPlayerSharedPlayerRefs(args: {
    sharedPlayerId: number;
    sharedWithId: string;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    await database
      .update(sharedMatchPlayer)
      .set({ sharedPlayerId: null })
      .where(
        and(
          eq(sharedMatchPlayer.sharedPlayerId, args.sharedPlayerId),
          eq(sharedMatchPlayer.sharedWithId, args.sharedWithId),
        ),
      );
  }

  /** Single statement: delete shared_player for recipient. */
  public async deleteSharedPlayerRowForRecipient(args: {
    sharedPlayerId: number;
    sharedWithId: string;
    tx?: TransactionType;
  }) {
    const database = args.tx ?? db;
    const deleted = await database
      .delete(sharedPlayer)
      .where(
        and(
          eq(sharedPlayer.id, args.sharedPlayerId),
          eq(sharedPlayer.sharedWithId, args.sharedWithId),
        ),
      )
      .returning({ id: sharedPlayer.id });
    return deleted.length > 0;
  }
}

export const playerWriteRepository = new PlayerWriteRepository();
