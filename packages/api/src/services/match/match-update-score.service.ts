import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";
import { calculatePlacement } from "@board-games/shared";

import type {
  MatchStartArgs,
  UpdateMatchManualWinnerArgs,
  UpdateMatchPlacementsArgs,
  UpdateMatchPlayerScoreArgs,
  UpdateMatchScoreArgs,
} from "./update-match.service.types";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { matchUpdateStateRepository } from "../../repositories/match/match-update-state.repository";
import { matchUpdatePlayerScoreRepository } from "../../repositories/match/match-update-player-score.repository";
import { assertFound } from "../../utils/databaseHelpers";
import { getMatchForUpdate } from "./match-update-helpers";

class MatchUpdateScoreService {

  public async updateMatchRoundScore(args: UpdateMatchScoreArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({
        input: input.match,
        ctx,
        tx,
      });

      if (input.type === "player") {
        const returnedMatchPlayer =
          await matchPlayerRepository.getFromViewCanonicalForUser({
            input: {
              id: input.matchPlayerId,
              matchId: returnedMatch.id,
              userId: ctx.userId,
            },
            tx,
          });
        assertFound(
          returnedMatchPlayer,
          {
            userId: ctx.userId,
            value: input,
          },
          "Match player not found.",
        );
        if (returnedMatchPlayer.permission !== "edit") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Does not have permission to edit this match player.",
          });
        }
        const returnedRoundPlayer = await matchPlayerRepository.getRoundPlayer({
          input: {
            roundId: input.round.id,
            matchPlayerId: input.matchPlayerId,
          },
          tx,
        });
        assertFound(
          returnedRoundPlayer,
          {
            userId: ctx.userId,
            value: input,
          },
          "Round player not found.",
        );
        await matchPlayerRepository.updateRoundPlayer({
          input: {
            id: returnedRoundPlayer.id,
            score: input.round.score,
          },
          tx,
        });
      } else {
        const returnedMatchPlayers =
          await matchPlayerRepository.getMatchPlayersByTeamFromViewCanonicalForUser(
            {
              input: {
                matchId: returnedMatch.id,
                teamId: input.teamId,
                userId: ctx.userId,
              },
              tx,
            },
          );
        if (returnedMatchPlayers.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team players not found.",
          });
        }
        const allEditPermissions = returnedMatchPlayers.every(
          (mp) => mp.permission === "edit",
        );
        if (!allEditPermissions) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Does not have permission to edit this match team.",
          });
        }
        const returnedPlayerRounds =
          await matchPlayerRepository.getRoundPlayers({
            input: {
              roundId: input.round.id,
              matchPlayerIds: returnedMatchPlayers.map(
                (mp) => mp.baseMatchPlayerId,
              ),
            },
            tx,
          });
        if (returnedPlayerRounds.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Player rounds not found.",
          });
        }
        if (returnedPlayerRounds.length !== returnedMatchPlayers.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Player rounds not found.",
          });
        }
        await matchPlayerRepository.updateRoundPlayers({
          input: {
            roundId: input.round.id,
            matchPlayerIds: returnedMatchPlayers.map(
              (mp) => mp.baseMatchPlayerId,
            ),
            score: input.round.score,
          },
          tx,
        });
      }
    });
  }

  public async updateMatchPlayerScore(args: UpdateMatchPlayerScoreArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({
        input: input.match,
        ctx,
        tx,
      });

      if (input.type === "player") {
        const returnedMatchPlayer =
          await matchPlayerRepository.getFromViewCanonicalForUser({
            input: {
              id: input.matchPlayerId,
              matchId: returnedMatch.id,
              userId: ctx.userId,
            },
            tx,
          });
        assertFound(
          returnedMatchPlayer,
          {
            userId: ctx.userId,
            value: input,
          },
          "Match player not found.",
        );
        if (returnedMatchPlayer.permission !== "edit") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Does not have permission to edit this match player.",
          });
        }
        await matchUpdatePlayerScoreRepository.updateMatchPlayerScore({
          input: {
            id: input.matchPlayerId,
            score: input.score,
          },
          tx,
        });
      } else {
        const returnedMatchPlayers =
          await matchPlayerRepository.getMatchPlayersByTeamFromViewCanonicalForUser(
            {
              input: {
                matchId: returnedMatch.id,
                teamId: input.teamId,
                userId: ctx.userId,
              },
              tx,
            },
          );
        if (returnedMatchPlayers.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team players not found.",
          });
        }
        const allEditPermissions = returnedMatchPlayers.every(
          (mp) => mp.permission === "edit",
        );
        if (!allEditPermissions) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Does not have permission to edit this match team.",
          });
        }
        await matchUpdatePlayerScoreRepository.updateMatchPlayersScore({
          input: {
            matchId: returnedMatch.id,
            matchPlayerIds: returnedMatchPlayers.map(
              (mp) => mp.baseMatchPlayerId,
            ),
            score: input.score,
          },
          tx,
        });
      }
    });
  }

  public async updateMatchFinalScores(args: MatchStartArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({ input, ctx, tx });

      const matchWithData = await matchRepository.get(
        {
          id: returnedMatch.id,
          createdBy: ctx.userId,
          with: {
            scoresheet: true,
            matchPlayers: {
              with: {
                playerRounds: true,
              },
            },
          },
        },
        tx,
      );
      assertFound(
        matchWithData,
        {
          userId: ctx.userId,
          value: input,
        },
        "Match not found.",
      );

      const finalPlacements = calculatePlacement(
        matchWithData.matchPlayers.map((mp) => ({
          id: mp.id,
          rounds: mp.playerRounds.map((pr) => ({ score: pr.score })),
          teamId: mp.teamId,
        })),
        matchWithData.scoresheet,
      );

      if (finalPlacements.length > 0) {
        await matchUpdatePlayerScoreRepository.updateMatchPlayersScorePlacementAndWinner(
          {
            input: {
              matchId: returnedMatch.id,
              placements: finalPlacements
                .filter((p) => p.score !== null)
                .map((p) => ({
                  id: p.id,
                  score: p.score!,
                  placement: p.placement,
                })),
            },
            tx,
          },
        );
      }
    });
  }

  public async updateMatchManualWinner(args: UpdateMatchManualWinnerArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({
        input: input.match,
        ctx,
        tx,
      });

      const foundMatchPlayers =
        await matchPlayerRepository.getAllMatchPlayersFromViewCanonicalForUser(
          {
            input: {
              matchId: returnedMatch.id,
              userId: ctx.userId,
            },
            tx,
          },
        );
      if (foundMatchPlayers.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match players not found.",
        });
      }
      const allEditPermissions = foundMatchPlayers.every(
        (mp) => mp.permission === "edit",
      );
      if (!allEditPermissions) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit these match players.",
        });
      }

      await matchUpdateStateRepository.updateMatchFinished({
        input: { id: returnedMatch.id, finished: true },
        tx,
      });

      await matchUpdatePlayerScoreRepository.updateMatchPlayersWinner({
        input: {
          matchId: returnedMatch.id,
          winners: input.winners,
        },
        tx,
      });
    });
  }

  public async updateMatchPlacements(args: UpdateMatchPlacementsArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({
        input: input.match,
        ctx,
        tx,
      });

      const foundMatchPlayers =
        await matchPlayerRepository.getAllMatchPlayersFromViewCanonicalForUser(
          {
            input: {
              matchId: returnedMatch.id,
              userId: ctx.userId,
            },
            tx,
          },
        );
      if (foundMatchPlayers.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match players not found.",
        });
      }
      const allEditPermissions = foundMatchPlayers.every(
        (mp) => mp.permission === "edit",
      );
      if (!allEditPermissions) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit these match players.",
        });
      }

      await matchUpdateStateRepository.updateMatchFinished({
        input: { id: returnedMatch.id, finished: true },
        tx,
      });

      await matchUpdatePlayerScoreRepository.updateMatchPlayersPlacementAndWinner(
        {
          input: {
            placements: input.playersPlacement
              .filter((p) => p.placement !== null)
              .map((p) => ({
                id: p.id,
                placement: p.placement!,
              })),
          },
          tx,
        },
      );
    });
  }
}

export const matchUpdateScoreService = new MatchUpdateScoreService();

