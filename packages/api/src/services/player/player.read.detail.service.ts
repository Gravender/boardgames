import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";

import type { GetPlayerOutputType } from "../../routers/player/player.output";
import { playerRepository } from "../../repositories/player/player.repository";
import { assertFound } from "../../utils/databaseHelpers";
import {
  aggregatePlayerStats,
  getTeamStats,
  headToHeadStats,
  teammateFrequency,
  type Player,
  type PlayerMatch,
} from "../../utils/player";
import type { GetPlayerArgs } from "./player.service.types";

class PlayerReadDetailService {
  public async getPlayer(args: GetPlayerArgs): Promise<GetPlayerOutputType> {
    if (args.input.type === "original") {
      return this.getOriginalPlayer({
        userId: args.ctx.userId,
        id: args.input.id,
      });
    }
    return this.getSharedPlayer({
      userId: args.ctx.userId,
      id: args.input.sharedId,
    });
  }

  private getMappedSharedMatchPlayers(args: {
    sharedMatchPlayers: {
      sharedPlayer: {
        id: number;
        player: {
          name: string;
          isUser: boolean;
          image: {
            name: string;
            url: string | null;
            type: "file" | "svg";
            usageType: "player" | "match" | "game";
          } | null;
        };
        linkedPlayer: {
          id: number;
          name: string;
          isUser: boolean;
          image: {
            name: string;
            url: string | null;
            type: "file" | "svg";
            usageType: "player" | "match" | "game";
          } | null;
        } | null;
      } | null;
      matchPlayer: {
        winner: boolean | null;
        score: number | null;
        teamId: number | null;
        placement: number | null;
      };
    }[];
  }): Player[] {
    return args.sharedMatchPlayers
      .map((fPlayer) => {
        const sharedPlayer = fPlayer.sharedPlayer;
        const linkedPlayer = sharedPlayer?.linkedPlayer;
        if (linkedPlayer) {
          return {
            id: linkedPlayer.id,
            type: "original" as const,
            name: linkedPlayer.name,
            isUser: linkedPlayer.isUser,
            isWinner: fPlayer.matchPlayer.winner ?? false,
            score: fPlayer.matchPlayer.score,
            image: linkedPlayer.image
              ? {
                  name: linkedPlayer.image.name,
                  url: linkedPlayer.image.url,
                  type: linkedPlayer.image.type,
                  usageType: "player" as const,
                }
              : null,
            teamId: fPlayer.matchPlayer.teamId,
            placement: fPlayer.matchPlayer.placement,
          };
        }
        if (sharedPlayer) {
          return {
            id: sharedPlayer.id,
            type: "shared" as const,
            name: sharedPlayer.player.name,
            isUser: sharedPlayer.player.isUser,
            isWinner: fPlayer.matchPlayer.winner ?? false,
            score: fPlayer.matchPlayer.score,
            image: sharedPlayer.player.image
              ? {
                  name: sharedPlayer.player.image.name,
                  url: sharedPlayer.player.image.url,
                  type: sharedPlayer.player.image.type,
                  usageType: "player" as const,
                }
              : null,
            teamId: fPlayer.matchPlayer.teamId,
            placement: fPlayer.matchPlayer.placement,
          };
        }
        return null;
      })
      .filter((player): player is Player => player !== null);
  }

