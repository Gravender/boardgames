import { compareDesc } from "date-fns";

import type {
  GetPlayersByGameOutputType,
  GetPlayersOutputType,
} from "../../routers/player/player.output";
import { playerRepository } from "../../repositories/player/player.repository";
import type {
  GetPlayerArgs,
  GetPlayersArgs,
  GetPlayersByGameArgs,
} from "./player.service.types";
import { playerReadDetailService } from "./player.read.detail.service";

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
          image: player.image,
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
      const sharedMatches = returnedSharedPlayer.sharedMatches.toSorted(
        (a, b) => compareDesc(a.match.date, b.match.date),
      );
      const firstMatch = sharedMatches[0];
      mappedPlayers.push({
        type: "shared",
        sharedId: returnedSharedPlayer.id,
        sharedPlayerId: returnedSharedPlayer.id,
        name: returnedSharedPlayer.player.name,
        image: returnedSharedPlayer.player.image,
        matches: sharedMatches.length,
        lastPlayed: firstMatch?.match.date,
        gameName: firstMatch?.sharedGame.linkedGame
          ? firstMatch.sharedGame.linkedGame.name
          : firstMatch?.sharedGame.game.name,
        gameId: firstMatch?.sharedGame.linkedGame
          ? firstMatch.sharedGame.linkedGame.id
          : firstMatch?.sharedGame.id,
        gameType: firstMatch?.sharedGame.linkedGame ? "original" : "shared",
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
          image: player.image,
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
        image: returnedSharedPlayer.player.image,
        matches: filteredMatches.length,
      });
    }
    mappedPlayers.sort((a, b) => b.matches - a.matches);
    return mappedPlayers;
  }

  public async getPlayer(args: GetPlayerArgs) {
    return playerReadDetailService.getPlayer(args);
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
      ) === 1
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
}

export const playerReadService = new PlayerReadService();
