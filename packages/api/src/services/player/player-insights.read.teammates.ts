import type { GetPlayerTopTeammatesOutputType } from "../../routers/player/player-insights.output";
import type { PlayerInsightsIdentityType } from "../../routers/player/player-insights.output";
import { MIN_RIVAL_OR_TEAMMATE_MATCHES } from "./player-insights.read.constants";
import {
  gameIdentityKey,
  getTargetParticipant,
  participantIdentityKey,
  toIdentity,
} from "./player-insights.read.identity";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import type { InsightMatchRow } from "./player-insights.read.types";

export const computePlayerTopTeammates = async (args: {
  ctx: GetPlayerInsightsArgs["ctx"];
  input: GetPlayerInsightsArgs["input"];
  rows: InsightMatchRow[];
}): Promise<GetPlayerTopTeammatesOutputType["teammates"]> => {
  const teammateKeyToParticipant = new Map<
    string,
    InsightMatchRow["participants"][number]
  >();
  for (const row of args.rows) {
    const target = getTargetParticipant({ row, input: args.input });
    if (!target || target.teamId === null) {
      continue;
    }
    for (const participant of row.participants) {
      if (participant.playerId === target.playerId) {
        continue;
      }
      if (participant.teamId !== target.teamId) {
        continue;
      }
      const tk = participantIdentityKey(participant);
      if (!teammateKeyToParticipant.has(tk)) {
        teammateKeyToParticipant.set(tk, participant);
      }
    }
  }
  const teammateIdentityByKey = new Map<string, PlayerInsightsIdentityType>();
  await Promise.all(
    [...teammateKeyToParticipant.entries()].map(async ([key, participant]) => {
      teammateIdentityByKey.set(key, await toIdentity(participant, args.ctx));
    }),
  );

  const teammates = new Map<
    string,
    {
      teammate: PlayerInsightsIdentityType;
      matchesTogether: number;
      winsTogether: number;
      nonWinsTogether: number;
      placements: number[];
      gameKeys: Set<string>;
      lastPlayedAt: Date | null;
      perGame: Map<
        string,
        {
          matchesTogether: number;
          winsTogether: number;
          nonWinsTogether: number;
          gameName: string;
        }
      >;
    }
  >();
  for (const row of args.rows) {
    const target = getTargetParticipant({ row, input: args.input });
    if (!target || target.teamId === null) {
      continue;
    }
    const gk = gameIdentityKey(row);
    for (const participant of row.participants) {
      if (participant.playerId === target.playerId) {
        continue;
      }
      if (participant.teamId !== target.teamId) {
        continue;
      }
      const tk = participantIdentityKey(participant);
      const teammate = teammateIdentityByKey.get(tk);
      if (!teammate) {
        throw new Error(
          `Teammates insights: missing resolved identity for teammate key "${tk}".`,
        );
      }
      const key =
        teammate.type === "shared"
          ? `shared-${teammate.sharedId}`
          : `original-${teammate.id}`;
      const existing = teammates.get(key);
      const bothWon = target.winner === true && participant.winner === true;
      if (!existing) {
        const perGame = new Map<
          string,
          {
            matchesTogether: number;
            winsTogether: number;
            nonWinsTogether: number;
            gameName: string;
          }
        >();
        perGame.set(gk, {
          matchesTogether: 1,
          winsTogether: bothWon ? 1 : 0,
          nonWinsTogether: bothWon ? 0 : 1,
          gameName: row.gameName,
        });
        teammates.set(key, {
          teammate,
          matchesTogether: 1,
          winsTogether: bothWon ? 1 : 0,
          nonWinsTogether: bothWon ? 0 : 1,
          // Team placement is shared; use the profile player's row (not pairwise avg).
          placements: target.placement !== null ? [target.placement] : [],
          gameKeys: new Set([gk]),
          lastPlayedAt: row.date,
          perGame,
        });
        continue;
      }
      existing.matchesTogether += 1;
      if (bothWon) {
        existing.winsTogether += 1;
      } else {
        existing.nonWinsTogether += 1;
      }
      const pg = existing.perGame.get(gk);
      if (!pg) {
        existing.perGame.set(gk, {
          matchesTogether: 1,
          winsTogether: bothWon ? 1 : 0,
          nonWinsTogether: bothWon ? 0 : 1,
          gameName: row.gameName,
        });
      } else {
        pg.matchesTogether += 1;
        if (bothWon) {
          pg.winsTogether += 1;
        } else {
          pg.nonWinsTogether += 1;
        }
      }
      if (target.placement !== null) {
        existing.placements.push(target.placement);
      }
      existing.gameKeys.add(gk);
      if (existing.lastPlayedAt === null || row.date > existing.lastPlayedAt) {
        existing.lastPlayedAt = row.date;
      }
    }
  }
  return Array.from(teammates.values())
    .filter((entry) => entry.matchesTogether >= MIN_RIVAL_OR_TEAMMATE_MATCHES)
    .map((entry) => ({
      teammate: entry.teammate,
      matchesTogether: entry.matchesTogether,
      winsTogether: entry.winsTogether,
      nonWinsTogether: entry.nonWinsTogether,
      winRateTogether:
        entry.matchesTogether > 0
          ? entry.winsTogether / entry.matchesTogether
          : 0,
      avgTeamPlacement:
        entry.placements.length > 0
          ? entry.placements.reduce((acc, value) => acc + value, 0) /
            entry.placements.length
          : null,
      uniqueGamesPlayed: entry.gameKeys.size,
      lastPlayedAt: entry.lastPlayedAt,
      byGame: Array.from(entry.perGame.entries())
        .map(([gameIdKey, g]) => ({
          gameIdKey,
          gameName: g.gameName,
          matchesTogether: g.matchesTogether,
          winsTogether: g.winsTogether,
          nonWinsTogether: g.nonWinsTogether,
          winRateTogether:
            g.matchesTogether > 0 ? g.winsTogether / g.matchesTogether : 0,
        }))
        .toSorted((a, b) => b.matchesTogether - a.matchesTogether),
    }))
    .toSorted((a, b) => b.matchesTogether - a.matchesTogether);
};
