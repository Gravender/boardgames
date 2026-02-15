import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import type {
  GetGameMatchesOutputType,
  GetGameRolesOutputType,
} from "../../routers/game/game.output";
import type { GetGameArgs, GetGameRolesArgs } from "./game.service.types";
import { gameMatchesRepository } from "../../repositories/game/game-matches.repository";
import { gameRoleRepository } from "../../repositories/game/game-role.repository";
import { gameRepository } from "../../repositories/game/game.repository";
import { assertFound } from "../../utils/databaseHelpers";

type RepositoryMatchRow = Awaited<
  ReturnType<typeof gameMatchesRepository.getGameMatches>
>["matches"][number];

/**
 * Maps a shared match row from the repository into the service output shape.
 * Performs type guards (game.type, sharedGameId, sharedMatchId), builds the
 * shared game object, and maps matchPlayers with the correct playerType logic.
 */
const mapSharedMatch = (
  match: RepositoryMatchRow,
  userMatchPlayer: RepositoryMatchRow["matchPlayers"][number] | undefined,
) => {
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
      image: match.game.image,
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
        image: mp.image as {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "game" | "player" | "match";
        } | null,
      };
    }),
  };
};

class GameMatchesService {
  public async getGameMatches(
    args: GetGameArgs,
  ): Promise<GetGameMatchesOutputType> {
    const response = await gameMatchesRepository.getGameMatches({
      input: args.input,
      userId: args.ctx.userId,
    });
    if (args.input.type === "original") {
      return response.matches.map((match) => {
        const userMatchPlayer = match.matchPlayers.find((mp) => mp.isUser);
        if (match.type === "original") {
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
              image: match.game.image,
            },
            type: "original",
            hasUser: userMatchPlayer !== undefined,
            won: userMatchPlayer?.winner ?? false,
            matchPlayers: match.matchPlayers.map((mp) => {
              if (mp.playerType !== "original" || mp.type !== "original") {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message:
                    "Match player and Match are not of the correct type.",
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
                image: mp.image as {
                  name: string;
                  url: string | null;
                  type: "file" | "svg";
                  usageType: "game" | "player" | "match";
                } | null,
              };
            }),
          };
        } else {
          return mapSharedMatch(match, userMatchPlayer);
        }
      });
    } else {
      return response.matches.map((match) => {
        const userMatchPlayer = match.matchPlayers.find((mp) => mp.isUser);
        return mapSharedMatch(match, userMatchPlayer);
      });
    }
  }

  public async getGameRoles(
    args: GetGameRolesArgs,
  ): Promise<GetGameRolesOutputType> {
    const response = await db.transaction(async (tx) => {
      let canonicalGameId: null | number = null;
      if (args.input.type === "original") {
        const returnedGame = await gameRepository.getGame(
          {
            id: args.input.id,
            createdBy: args.ctx.userId,
          },
          tx,
        );
        assertFound(
          returnedGame,
          {
            userId: args.ctx.userId,
            value: args.input,
          },
          "Game not found.",
        );
        canonicalGameId = returnedGame.id;
      } else {
        const returnedSharedGame = await gameRepository.getSharedGame(
          {
            id: args.input.sharedGameId,
            sharedWithId: args.ctx.userId,
          },
          tx,
        );
        assertFound(
          returnedSharedGame,
          {
            userId: args.ctx.userId,
            value: args.input,
          },
          "Shared game not found.",
        );
        canonicalGameId =
          returnedSharedGame.linkedGameId ?? returnedSharedGame.gameId;
      }
      if (!canonicalGameId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to find canonical game.",
        });
      }
      return gameRoleRepository.getGameRoles({
        input: {
          sourceType: args.input.type,
          canonicalGameId,
        },
        userId: args.ctx.userId,
        tx: tx,
      });
    });
    const uniqueRoles = new Map<
      string,
      | {
          id: number;
          name: string;
          description: string | null;
          type: "original";
          permission: "edit";
        }
      | {
          name: string;
          description: string | null;
          type: "shared";
          sharedId: number;
          permission: "view" | "edit";
        }
    >();
    for (const role of response.rows) {
      if (role.type === "original" || role.type === "shared") {
        const existing = uniqueRoles.get(`${role.type}-${role.roleId}`);
        if (existing) {
          continue;
        }
        if (role.type === "original") {
          uniqueRoles.set(`${role.type}-${role.roleId}`, {
            type: "original",
            id: role.roleId,
            name: role.name,
            description: role.description,
            permission: "edit",
          });
        } else {
          if (role.sharedRoleId === null) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Shared role not found.",
            });
          }
          uniqueRoles.set(`${role.type}-${role.roleId}`, {
            type: "shared",
            sharedId: role.sharedRoleId,
            name: role.name,
            description: role.description,
            permission: role.permission,
          });
        }
      }
    }
    return Array.from(uniqueRoles.values());
  }
}

export const gameMatchesService = new GameMatchesService();
