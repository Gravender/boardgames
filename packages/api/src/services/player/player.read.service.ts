import { compareDesc } from "date-fns";

import type {
  GetPlayersByGameOutputType,
  GetPlayersOutputType,
  GetPlayerSummaryOutputType,
} from "../../routers/player/player.output";
import type { GetPlayerInputType } from "../../routers/player/player.input";
import { playerRepository } from "../../repositories/player/player.repository";
import type {
  GetPlayersArgs,
  GetPlayersByGameArgs,
  GetPlayerSummaryArgs,
} from "./player.service.types";
import { db } from "@board-games/db/client";
import { assertFound } from "../../utils/databaseHelpers";
import { mapImageRowToPlayerImage } from "../../utils/image";

class PlayerReadService {
  public async getPlayers(args: GetPlayersArgs): Promise<GetPlayersOutputType> {
    const response = await playerRepository.getPlayers({
      createdBy: args.ctx.userId,
    });
    const mappedPlayers: GetPlayersOutputType = response.originalPlayers.map(
      (player) => {
        const linkedMatches = player.sharedLinkedPlayers.flatMap(
          (linkedPlayer) =>
            linkedPlayer.sharedMatches
              .map((sharedMatch) => sharedMatch.match)
              .filter((match) => match !== null),
        );
        linkedMatches.sort((a, b) => compareDesc(a.date, b.date));
        const firstPlayerMatch = player.matches[0];
        const firstLinkedMatch = linkedMatches[0];
        const firstMatch = this.getFirstMatch({
          firstPlayerMatch,
          firstLinkedMatch,
        });
        return {
          type: "original",
          id: player.id,
          name: player.name,
          image: mapImageRowToPlayerImage(player.image),
          matches: player.matches.length + linkedMatches.length,
          lastPlayed: firstMatch?.date,
          gameName: firstMatch?.game.name,
          gameId: firstMatch?.game.id,
          gameType: "original",
          permissions: "edit",
        };
      },
    );

    for (const returnedSharedPlayer of response.sharedPlayers) {
      const sharedMatches = returnedSharedPlayer.sharedMatches
        .filter((sharedMatch) => {
          if (!sharedMatch.match?.date) {
            return false;
          }
          const sharedGame = sharedMatch.sharedGame;
          if (!sharedGame) {
            return false;
          }
          return sharedGame.linkedGame !== null || sharedGame.game !== null;
        })
        .toSorted((a, b) => compareDesc(a.match.date, b.match.date));
      const firstMatch = sharedMatches[0];
      const firstMatchSharedGame = firstMatch?.sharedGame;
      const firstMatchLinkedGame = firstMatchSharedGame?.linkedGame;
      const firstMatchGame = firstMatchSharedGame?.game;
      mappedPlayers.push({
        type: "shared",
        sharedId: returnedSharedPlayer.id,
        sharedPlayerId: returnedSharedPlayer.id,
        name: returnedSharedPlayer.player.name,
        image: mapImageRowToPlayerImage(returnedSharedPlayer.player.image),
        matches: sharedMatches.length,
        lastPlayed: firstMatch?.match?.date,
        gameName: firstMatchLinkedGame?.name ?? firstMatchGame?.name,
        gameId: firstMatchLinkedGame?.id ?? firstMatchSharedGame?.id,
        gameType: firstMatchLinkedGame ? "original" : "shared",
        permissions: returnedSharedPlayer.permission,
      });
    }
    return mappedPlayers;
  }

  public async getPlayersByGame(
    args: GetPlayersByGameArgs,
  ): Promise<GetPlayersByGameOutputType> {
    const response = await playerRepository.getPlayersByGame({
      createdBy: args.ctx.userId,
      input: args.input,
    });
    const mappedPlayers: GetPlayersByGameOutputType =
      response.originalPlayers.map((player) => {
        const linkedMatches = player.sharedLinkedPlayers
          .flatMap((linkedPlayer) =>
            linkedPlayer.sharedMatches.map(
              (sharedMatch) =>
                sharedMatch.match !== null && sharedMatch.sharedGame !== null,
            ),
          )
          .filter((match) => match);
        return {
          id: player.id,
          type: "original",
          isUser: player.isUser,
          name: player.name,
          image: mapImageRowToPlayerImage(player.image),
          matches: (player.matches?.length ?? 0) + (linkedMatches.length ?? 0),
        };
      });
    for (const returnedSharedPlayer of response.sharedPlayers) {
      const filteredMatches = returnedSharedPlayer.sharedMatches.filter(
        (m) => m.match !== null && m.sharedGame !== null,
      );
      mappedPlayers.push({
        type: "shared",
        isUser: false,
        sharedId: returnedSharedPlayer.id,
        sharedPlayerId: returnedSharedPlayer.id,
        name: returnedSharedPlayer.player.name,
        image: mapImageRowToPlayerImage(returnedSharedPlayer.player.image),
        matches: filteredMatches.length,
      });
    }
    mappedPlayers.sort((a, b) => b.matches - a.matches);
    return mappedPlayers;
  }

