import { differenceInHours, isSameDay, max } from "date-fns";

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
    const recentActivityWindowInHours = 90 * 24;

    const recencyWeight = (date: Date) => {
      const daysAgo = differenceInHours(now, date);
      return Math.exp(-Math.log(2) * (daysAgo / (90 * 24)));
    };
    const summarizeMatches = (matches: { date: Date }[]) => {
      const totalMatches = matches.length;
      let lastPlayedAt: Date | null = null;
      let weightedRecencySum = 0;
      let recentMatchesCount = 0;

      matches.forEach((match) => {
        weightedRecencySum += recencyWeight(match.date);
        lastPlayedAt = lastPlayedAt ? max([lastPlayedAt, match.date]) : match.date;
        if (differenceInHours(now, match.date) <= recentActivityWindowInHours) {
          recentMatchesCount += 1;
        }
      });

      const recentScore =
        totalMatches > 0 ? weightedRecencySum / totalMatches : 0;
      const participationRate =
        totalMatches > 0 ? recentMatchesCount / totalMatches : 0;

      return {
        recentScore,
        lastPlayedAt,
        recentMatchesCount,
        participationRate,
      };
    };

    const mappedOriginalPlayers = response.originalPlayers.map((player) => {
      const sharedMatches = player.sharedLinkedPlayers.flatMap(
        (sharedPlayer) => {
          return sharedPlayer.sharedMatchPlayers
            .filter((sMp) => sMp.match.finished)
            .map((sMp) => sMp.match);
        },
      );
      const originalMatches = player.matchPlayers
        .filter((mp) => mp.match.finished)
        .map((mp) => mp.match);
      const allMatches = [...originalMatches, ...sharedMatches];
      const {
        recentScore,
        lastPlayedAt,
        recentMatchesCount,
        participationRate,
      } = summarizeMatches(allMatches);
      return {
        id: player.id,
        type: "original" as const,
        name: player.name,
        image: player.image,
        matches: allMatches.length,
        isUser: player.isUser,
        recentScore,
        lastPlayedAt,
        recentMatchesCount,
        participationRate,
      };
    });
    const mappedSharedPlayers = response.sharedPlayers.map((sharedPlayer) => {
      const sharedMatches = sharedPlayer.sharedMatchPlayers
        .filter((sMp) => sMp.match.finished)
        .map((sMp) => sMp.match);
      const {
        recentScore,
        lastPlayedAt,
        recentMatchesCount,
        participationRate,
      } = summarizeMatches(sharedMatches);
      return {
        sharedId: sharedPlayer.id,
        type: "shared" as const,
        name: sharedPlayer.player.name,
        image: sharedPlayer.player.image,
        matches: sharedMatches.length,
        isUser: false,
        recentScore,
        lastPlayedAt,
        recentMatchesCount,
        participationRate,
      };
    });
    const combinedPlayers = [...mappedOriginalPlayers, ...mappedSharedPlayers];

    combinedPlayers.sort((a, b) => {
      const scoreForPlayer = (player: {
        recentScore: number;
        matches: number;
        lastPlayedAt: Date | null;
        recentMatchesCount: number;
        participationRate: number;
        name: string;
      }) => {
        const sameDayBoost =
          player.lastPlayedAt && isSameDay(player.lastPlayedAt, now) ? 40 : 0;
        const recentActivityScore =
          player.recentMatchesCount * 3 + player.participationRate * 20;
        const consistencyScore = Math.min(player.matches, 30);
        const lastRecencyScore =
          player.lastPlayedAt !== null
            ? recencyWeight(player.lastPlayedAt) * 50
            : 0;

        return (
          sameDayBoost +
          recentActivityScore +
          consistencyScore +
          lastRecencyScore
        );
      };
      const aScore = scoreForPlayer(a);
      const bScore = scoreForPlayer(b);
      if (aScore !== bScore) {
        return bScore - aScore;
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
