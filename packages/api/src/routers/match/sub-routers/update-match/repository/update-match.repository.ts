import { TRPCError } from "@trpc/server";
import { differenceInSeconds } from "date-fns";
import { and, eq } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { match } from "@board-games/db/schema";

import type {
  MatchPauseRepoArgs,
  MatchResetDurationRepoArgs,
  MatchStartRepoArgs,
} from "./update-match.repository.types";

class UpdateMatchRepository {
  public async matchStart(args: MatchStartRepoArgs) {
    const { input, userId } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: { id: input.id, createdBy: userId, deletedAt: { isNull: true } },
      });
      if (!returnedMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      await db
        .update(match)
        .set({ running: true, finished: false, startTime: new Date() })
        .where(and(eq(match.id, input.id), eq(match.createdBy, userId)));
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: { matchId: input.id, sharedWithId: userId },
      });
      if (!returnedSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (returnedSharedMatch.permission !== "edit") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to start this match.",
        });
      }
      await db
        .update(match)
        .set({ running: true, finished: false, startTime: new Date() })
        .where(eq(match.id, input.id));
    }
  }
  public async matchPause(args: MatchPauseRepoArgs) {
    const { input, userId } = args;
    const currentTime = new Date();
    if (input.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: { id: input.id, createdBy: userId },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      if (foundMatch.running === false)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match is not running.",
        });
      if (!foundMatch.startTime)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match start time is not set.",
        });
      const timeDelta = differenceInSeconds(currentTime, foundMatch.startTime);
      const accumulatedDuration = foundMatch.duration + timeDelta;
      await db
        .update(match)
        .set({
          duration: accumulatedDuration,
          running: false,
          startTime: null,
          endTime: new Date(),
        })
        .where(eq(match.id, input.id));
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: { matchId: input.id, sharedWithId: userId },
      });
      if (!returnedSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (returnedSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to pause this match.",
        });
      const foundMatch = await db.query.match.findFirst({
        where: { id: input.id },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      if (foundMatch.running === false)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match is not running.",
        });
      if (!foundMatch.startTime)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match start time is not set.",
        });
      const timeDelta = differenceInSeconds(currentTime, foundMatch.startTime);
      const accumulatedDuration = foundMatch.duration + timeDelta;
      await db
        .update(match)
        .set({
          duration: accumulatedDuration,
          running: false,
          startTime: null,
          endTime: new Date(),
        })
        .where(eq(match.id, input.id));
    }
  }
  public async matchResetDuration(args: MatchResetDurationRepoArgs) {
    const { input, userId } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: { id: input.id, createdBy: userId },
      });
      if (!returnedMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      await db
        .update(match)
        .set({ duration: 0, running: false, startTime: null })
        .where(and(eq(match.id, input.id), eq(match.createdBy, userId)));
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: { matchId: input.id, sharedWithId: userId },
      });
      if (!returnedSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (returnedSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to reset this match.",
        });
      await db
        .update(match)
        .set({ duration: 0, running: false, startTime: null })
        .where(eq(match.id, input.id));
    }
  }
}

export const updateMatchRepository = new UpdateMatchRepository();
