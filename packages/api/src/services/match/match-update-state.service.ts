import { TRPCError } from "@trpc/server";
import { differenceInSeconds } from "date-fns";

import { db } from "@board-games/db/client";

import type {
  MatchPauseArgs,
  MatchResetDurationArgs,
  MatchStartArgs,
  UpdateMatchCommentArgs,
} from "./update-match.service.types";
import { matchUpdateStateRepository } from "../../repositories/match/match-update-state.repository";
import { getMatchForUpdate } from "./match-update-helpers";

class MatchUpdateStateService {
  public async matchStart(args: MatchStartArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({ input, ctx, tx });
      await matchUpdateStateRepository.matchStart({
        input: { id: returnedMatch.id },
        tx,
      });
    });
  }

  public async matchPause(args: MatchPauseArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const currentTime = new Date();

      const returnedMatch = await getMatchForUpdate({ input, ctx, tx });
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
        await matchUpdateStateRepository.matchPause({
          input: { id: returnedMatch.id, duration: returnedMatch.duration },
          tx,
        });
      } else {
        const timeDelta = differenceInSeconds(
          currentTime,
          returnedMatch.startTime,
        );
        const accumulatedDuration = returnedMatch.duration + timeDelta;
        await matchUpdateStateRepository.matchPause({
          input: { id: returnedMatch.id, duration: accumulatedDuration },
          tx,
        });
      }
    });
  }

  public async matchResetDuration(args: MatchResetDurationArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({ input, ctx, tx });

      await matchUpdateStateRepository.matchResetDuration({
        input: { id: returnedMatch.id },
        tx,
      });
    });
  }

  public async updateMatchFinish(args: MatchStartArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({ input, ctx, tx });

      const currentTime = new Date();
      let duration = returnedMatch.duration;
      let startTime: Date | null = null;

      if (returnedMatch.running && returnedMatch.startTime) {
        const timeDelta = differenceInSeconds(
          currentTime,
          returnedMatch.startTime,
        );
        duration = returnedMatch.duration + timeDelta;
      }

      await matchUpdateStateRepository.finishMatch({
        input: {
          id: returnedMatch.id,
          duration,
          running: false,
          startTime,
          endTime: currentTime,
          finished: true,
        },
        tx,
      });
    });
  }

  public async updateMatchComment(args: UpdateMatchCommentArgs) {
    const { input, ctx } = args;
    await db.transaction(async (tx) => {
      const returnedMatch = await getMatchForUpdate({
        input: input.match,
        ctx,
        tx,
      });

      await matchUpdateStateRepository.updateMatchComment({
        input: {
          matchId: returnedMatch.id,
          comment: input.comment,
        },
        tx,
      });
    });
  }
}

export const matchUpdateStateService = new MatchUpdateStateService();
