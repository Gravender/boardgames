import { TRPCError } from "@trpc/server";

import type {
  GetGameMatchesOutputType,
  GetGameRolesOutputType,
} from "../../../routers/game/game.output";
import type { GetGameArgs, GetGameRolesArgs } from "./game.service.types";
import { gameRepository } from "../repository/game.repository";

class GameService {
  public async getGameMatches(
    args: GetGameArgs,
  ): Promise<GetGameMatchesOutputType> {
    const response = await gameRepository.getGameMatches({
      input: args.input,
      userId: args.ctx.userId,
    });
    if (args.input.type === "original") {
      return response.matches.map((match) => {
        const userMatchPlayer = match.matchPlayers.find(
          (mp) => mp.playerId === response.userPlayer.id,
        );
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
                name: mp.name,
                score: mp.score,
                teamId: mp.teamId,
                placement: mp.placement,
                winner: mp.winner,
                playerType: "original" as const,
                image: mp.image,
              };
            }),
          };
        } else {
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
            type: "shared",
            hasUser: userMatchPlayer !== undefined,
            won: userMatchPlayer?.winner ?? false,
            matchPlayers: match.matchPlayers.map((mp) => {
              if (mp.playerType === "original" || mp.type !== "shared") {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message:
                    "Match player and Match are not of the correct type.",
                });
              }
              return {
                id: mp.id,
                playerId: mp.playerId,
                type: "shared" as const,
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
                image: mp.image,
              };
            }),
          };
        }
      });
    } else {
      return response.matches.map((match) => {
        const userMatchPlayer = match.matchPlayers.find(
          (mp) => mp.playerId === response.userPlayer.id,
        );

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
          type: "shared",
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
              image: mp.image,
            };
          }),
        };
      });
    }
  }

  public async getGameRoles(
    args: GetGameRolesArgs,
  ): Promise<GetGameRolesOutputType> {
    const response = await gameRepository.getGameRoles({
      input: args.input,
      userId: args.ctx.userId,
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
          sharedType: "shared";
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
            sharedType: role.type,
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
export const gameService = new GameService();
