import { TRPCError } from "@trpc/server";

import type { GetGameMatchesOutputType } from "../../routers/game/game.output";
import type { GameMatchesRepositoryMatchRow } from "../../repositories/game/game-matches.repository";
import {
  mapImageRowToGameImage,
  mapImageRowToPlayerImage,
} from "../../utils/image";

/**
 * Maps a shared match row from the repository into the service output shape.
 * Performs type guards (game.type, sharedGameId, sharedMatchId), builds the
 * shared game object, and maps matchPlayers with the correct playerType logic.
 */
/**
 * Maps an original match row from the repository into the service output shape.
 * Validates match/game/player types and builds original game and matchPlayers.
 */
export const mapOriginalMatchRowToOutput = (
  match: GameMatchesRepositoryMatchRow,
  userMatchPlayer:
    | GameMatchesRepositoryMatchRow["matchPlayers"][number]
    | undefined,
): GetGameMatchesOutputType[number] => {
  if (match.game.type !== "original") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Game and Match are not of the same type.",
    });
  }

  return {
    ...match,
    game: {
      id: match.game.id,
      type: "original" as const,
      name: match.game.name,
      image: mapImageRowToGameImage(match.game.image),
    },
    type: "original",
    hasUser: userMatchPlayer !== undefined,
    won: userMatchPlayer?.winner ?? false,
    matchPlayers: match.matchPlayers.map((mp) => {
      if (mp.playerType !== "original" || mp.type !== "original") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match player and Match are not of the correct type.",
        });
      }
      return {
        id: mp.id,
        playerId: mp.playerId,
        type: "original" as const,
        isUser: mp.isUser,
        name: mp.name,
        score: mp.score,
        teamId: mp.teamId,
        placement: mp.placement,
        winner: mp.winner,
        playerType: "original" as const,
        image: mapImageRowToPlayerImage(mp.image),
      };
    }),
  };
};

export const mapSharedMatchRowToOutput = (
  match: GameMatchesRepositoryMatchRow,
  userMatchPlayer:
    | GameMatchesRepositoryMatchRow["matchPlayers"][number]
    | undefined,
): GetGameMatchesOutputType[number] => {
  if (match.game.type === "original") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Game and Match are not of correct type.",
    });
  }
  if (match.game.sharedGameId === null) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Game and Match are not of the correct type.",
    });
  }
  if (match.sharedMatchId === null) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Game and Match are not of the correct type.",
    });
  }
  return {
    ...match,
    sharedMatchId: match.sharedMatchId,
    game: {
      id: match.game.id,
      name: match.game.name,
      image: mapImageRowToGameImage(match.game.image),
      linkedGameId: match.game.linkedGameId,
      sharedGameId: match.game.sharedGameId,
      type:
        match.game.type === "linked"
          ? ("linked" as const)
          : ("shared" as const),
    },
    type: "shared" as const,
    hasUser: userMatchPlayer !== undefined,
    won: userMatchPlayer?.winner ?? false,
    matchPlayers: match.matchPlayers.map((mp) => {
      if (mp.playerType === "original" || mp.type !== "shared") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match player and Match are not of the correct type.",
        });
      }
      return {
        id: mp.id,
        playerId: mp.playerId,
        type: "shared" as const,
        isUser: mp.isUser,
        name: mp.name,
        score: mp.score,
        teamId: mp.teamId,
        placement: mp.placement,
        winner: mp.winner,
        playerType:
          mp.playerType === "linked"
            ? ("linked" as const)
            : mp.playerType === "not-shared"
              ? ("not-shared" as const)
              : ("shared" as const),
        sharedPlayerId: mp.sharedPlayerId,
        linkedPlayerId: mp.linkedPlayerId,
        image: mapImageRowToPlayerImage(mp.image),
      };
    }),
  };
};

/**
 * Maps raw repository match rows to the public game/location match list output.
 * - `listScope: "original"` — list may contain both owner-visible originals and
 *   shared rows (e.g. game detail or owned location).
 * - `listScope: "shared"` — list is for a shared game or shared location; every
 *   row is mapped as a shared match.
 */
export const mapRepositoryMatchRowsToMatchListOutput = (
  matches: GameMatchesRepositoryMatchRow[],
  listScope: "original" | "shared",
): GetGameMatchesOutputType => {
  if (listScope === "original") {
    return matches.map((match) => {
      const userMatchPlayer = match.matchPlayers.find((mp) => mp.isUser);
      if (match.type === "original") {
        return mapOriginalMatchRowToOutput(match, userMatchPlayer);
      }
      return mapSharedMatchRowToOutput(match, userMatchPlayer);
    });
  }
  return matches.map((match) => {
    const userMatchPlayer = match.matchPlayers.find((mp) => mp.isUser);
    return mapSharedMatchRowToOutput(match, userMatchPlayer);
  });
};