  private buildPlayerGamesAndStats(args: {
    basePlayer: {
      id: number;
      type: "original" | "shared";
      isUser: boolean;
      createdAt: Date;
      name: string;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "player" | "match" | "game";
      } | null;
      permissions: "view" | "edit";
    };
    playerMatches: PlayerMatch[];
    playerGames: {
      type: "shared" | "original";
      id: number;
      name: string;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "game" | "player" | "match";
      } | null;
    }[];
  }): GetPlayerOutputType {
    const sortedMatches = args.playerMatches.toSorted((a, b) =>
      compareAsc(b.date, a.date),
    );
    const playersStats = aggregatePlayerStats(sortedMatches);
    const teamStats = getTeamStats(sortedMatches, {
      id: args.basePlayer.id,
      type: args.basePlayer.type,
    });
    const teammateFrequencyStats = teammateFrequency(sortedMatches, {
      id: args.basePlayer.id,
      type: args.basePlayer.type,
    });
    const headToHead = headToHeadStats(sortedMatches, {
      id: args.basePlayer.id,
      type: args.basePlayer.type,
    });
    const playerStats = playersStats.find(
      (p) => p.id === args.basePlayer.id && p.type === args.basePlayer.type,
    );
    if (!playerStats) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Player stats not found.",
      });
    }

    const games = args.playerGames
      .map((game) => {
        const foundGameStats = playerStats.gameStats.find(
          (g) => g.id === game.id && g.type === game.type,
        );
        if (!foundGameStats) {
          return null;
        }
        return Object.assign(foundGameStats, game);
      })
      .filter((game) => game !== null);

    if (args.basePlayer.type === "original") {
      return {
        type: "original",
        id: args.basePlayer.id,
        isUser: args.basePlayer.isUser,
        createdAt: args.basePlayer.createdAt,
        name: args.basePlayer.name,
        image: args.basePlayer.image,
        permissions: "edit",
        stats: playerStats,
        teamStats,
        teammateFrequency: teammateFrequencyStats,
        headToHead,
        matches: sortedMatches,
        games,
      };
    }

    return {
      type: "shared",
      sharedId: args.basePlayer.id,
      sharedPlayerId: args.basePlayer.id,
      isUser: args.basePlayer.isUser,
      createdAt: args.basePlayer.createdAt,
      name: args.basePlayer.name,
      image: args.basePlayer.image,
      permissions: args.basePlayer.permissions,
      stats: playerStats,
      teamStats,
      teammateFrequency: teammateFrequencyStats,
      headToHead,
      matches: sortedMatches,
      games,
    };
  }

  private async getOriginalPlayer(args: {
    userId: string;
    id: number;
  }): Promise<GetPlayerOutputType> {
    const returnedPlayer = await playerRepository.getOriginalPlayerById({
      id: args.id,
      createdBy: args.userId,
    });
    assertFound(
      returnedPlayer,
      {
        userId: args.userId,
        value: {
          id: args.id,
        },
      },
      "Player not found.",
    );

    const playerGames: {
      type: "shared" | "original";
      id: number;
      name: string;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "game" | "player" | "match";
      } | null;
    }[] = [];

    const playerMatches = returnedPlayer.matchPlayers.map<PlayerMatch>(
      (mPlayer) => {
        const foundGame = playerGames.find(
          (pGame) =>
            pGame.id === mPlayer.match.gameId && pGame.type === "original",
        );
        if (!foundGame) {
          playerGames.push({
            type: "original",
            id: mPlayer.match.gameId,
            name: mPlayer.match.game.name,
            image: mPlayer.match.game.image,
          });
        }
        return {
          id: mPlayer.matchId,
          type: "original",
          date: mPlayer.match.date,
          name: mPlayer.match.name,
          teams: mPlayer.match.teams,
          duration: mPlayer.match.duration,
          finished: mPlayer.match.finished,
          gameId: mPlayer.match.gameId,
          gameName: mPlayer.match.game.name,
          gameImage: mPlayer.match.game.image,
          locationName: mPlayer.match.location?.name,
          players: mPlayer.match.matchPlayers.map<Player>((matchPlayer) => ({
            id: matchPlayer.player.id,
            type: "original",
            name: matchPlayer.player.name,
            isWinner: matchPlayer.winner ?? false,
            isUser: matchPlayer.player.isUser,
            score: matchPlayer.score,
            image: matchPlayer.player.image
              ? {
                  name: matchPlayer.player.image.name,
                  url: matchPlayer.player.image.url,
                  type: matchPlayer.player.image.type,
                  usageType: "player",
                }
              : null,
            teamId: matchPlayer.teamId,
            placement: matchPlayer.placement,
          })),
          scoresheet: mPlayer.match.scoresheet,
          outcome: {
            score: mPlayer.score,
            isWinner: mPlayer.winner ?? false,
            placement: mPlayer.placement,
          },
          linkedGameId: undefined,
        };
      },
    );

    returnedPlayer.sharedLinkedPlayers.forEach((linkedPlayer) => {
      linkedPlayer.sharedMatchPlayers.forEach((mPlayer) => {
        const sharedMatch = mPlayer.sharedMatch;
        const sharedMatchMatch = sharedMatch.match;
        const sharedGame = sharedMatch.sharedGame;
        const linkedGame = sharedGame.linkedGame;
        const foundGame = playerGames.find(
          (pGame) =>
            pGame.id === (sharedGame.linkedGameId ?? sharedGame.id) &&
            pGame.type === (sharedGame.linkedGameId ? "original" : "shared"),
        );
        if (!foundGame) {
          playerGames.push({
            type: sharedGame.linkedGameId ? "original" : "shared",
            id: sharedGame.linkedGameId ?? sharedGame.id,
            name: linkedGame?.name ?? sharedGame.game.name,
            image: linkedGame ? linkedGame.image : sharedGame.game.image,
          });
        }
        playerMatches.push({
          id: sharedMatch.id,
          type: "shared",
          date: sharedMatchMatch.date,
          name: sharedMatchMatch.name,
          teams: sharedMatchMatch.teams,
          duration: sharedMatchMatch.duration,
          finished: sharedMatchMatch.finished,
          gameId: sharedMatch.sharedGame.id,
          gameName: linkedGame ? linkedGame.name : sharedGame.game.name,
          gameImage: linkedGame ? linkedGame.image : sharedGame.game.image,
          locationName: sharedMatchMatch.location?.name,
          players: this.getMappedSharedMatchPlayers({
            sharedMatchPlayers: sharedMatch.sharedMatchPlayers,
          }),
          scoresheet: sharedMatchMatch.scoresheet,
          outcome: {
            score: mPlayer.matchPlayer.score,
            isWinner: mPlayer.matchPlayer.winner ?? false,
            placement: mPlayer.matchPlayer.placement,
          },
          linkedGameId:
            mPlayer.sharedMatch.sharedGame.linkedGameId ?? undefined,
        });
      });
    });

    return this.buildPlayerGamesAndStats({
      basePlayer: {
        id: returnedPlayer.id,
        type: "original",
        isUser: returnedPlayer.isUser,
        createdAt: returnedPlayer.createdAt,
        name: returnedPlayer.name,
        image: returnedPlayer.image,
        permissions: "edit",
      },
      playerMatches,
      playerGames,
    });
  }

  private async getSharedPlayer(args: {
    userId: string;
    id: number;
  }): Promise<GetPlayerOutputType> {
    const returnedSharedPlayer = await playerRepository.getSharedPlayerById({
      id: args.id,
      sharedWithId: args.userId,
    });
    if (!returnedSharedPlayer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shared player not found.",
      });
    }

    const playerGames: {
      type: "shared" | "original";
      id: number;
      name: string;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "game" | "player" | "match";
      } | null;
    }[] = [];
    const playerMatches: PlayerMatch[] = [];

    for (const returnedSharedMatchPlayer of returnedSharedPlayer.sharedMatchPlayers) {
      const sharedMatch = returnedSharedMatchPlayer.sharedMatch;
      const sharedMatchMatch = sharedMatch.match;
      const sharedGame = sharedMatch.sharedGame;
      const linkedGame = sharedGame.linkedGame;
      const foundGame = playerGames.find(
        (pGame) =>
          pGame.id === (sharedGame.linkedGameId ?? sharedGame.id) &&
          pGame.type === (sharedGame.linkedGameId ? "original" : "shared"),
      );
      if (!foundGame) {
        playerGames.push({
          type: sharedGame.linkedGameId ? "original" : "shared",
          id: sharedGame.linkedGameId ?? sharedGame.id,
          name: linkedGame?.name ?? sharedGame.game.name,
          image: linkedGame ? linkedGame.image : sharedGame.game.image,
        });
      }

      const players = this.getMappedSharedMatchPlayers({
        sharedMatchPlayers: sharedMatch.sharedMatchPlayers,
      });
      if (players.length === 0) {
        continue;
      }

      playerMatches.push({
        id: sharedMatch.id,
        type: "shared",
        date: sharedMatchMatch.date,
        name: sharedMatchMatch.name,
        teams: sharedMatchMatch.teams,
        duration: sharedMatchMatch.duration,
        finished: sharedMatchMatch.finished,
        gameId: sharedMatch.sharedGame.id,
        gameName: linkedGame ? linkedGame.name : sharedGame.game.name,
        gameImage: linkedGame ? linkedGame.image : sharedGame.game.image,
        locationName: sharedMatchMatch.location?.name,
        players,
        scoresheet: sharedMatchMatch.scoresheet,
        outcome: {
          score: returnedSharedMatchPlayer.matchPlayer.score,
          isWinner: returnedSharedMatchPlayer.matchPlayer.winner ?? false,
          placement: returnedSharedMatchPlayer.matchPlayer.placement,
        },
        linkedGameId: linkedGame?.id ?? undefined,
      });
    }

    return this.buildPlayerGamesAndStats({
      basePlayer: {
        id: returnedSharedPlayer.id,
        type: "shared",
        isUser: false,
        createdAt: returnedSharedPlayer.createdAt,
        name: returnedSharedPlayer.player.name,
        image: returnedSharedPlayer.player.image,
        permissions: returnedSharedPlayer.permission,
      },
      playerMatches,
      playerGames,
    });
  }
}

export const playerReadDetailService = new PlayerReadDetailService();