  private getFirstMatch(args: {
    firstPlayerMatch:
      | {
          date: Date;
          game: { id: number; name: string };
        }
      | undefined;
    firstLinkedMatch:
      | {
          date: Date;
          game: { id: number; name: string };
        }
      | undefined;
  }) {
    if (args.firstPlayerMatch && args.firstLinkedMatch) {
      return compareDesc(
        args.firstPlayerMatch.date,
        args.firstLinkedMatch.date,
      ) === -1
        ? args.firstPlayerMatch
        : args.firstLinkedMatch;
    }
    if (args.firstPlayerMatch) {
      return args.firstPlayerMatch;
    }
    if (args.firstLinkedMatch) {
      return args.firstLinkedMatch;
    }
    return null;
  }
  public async getPlayerSummary(
    args: GetPlayerSummaryArgs,
  ): Promise<GetPlayerSummaryOutputType> {
    const { ctx, input } = args;
    if (input.type === "original") {
      const response = await db.transaction(async (tx) => {
        const returnedPlayer = await playerRepository.getPlayer(
          {
            id: input.id,
            createdBy: ctx.userId,
          },
          tx,
        );
        let summaryInput: GetPlayerInputType;
        if (returnedPlayer) {
          summaryInput = { type: "original", id: input.id };
        } else {
          const returnedSharedPlayer =
            await playerRepository.getSharedPlayerByPlayerId(
              {
                playerId: input.id,
                sharedWithId: ctx.userId,
              },
              tx,
            );
          assertFound(
            returnedSharedPlayer,
            {
              userId: ctx.userId,
              value: {
                id: input.id,
              },
            },
            "Player not found.",
          );
          summaryInput = {
            type: "shared",
            sharedPlayerId: returnedSharedPlayer.id,
          };
        }
        const playerStats = await playerRepository.getPlayerSummary({
          userId: ctx.userId,
          input: summaryInput,
          tx,
        });
        assertFound(
          playerStats,
          {
            userId: ctx.userId,
            value: {
              id: input.id,
            },
          },
          "Player not found.",
        );
        return {
          type: "original" as const,
          id: input.id,
          finishedMatches: Number(playerStats.finishedMatches),
          wins: Number(playerStats.wins),
          winRate: Number(playerStats.winRate),
          gamesPlayed: Number(playerStats.gamesPlayed),
          totalPlaytime: Number(playerStats.totalPlaytime),
        };
      });
      return response;
    } else {
      const response = await db.transaction(async (tx) => {
        const returnedSharedPlayer = await playerRepository.getSharedPlayer(
          {
            id: input.sharedPlayerId,
            sharedWithId: ctx.userId,
          },
          tx,
        );
        assertFound(returnedSharedPlayer, {
          userId: ctx.userId,
          value: {
            sharedPlayerId: input.sharedPlayerId,
          },
        });
        const playerStats = await playerRepository.getPlayerSummary({
          userId: ctx.userId,
          input: {
            type: "shared",
            sharedPlayerId: input.sharedPlayerId,
          },
          tx,
        });
        assertFound(
          playerStats,
          {
            userId: ctx.userId,
            value: {
              sharedPlayerId: input.sharedPlayerId,
            },
          },
          "Player not found.",
        );
        return {
          type: "shared" as const,
          sharedPlayerId: returnedSharedPlayer.id,
          finishedMatches: Number(playerStats.finishedMatches),
          wins: Number(playerStats.wins),
          winRate: Number(playerStats.winRate),
          gamesPlayed: Number(playerStats.gamesPlayed),
          totalPlaytime: Number(playerStats.totalPlaytime),
        };
      });
      return response;
    }
  }
}

export const playerReadService = new PlayerReadService();
