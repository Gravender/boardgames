import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import type {
  GetGameMatchesOutputType,
  GetGameRolesOutputType,
} from "../../routers/game/game.output";
import type { GetLocationInputType } from "../../routers/location/location.input";
import type { WithUserIdCtx } from "../../utils/shared-args.types";
import type { GetGameArgs, GetGameRolesArgs } from "./game.service.types";
import { gameMatchesRepository } from "../../repositories/game/game-matches.repository";
import { gameRoleRepository } from "../../repositories/game/game-role.repository";
import { gameRepository } from "../../repositories/game/game.repository";
import { assertFound } from "../../utils/databaseHelpers";
import { mapRepositoryMatchRowsToMatchListOutput } from "./game-matches-list-mapping";

export type GetLocationMatchesServiceArgs = WithUserIdCtx<GetLocationInputType>;

class GameMatchesService {
  public async getGameMatches(
    args: GetGameArgs,
  ): Promise<GetGameMatchesOutputType> {
    const response = await gameMatchesRepository.getGameMatches({
      input: args.input,
      userId: args.ctx.userId,
    });
    const listScope = args.input.type === "original" ? "original" : "shared";
    return mapRepositoryMatchRowsToMatchListOutput(response.matches, listScope);
  }

  public async getLocationMatches(
    args: GetLocationMatchesServiceArgs,
  ): Promise<GetGameMatchesOutputType> {
    const response = await gameMatchesRepository.getLocationMatches({
      input: args.input,
      userId: args.ctx.userId,
    });
    const listScope = args.input.type === "original" ? "original" : "shared";
    return mapRepositoryMatchRowsToMatchListOutput(response.matches, listScope);
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
