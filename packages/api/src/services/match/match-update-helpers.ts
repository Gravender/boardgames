import { TRPCError } from "@trpc/server";

import { matchRepository } from "@board-games/api/repositories/match/match.repository";
import { assertFound } from "@board-games/api/utils/databaseHelpers";

import type { getMatchArgs } from "./update-match.service.types";

export async function getMatchForUpdate(args: getMatchArgs) {
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
        message: "Does not have permission to edit this match.",
      });
    }
    return returnedSharedMatch.match;
  }
}
