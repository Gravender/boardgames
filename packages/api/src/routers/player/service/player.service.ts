import { differenceInDays, isSameDay, max } from "date-fns";

import type {
  GetPlayersForMatchOutputType,
  GetRecentMatchWithPlayersOutputType,
} from "../player.output";
import type {
  GetPlayersForMatchArgs,
  GetRecentMatchWithPlayersArgs,
} from "./player.service.types";
import { playerRepository } from "../repository/player.repository";

class PlayerService {
  public async getPlayersForMatch(
    args: GetPlayersForMatchArgs,
  ): Promise<GetPlayersForMatchOutputType> {
    const response = await playerRepository.getPlayersForMatch({
      createdBy: args.ctx.userId,
    });
    const now = new Date();

    const recencyWeight = (date: Date) => {
      const daysAgo = differenceInDays(now, date);
      // Exponential decay with 30-day half-life
      return Math.exp(-Math.log(2) * (daysAgo / 30));
    };
    const mappedOriginalPlayers = response.originalPlayers.map((player) => {
      const sharedMatches = response.sharedPlayers.flatMap((sharedPlayer) => {
        return sharedPlayer.sharedMatchPlayers
          .filter((sMp) => sMp.match.finished)
          .map((sMp) => sMp.match);
      });
      const originalMatches = player.matchPlayers
        .filter((mp) => mp.match.finished)
        .map((mp) => mp.match);
      const allMatches = [...originalMatches, ...sharedMatches];
      const recentScore =
        allMatches.length > 0
          ? allMatches.reduce((sum, m) => sum + recencyWeight(m.date), 0) /
            allMatches.length
          : 0;
      const lastPlayedAt =
        allMatches.length > 0
          ? allMatches.reduce((latest, m) => max([latest, m.date]), new Date(0))
          : null;
      return {
        id: player.id,
        type: "original" as const,
        name: player.name,
        image: player.image,
        matches: allMatches.length,
        isUser: player.isUser,
        recentScore,
        lastPlayedAt,
      };
    });
    const mappedSharedPlayers = response.sharedPlayers.map((sharedPlayer) => {
      const sharedMatches = sharedPlayer.sharedMatchPlayers
        .filter((sMp) => sMp.match.finished)
        .map((sMp) => sMp.match);
      const recentScore =
        sharedMatches.length > 0
          ? sharedMatches.reduce((sum, m) => sum + recencyWeight(m.date), 0) /
            sharedMatches.length
          : 0;
      const lastPlayedAt =
        sharedMatches.length > 0
          ? sharedMatches.reduce(
              (latest, m) => max([latest, m.date]),
              new Date(0),
            )
          : null;
      return {
        sharedId: sharedPlayer.id,
        type: "shared" as const,
        name: sharedPlayer.player.name,
        image: sharedPlayer.player.image,
        matches: sharedMatches.length,
        isUser: false,
        recentScore,
        lastPlayedAt,
      };
    });
    const combinedPlayers = [...mappedOriginalPlayers, ...mappedSharedPlayers];

    combinedPlayers.sort((a, b) => {
      const aPlayedToday = a.lastPlayedAt && isSameDay(a.lastPlayedAt, now);
      const bPlayedToday = b.lastPlayedAt && isSameDay(b.lastPlayedAt, now);
      const aScore =
        a.recentScore * 30 + (aPlayedToday ? 30 : 0) + a.matches * 0.4;
      const bScore =
        b.recentScore * 30 + (bPlayedToday ? 30 : 0) + b.matches * 0.4;
      if (aScore > bScore) {
        return -1;
      }
      if (aScore < bScore) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
    return {
      players: combinedPlayers,
    };
  }
  public async getRecentMatchWithPlayers(
    args: GetRecentMatchWithPlayersArgs,
  ): Promise<GetRecentMatchWithPlayersOutputType> {
    const response = await playerRepository.getRecentMatchWithPlayers({
      createdBy: args.ctx.userId,
    });
    return {
      recentMatches: response,
    };
  }
}
export const playerService = new PlayerService();
