import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { game, shareRequest } from "@board-games/db/schema";

import type { RequestShareGameInputType } from "../../routers/sharing/sharing.input";
import type { RequestShareGameOutputType } from "../../routers/sharing/sharing.output";
import { assertShareGamePayloadValid } from "./validate-share-game-payload";
import { requestShareGameToFriend } from "./request-share-game.workflow";

export async function executeRequestShareGame(args: {
  db: {
    transaction: <T>(fn: (tx: TransactionType) => Promise<T>) => Promise<T>;
  };
  userId: string;
  input: RequestShareGameInputType;
}): Promise<RequestShareGameOutputType> {
  const { db, userId, input } = args;

  return db.transaction(async (tx) => {
    const [returnedGame] = await tx
      .select()
      .from(game)
      .where(and(eq(game.id, input.gameId), eq(game.createdBy, userId)));
    if (!returnedGame) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shared Game not found",
      });
    }

    if (input.type === "link") {
      await assertShareGamePayloadValid(tx, {
        userId,
        gameId: input.gameId,
        sharedMatches: input.sharedMatches,
        scoresheetIds: input.scoresheetsToShare.map((s) => s.scoresheetId),
        gameRolesToShare: input.gameRolesToShare ?? [],
      });
      const [newShare] = await tx
        .insert(shareRequest)
        .values({
          ownerId: userId,
          sharedWithId: null,
          itemType: "game",
          itemId: input.gameId,
          permission: input.permission,
          expiresAt: input.expiresAt ?? null,
        })
        .returning();

      if (!newShare) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share.",
        });
      }
      const shareMessages: {
        success: boolean;
        message: string;
      }[] = [];

      for (const matchToShare of input.sharedMatches) {
        const returnedMatch = await tx.query.match.findFirst({
          where: {
            id: matchToShare.matchId,
            createdBy: userId,
          },
          with: {
            matchPlayers: {
              with: {
                player: true,
              },
            },
          },
        });
        if (!returnedMatch) {
          shareMessages.push({
            success: false,
            message: `Match ${matchToShare.matchId} not found.`,
          });
          continue;
        }

        const includeLocation = matchToShare.includeLocation !== false;
        if (returnedMatch.locationId && includeLocation) {
          await tx.insert(shareRequest).values({
            ownerId: userId,
            sharedWithId: null,
            itemType: "location",
            itemId: returnedMatch.locationId,
            permission: matchToShare.permission,
            parentShareId: newShare.id,
            expiresAt: input.expiresAt ?? null,
          });
        }

        await tx.insert(shareRequest).values({
          ownerId: userId,
          sharedWithId: null,
          itemType: "match",
          itemId: matchToShare.matchId,
          permission: matchToShare.permission,
          parentShareId: newShare.id,
          expiresAt: input.expiresAt ?? null,
        });
        if (matchToShare.includePlayers) {
          const playersToShare = matchToShare.playerIds?.length
            ? returnedMatch.matchPlayers.filter((mp) =>
                matchToShare.playerIds!.includes(mp.player.id),
              )
            : returnedMatch.matchPlayers;
          for (const matchPlayer of playersToShare) {
            await tx.insert(shareRequest).values({
              ownerId: userId,
              sharedWithId: null,
              itemType: "player",
              itemId: matchPlayer.player.id,
              permission: "view",
              parentShareId: newShare.id,
              expiresAt: input.expiresAt ?? null,
            });
          }
        }
      }
      for (const scoresheetToShare of input.scoresheetsToShare) {
        await tx.insert(shareRequest).values({
          ownerId: userId,
          sharedWithId: null,
          itemType: "scoresheet",
          itemId: scoresheetToShare.scoresheetId,
          permission: scoresheetToShare.permission,
          parentShareId: newShare.id,
          expiresAt: input.expiresAt ?? null,
        });
      }
      for (const roleToShare of input.gameRolesToShare ?? []) {
        await tx.insert(shareRequest).values({
          ownerId: userId,
          sharedWithId: null,
          itemType: "game_role",
          itemId: roleToShare.gameRoleId,
          permission: roleToShare.permission,
          parentShareId: newShare.id,
          expiresAt: input.expiresAt ?? null,
        });
      }
      return {
        success: true,
        message: "Created share Link",
        shareableUrl: `/share/${newShare.token}`,
        shareMessages,
      };
    }

    const shareMessages: {
      success: boolean;
      message: string;
    }[] = [];

    for (const friendRow of input.friends) {
      await assertShareGamePayloadValid(tx, {
        userId,
        gameId: input.gameId,
        sharedMatches: friendRow.sharedMatches,
        scoresheetIds: friendRow.scoresheetsToShare.map((s) => s.scoresheetId),
        gameRolesToShare: friendRow.gameRolesToShare ?? [],
      });
    }

    for (const friendToShareTo of input.friends) {
      const { id: friendId, ...recipientPayload } = friendToShareTo;
      const result2 = await requestShareGameToFriend(
        tx,
        { id: friendId },
        shareMessages,
        userId,
        {
          gameId: input.gameId,
          expiresAt: input.expiresAt,
          permission: recipientPayload.permission,
          sharedMatches: recipientPayload.sharedMatches,
          scoresheetsToShare: recipientPayload.scoresheetsToShare,
          gameRolesToShare: recipientPayload.gameRolesToShare ?? [],
        },
        returnedGame,
      );
      if (!result2) {
        continue;
      }
      shareMessages.push({
        success: true,
        message: `Shared ${returnedGame.name} with ${friendId}`,
      });
    }
    return {
      success: shareMessages.filter((m) => m.success).length > 0,
      message: `Shared ${returnedGame.name} with ${shareMessages.filter((m) => m.success).length} friends / ${shareMessages.length} friends`,
      shareMessages,
    };
  });
}
