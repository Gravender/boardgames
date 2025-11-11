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
    const ninetyDays = 90;
    const halfLifeInDays = 30;

    // --- Core scoring functions ---
    const recencyWeight = (date: Date): number => {
      const daysAgo = differenceInDays(now, date);
      return Math.exp(-Math.log(2) * (daysAgo / halfLifeInDays));
    };

    const frequencyWeight = (dates: Date[]): number => {
      // Use diminishing returns + cap total count
      const count = Math.min(dates.length, 30);
      return Math.log1p(count);
    };

    const computeScore = (matchDates: Date[]): number => {
      if (matchDates.length === 0) return 0;

      const recentDates = matchDates.filter(
        (date) => differenceInDays(now, date) <= ninetyDays,
      );

      if (recentDates.length === 0) return 0;

      const recency = recentDates.reduce(
        (maxScore, d) => Math.max(maxScore, recencyWeight(d)),
        0,
      );

      const frequency = frequencyWeight(recentDates);

      const lastPlayedAt = recentDates.reduce(
        (latest, d) => max([latest, d]),
        new Date(0),
      );
      const daysSinceLast = differenceInDays(now, lastPlayedAt);
      const frequencyDecay = Math.exp(-Math.log(2) * (daysSinceLast / 30));

      const sameDayBonus = isSameDay(lastPlayedAt, now) ? 0.3 : 0;

      return recency * 0.7 + frequency * frequencyDecay * 0.3 + sameDayBonus;
    };

    // --- Base mapping logic ---
    const mapPlayer = (base: {
      name: string;
      isUser: boolean;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "match" | "game" | "player";
      } | null;
      matches: { date: Date; finished: boolean }[];
    }) => {
      const finished = base.matches.filter((m) => m.finished);
      if (finished.length === 0)
        return {
          ...base,
          matches: 0,
          lastPlayedAt: null,
          recency: 0,
          frequency: 0,
          score: 0,
        };

      const finishedDates = finished.map((m) => m.date);

      const lastPlayedAt = finishedDates.reduce(
        (latest, d) => max([latest, d]),
        new Date(0),
      );

      const recentDates = finishedDates.filter(
        (d) => differenceInDays(now, d) <= ninetyDays,
      );

      const recency =
        recentDates.length > 0
          ? recentDates.reduce((best, d) => Math.max(best, recencyWeight(d)), 0)
          : 0;

      const frequency =
        recentDates.length > 0 ? frequencyWeight(recentDates) : 0;

      const score = computeScore(finishedDates);

      return {
        name: base.name,
        image: base.image,
        isUser: base.isUser,
        matches: finishedDates.length,
        lastPlayedAt,
        recency,
        frequency,
        score,
      };
    };

    // --- Map and merge players ---
    const mappedOriginalPlayers = response.originalPlayers.map((player) => {
      const sharedMatches = player.sharedLinkedPlayers.flatMap((sp) =>
        sp.sharedMatchPlayers.map((sMp) => sMp.match),
      );
      const originalMatches = player.matchPlayers.map((mp) => mp.match);
      const mergedMatches = [...originalMatches, ...sharedMatches];

      const mappedBase = mapPlayer({
        name: player.name,
        image: player.image,
        isUser: player.isUser,
        matches: mergedMatches,
      });

      return {
        id: player.id,
        type: "original" as const,
        ...mappedBase,
      };
    });

    const mappedSharedPlayers = response.sharedPlayers.map((sharedPlayer) => {
      const matches = sharedPlayer.sharedMatchPlayers.map((sMp) => sMp.match);
      const mappedBase = mapPlayer({
        name: sharedPlayer.player.name,
        image: sharedPlayer.player.image,
        isUser: false,
        matches,
      });

      return {
        sharedId: sharedPlayer.id,
        type: "shared" as const,
        ...mappedBase,
      };
    });

    const combinedPlayers = [...mappedOriginalPlayers, ...mappedSharedPlayers];

    // --- Safe and stable sort ---
    combinedPlayers.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;

      if (a.lastPlayedAt && b.lastPlayedAt) {
        if (a.lastPlayedAt.getTime() !== b.lastPlayedAt.getTime()) {
          return b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime();
        }
      } else if (!a.lastPlayedAt) return 1;
      else if (!b.lastPlayedAt) return -1;

      if (a.matches !== b.matches) return b.matches - a.matches;

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
