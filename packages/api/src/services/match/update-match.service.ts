import { TRPCError } from "@trpc/server";
import { differenceInSeconds } from "date-fns";

import { db } from "@board-games/db/client";

import type {
  getMatchArgs,
  MatchPauseArgs,
  MatchResetDurationArgs,
  MatchStartArgs,
  UpdateMatchCommentArgs,
  UpdateMatchDetailsArgs,
  UpdateMatchManualWinnerArgs,
  UpdateMatchPlacementsArgs,
  UpdateMatchPlayerScoreArgs,
  UpdateMatchPlayerTeamAndRolesArgs,
  UpdateMatchScoreArgs,
  UpdateMatchTeamArgs,
} from "./update-match.service.types";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { updateMatchRepository } from "../../repositories/match/update-match.repository";
import { assertFound } from "../../utils/databaseHelpers";

class UpdateMatchService {
  private async getMatch(args: getMatchArgs) {
    const { input, ctx, tx } = args;
    if (input.type === "original") {
      const returnedMatch = await matchRepository.get(
        {
          id: input.id,
          createdBy: ctx.userId,
        },
        tx,
      );
      assertFound(
        returnedMatch,
        {
          userId: ctx.userId,
          value: input,
        },
        "Match not found.",
      );
      return returnedMatch;
    } else {
      const returnedSharedMatch = await matchRepository.getShared({
        id: input.sharedMatchId,
        sharedWithId: ctx.userId,
        with: {
          match: true,
        },
        tx,
      });
      assertFound(
        returnedSharedMatch,
        {
          userId: ctx.userId,
          value: input,
        },
        "Shared match not found.",
      );
      if (returnedSharedMatch.permission !== "edit") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to pause this match.",
        });
      }
      return returnedSharedMatch.match;
    }
  }
  public async matchStart(args: MatchStartArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await this.getMatch({ input, ctx, tx });
      await updateMatchRepository.matchStart({
        input: { id: returnedMatch.id },
        tx,
      });
    });
  }
  public async matchPause(args: MatchPauseArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const currentTime = new Date();

      const returnedMatch = await this.getMatch({ input, ctx, tx });
      if (returnedMatch.running === false) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match is not running.",
        });
      }
      if (!returnedMatch.startTime) {
        await ctx.posthog.captureImmediate({
          distinctId: ctx.userId,
          event: "Match Pause Error",
          properties:
            input.type === "original"
              ? {
                  matchId: returnedMatch.id,
                  gameId: returnedMatch.gameId,
                }
              : {
                  sharedMatchId: input.sharedMatchId,
                  matchId: returnedMatch.id,
                  gameId: returnedMatch.gameId,
                },
        });
        await updateMatchRepository.matchPause({
          input: { id: returnedMatch.id, duration: returnedMatch.duration },
          tx,
        });
      } else {
        const timeDelta = differenceInSeconds(
          currentTime,
          returnedMatch.startTime,
        );
        const accumulatedDuration = returnedMatch.duration + timeDelta;
        await updateMatchRepository.matchPause({
          input: { id: returnedMatch.id, duration: accumulatedDuration },
          tx,
        });
      }
    });
  }
  public async matchResetDuration(args: MatchResetDurationArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await this.getMatch({ input, ctx, tx });

      await updateMatchRepository.matchResetDuration({
        input: { id: returnedMatch.id },
        tx,
      });
    });
  }
  public async updateMatchRoundScore(args: UpdateMatchScoreArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await this.getMatch({
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
        });
      }
    });
  }
  public async updateMatchPlayerScore(args: UpdateMatchPlayerScoreArgs) {
    return updateMatchRepository.updateMatchPlayerScore({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async updateMatchFinish(args: MatchStartArgs) {
    return updateMatchRepository.updateMatchFinish({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async updateMatchFinalScores(args: MatchStartArgs) {
    return updateMatchRepository.updateMatchFinalScores({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async updateMatchManualWinner(args: UpdateMatchManualWinnerArgs) {
    return updateMatchRepository.updateMatchManualWinner({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async updateMatchPlacements(args: UpdateMatchPlacementsArgs) {
    return updateMatchRepository.updateMatchPlacements({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async updateMatchComment(args: UpdateMatchCommentArgs) {
    return updateMatchRepository.updateMatchComment({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async updateMatchDetails(args: UpdateMatchDetailsArgs) {
    return updateMatchRepository.updateMatchDetails({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async updateMatchPlayerTeamAndRoles(
    args: UpdateMatchPlayerTeamAndRolesArgs,
  ) {
    return updateMatchRepository.updateMatchPlayerTeamAndRoles({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async updateMatchTeam(args: UpdateMatchTeamArgs) {
    return updateMatchRepository.updateMatchTeam({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
}

export const updateMatchService = new UpdateMatchService();
