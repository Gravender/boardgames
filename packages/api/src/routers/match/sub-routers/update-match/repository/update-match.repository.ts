import { TRPCError } from "@trpc/server";
import { differenceInSeconds } from "date-fns";
import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { match, roundPlayer } from "@board-games/db/schema";
import { vMatchPlayerCanonicalForUser } from "@board-games/db/views";

import type {
  MatchPauseRepoArgs,
  MatchResetDurationRepoArgs,
  MatchStartRepoArgs,
  UpdateMatchRoundScoreRepoArgs,
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
  public async updateMatchRoundScore(args: UpdateMatchRoundScoreRepoArgs) {
    const { input, userId } = args;

    if (input.match.type === "original") {
      const foundMatch = await db.query.match.findFirst({
        where: {
          id: input.match.id,
          createdBy: userId,
        },
      });
      if (!foundMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
    } else {
      const foundSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.id,
          sharedWithId: userId,
        },
      });
      if (!foundSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
    }
    if (input.type === "player") {
      const [foundMatchPlayer] = await db
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.match.id),
            eq(
              vMatchPlayerCanonicalForUser.baseMatchPlayerId,
              input.matchPlayerId,
            ),
            or(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
              eq(vMatchPlayerCanonicalForUser.ownerId, userId),
            ),
          ),
        );
      if (!foundMatchPlayer)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match player not found.",
        });
      if (foundMatchPlayer.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match player.",
        });
      const returnedPlayerRound = await db.query.roundPlayer.findFirst({
        where: {
          matchPlayerId: input.matchPlayerId,
          roundId: input.round.id,
        },
      });
      if (!returnedPlayerRound)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player round not found.",
        });
      await db
        .update(roundPlayer)
        .set({
          score: input.round.score,
        })
        .where(eq(roundPlayer.id, returnedPlayerRound.id));
    } else {
      const foundMatchPlayers = await db
        .select()
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalMatchId, input.match.id),
            eq(vMatchPlayerCanonicalForUser.teamId, input.teamId),
            or(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
              eq(vMatchPlayerCanonicalForUser.ownerId, userId),
            ),
          ),
        );
      if (foundMatchPlayers.length === 0)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team players not found.",
        });
      const allEditPermissions = foundMatchPlayers.every(
        (mp) => mp.permission === "edit",
      );
      if (!allEditPermissions)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match team.",
        });
      const returnedPlayerRounds = await db.query.roundPlayer.findMany({
        where: {
          matchPlayerId: {
            in: foundMatchPlayers.map((mp) => mp.baseMatchPlayerId),
          },
          roundId: input.round.id,
        },
      });
      if (returnedPlayerRounds.length === 0)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player rounds not found.",
        });
      await db
        .update(roundPlayer)
        .set({
          score: input.round.score,
        })
        .where(
          and(
            inArray(
              roundPlayer.id,
              returnedPlayerRounds.map((pr) => pr.id),
            ),
            inArray(
              roundPlayer.matchPlayerId,
              foundMatchPlayers.map((mp) => mp.baseMatchPlayerId),
            ),
          ),
        );
    }
  }
}

export const updateMatchRepository = new UpdateMatchRepository();
