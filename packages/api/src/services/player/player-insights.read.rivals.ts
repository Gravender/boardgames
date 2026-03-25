import type {
  GetPlayerTopRivalsOutputType,
  PlayerInsightsIdentityType,
} from "../../routers/player/sub-routers/stats/player-insights.output";
import { compareRivalHeadToHead } from "./player-insights.read.outcome";
import { MIN_RIVAL_OR_TEAMMATE_MATCHES } from "./player-insights.read.constants";
import {
  gameIdentityKey,
  getTargetParticipant,
  participantIdentityKey,
  toIdentity,
} from "./player-insights.read.identity";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import type { InsightMatchRow } from "./player-insights.read.types";

type CompetitiveVsAcc = {
  matches: number;
  placementDeltaSum: number;
  placementDeltaCount: number;
  secondsSum: number;
};

const emptyCompetitiveVs = (): CompetitiveVsAcc => ({
  matches: 0,
  placementDeltaSum: 0,
  placementDeltaCount: 0,
  secondsSum: 0,
});

export const computePlayerTopRivals = async (args: {
  ctx: GetPlayerInsightsArgs["ctx"];
  input: GetPlayerInsightsArgs["input"];
  rows: InsightMatchRow[];
}): Promise<GetPlayerTopRivalsOutputType["rivals"]> => {
  const opponentKeyToParticipant = new Map<
    string,
    InsightMatchRow["participants"][number]
  >();
  for (const row of args.rows) {
    const target = getTargetParticipant({ row, input: args.input });
    if (!target) {
      continue;
    }
    for (const participant of row.participants) {
      if (participant.playerId === target.playerId) {
        continue;
      }
      if (target.teamId !== null && participant.teamId === target.teamId) {
        continue;
      }
      const pk = participantIdentityKey(participant);
      if (!opponentKeyToParticipant.has(pk)) {
        opponentKeyToParticipant.set(pk, participant);
      }
    }
  }
  const opponentIdentityByKey = new Map<string, PlayerInsightsIdentityType>();
  await Promise.all(
    [...opponentKeyToParticipant.entries()].map(async ([key, participant]) => {
      opponentIdentityByKey.set(key, await toIdentity(participant, args.ctx));
    }),
  );

  const rivals = new Map<
    string,
    {
      opponent: PlayerInsightsIdentityType;
      matches: number;
      winsVs: number;
      lossesVs: number;
      tiesVs: number;
      secondsPlayedTogether: number;
      competitiveVs: CompetitiveVsAcc;
      gameKeys: Set<string>;
      lastPlayedAt: Date | null;
      perGame: Map<
        string,
        {
          matches: number;
          winsVs: number;
          lossesVs: number;
          tiesVs: number;
          gameName: string;
          secondsPlayedTogether: number;
          competitiveVs: CompetitiveVsAcc;
        }
      >;
    }
  >();
  for (const row of args.rows) {
    const target = getTargetParticipant({ row, input: args.input });
    if (!target) {
      continue;
    }
    const gk = gameIdentityKey(row);
    for (const participant of row.participants) {
      if (participant.playerId === target.playerId) {
        continue;
      }
      if (target.teamId !== null && participant.teamId === target.teamId) {
        continue;
      }
      const pk = participantIdentityKey(participant);
      const opponent = opponentIdentityByKey.get(pk);
      if (!opponent) {
        throw new Error(
          `Rivals insights: missing resolved identity for opponent key "${pk}".`,
        );
      }
      const key =
        opponent.type === "shared"
          ? `shared-${opponent.sharedId}`
          : `original-${opponent.id}`;
      const existing = rivals.get(key);
      const result = compareRivalHeadToHead({
        row,
        target,
        other: participant,
      });
      const bumpCompetitive = (acc: CompetitiveVsAcc) => {
        if (row.isCoop) {
          return;
        }
        acc.matches += 1;
        acc.secondsSum += row.duration;
        if (target.placement !== null && participant.placement !== null) {
          acc.placementDeltaSum += participant.placement - target.placement;
          acc.placementDeltaCount += 1;
        }
      };
      if (!existing) {
        const perGame = new Map<
          string,
          {
            matches: number;
            winsVs: number;
            lossesVs: number;
            tiesVs: number;
            gameName: string;
            secondsPlayedTogether: number;
            competitiveVs: CompetitiveVsAcc;
          }
        >();
        const cv = emptyCompetitiveVs();
        bumpCompetitive(cv);
        perGame.set(gk, {
          matches: 1,
          winsVs: result === "win" ? 1 : 0,
          lossesVs: result === "loss" ? 1 : 0,
          tiesVs: result === "tie" ? 1 : 0,
          gameName: row.gameName,
          secondsPlayedTogether: row.duration,
          competitiveVs: cv,
        });
        const topCv = emptyCompetitiveVs();
        bumpCompetitive(topCv);
        rivals.set(key, {
          opponent,
          matches: 1,
          winsVs: result === "win" ? 1 : 0,
          lossesVs: result === "loss" ? 1 : 0,
          tiesVs: result === "tie" ? 1 : 0,
          secondsPlayedTogether: row.duration,
          competitiveVs: topCv,
          gameKeys: new Set([gk]),
          lastPlayedAt: row.date,
          perGame,
        });
        continue;
      }
      existing.matches += 1;
      existing.secondsPlayedTogether += row.duration;
      if (result === "win") existing.winsVs += 1;
      if (result === "loss") existing.lossesVs += 1;
      if (result === "tie") existing.tiesVs += 1;
      bumpCompetitive(existing.competitiveVs);
      const pg = existing.perGame.get(gk);
      if (!pg) {
        const cv = emptyCompetitiveVs();
        bumpCompetitive(cv);
        existing.perGame.set(gk, {
          matches: 1,
          winsVs: result === "win" ? 1 : 0,
          lossesVs: result === "loss" ? 1 : 0,
          tiesVs: result === "tie" ? 1 : 0,
          gameName: row.gameName,
          secondsPlayedTogether: row.duration,
          competitiveVs: cv,
        });
      } else {
        pg.matches += 1;
        pg.secondsPlayedTogether += row.duration;
        if (result === "win") pg.winsVs += 1;
        if (result === "loss") pg.lossesVs += 1;
        if (result === "tie") pg.tiesVs += 1;
        bumpCompetitive(pg.competitiveVs);
      }
      existing.gameKeys.add(gk);
      if (existing.lastPlayedAt === null || row.date > existing.lastPlayedAt) {
        existing.lastPlayedAt = row.date;
      }
    }
  }
  return Array.from(rivals.values())
    .filter((entry) => entry.matches >= MIN_RIVAL_OR_TEAMMATE_MATCHES)
    .map((entry) => ({
      opponent: entry.opponent,
      matches: entry.matches,
      winsVs: entry.winsVs,
      lossesVs: entry.lossesVs,
      tiesVs: entry.tiesVs,
      winRateVs: entry.matches > 0 ? entry.winsVs / entry.matches : 0,
      winLossDifferential: entry.winsVs - entry.lossesVs,
      uniqueGamesPlayed: entry.gameKeys.size,
      lastPlayedAt: entry.lastPlayedAt,
      secondsPlayedTogether: entry.secondsPlayedTogether,
      competitiveMatches: entry.competitiveVs.matches,
      secondsPlayedCompetitiveTogether: entry.competitiveVs.secondsSum,
      avgPlacementAdvantage:
        entry.competitiveVs.placementDeltaCount > 0
          ? entry.competitiveVs.placementDeltaSum /
            entry.competitiveVs.placementDeltaCount
          : null,
      byGame: Array.from(entry.perGame.entries())
        .map(([gameIdKey, g]) => ({
          gameIdKey,
          gameName: g.gameName,
          matches: g.matches,
          winsVs: g.winsVs,
          lossesVs: g.lossesVs,
          tiesVs: g.tiesVs,
          winRateVs: g.matches > 0 ? g.winsVs / g.matches : 0,
          winLossDifferential: g.winsVs - g.lossesVs,
          secondsPlayedTogether: g.secondsPlayedTogether,
          competitiveMatches: g.competitiveVs.matches,
          secondsPlayedCompetitiveTogether: g.competitiveVs.secondsSum,
          avgPlacementAdvantage:
            g.competitiveVs.placementDeltaCount > 0
              ? g.competitiveVs.placementDeltaSum /
                g.competitiveVs.placementDeltaCount
              : null,
        }))
        .toSorted((a, b) => b.matches - a.matches),
    }))
    .toSorted((a, b) => b.matches - a.matches);
};
