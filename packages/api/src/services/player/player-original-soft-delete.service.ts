import type { TransactionType } from "@board-games/db/client";
import { TRPCError } from "@trpc/server";
import { calculatePlacement } from "@board-games/shared";

import { recomputeMatchPlayerPlacements } from "../../repositories/player/player-delete-placement.helpers";
import { playerWriteRepository } from "../../repositories/player/player.write.repository";

const notFoundPlayer = () =>
  new TRPCError({
    code: "NOT_FOUND",
    message: "Player not found.",
  });

/**
 * Orchestrates original-player soft delete inside an existing transaction.
 * Each persistence step delegates to {@link playerWriteRepository} (one DB operation per call).
 * Fails fast with NOT_FOUND before any mutating statements if the player is missing or not owned.
 */
export const runOriginalPlayerSoftDeleteInTransaction = async (
  tx: TransactionType,
  args: {
    playerId: number;
    createdBy: string;
    sharedWithIdForUnlink: string;
  },
): Promise<void> => {
  const owned = await playerWriteRepository.findActiveOwnedPlayerId({
    playerId: args.playerId,
    createdBy: args.createdBy,
    tx,
  });
  if (!owned) {
    throw notFoundPlayer();
  }

  const updatedMatchPlayers =
    await playerWriteRepository.markMatchPlayersDeletedForPlayerId({
      playerId: args.playerId,
      tx,
    });

  const matchIds = [...new Set(updatedMatchPlayers.map((r) => r.matchId))];
  if (matchIds.length > 0) {
    const matches =
      await playerWriteRepository.listMatchesForPlacementRecompute({
        matchIds,
        tx,
      });

    for (const returnedMatch of matches) {
      if (!returnedMatch.finished) {
        continue;
      }
      if (returnedMatch.scoresheet.winCondition === "Manual") {
        continue;
      }

      const finalPlacements = calculatePlacement(
        returnedMatch.matchPlayers.map((mPlayer) => ({
          id: mPlayer.id,
          rounds: mPlayer.playerRounds.map((pRound) => ({
            score: pRound.score,
          })),
          teamId: mPlayer.teamId,
        })),
        returnedMatch.scoresheet,
      );
      const recomputedPlacements = recomputeMatchPlayerPlacements(
        returnedMatch.matchPlayers.map((mPlayer) => ({
          id: mPlayer.id,
          placement: mPlayer.placement,
        })),
        finalPlacements,
      );

      for (const placement of recomputedPlacements) {
        await playerWriteRepository.updateMatchPlayerPlacementScoreAndWinner({
          matchPlayerId: placement.id,
          placement: placement.placement,
          score: placement.score,
          winner: placement.placement === 1,
          tx,
        });
      }
    }
  }

  const softDeleted = await playerWriteRepository.softDeleteOwnedPlayerRow({
    playerId: args.playerId,
    createdBy: args.createdBy,
    tx,
  });
  if (!softDeleted) {
    throw notFoundPlayer();
  }

  await playerWriteRepository.clearLinkedPlayerOnSharedPlayersForUser({
    recipientUserId: args.sharedWithIdForUnlink,
    linkedPlayerId: args.playerId,
    tx,
  });
};
