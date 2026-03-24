import type {
  PlayerInsightsIdentityType,
  PlayerInsightsMatchEntryType,
} from "../../routers/player/player.output";
import { compareRivalHeadToHead } from "./player-insights.read.outcome";
import { participantIdentityKey } from "./player-insights.read.identity";
import type {
  InsightMatchParticipant,
  InsightMatchRow,
} from "./player-insights.read.types";

export type CohortPairwiseAcc = {
  keyA: string;
  keyB: string;
  identityA: PlayerInsightsIdentityType;
  identityB: PlayerInsightsIdentityType;
  matches: number;
  winsA: number;
  lossesA: number;
  ties: number;
  placementDeltaSum: number;
  placementDeltaCount: number;
};

export type CohortGroupAcc = {
  groupKey: string;
  members: PlayerInsightsIdentityType[];
  matches: number;
  sweptWins: number;
  exactMatches: number;
  placementSum: number;
  placementCount: number;
  scoreSum: number;
  scoreCount: number;
  recentMatches: PlayerInsightsMatchEntryType[];
  gameKeys: Set<string>;
  lastPlayedAt: Date | null;
  placementsByPlayerKey: Map<string, { sum: number; count: number }>;
  pairwise: Map<string, CohortPairwiseAcc>;
  identityByKey: Map<string, PlayerInsightsIdentityType>;
};

export const bumpPlacementForKey = (
  map: Map<string, { sum: number; count: number }>,
  key: string,
  placement: number | null,
): void => {
  if (placement === null) {
    return;
  }
  const cur = map.get(key);
  if (cur) {
    cur.sum += placement;
    cur.count += 1;
  } else {
    map.set(key, { sum: placement, count: 1 });
  }
};

/**
 * Updates pairwise head-to-head stats for every pair in the cohort for this match row.
 */
export const accumulatePairwise = (
  acc: CohortGroupAcc,
  cohortParticipants: InsightMatchParticipant[],
  row: InsightMatchRow,
): void => {
  for (let i = 0; i < cohortParticipants.length; i++) {
    for (let j = i + 1; j < cohortParticipants.length; j++) {
      const pA = cohortParticipants[i]!;
      const pB = cohortParticipants[j]!;
      const kA = participantIdentityKey(pA);
      const kB = participantIdentityKey(pB);
      const firstKey = kA < kB ? kA : kB;
      const secondKey = kA < kB ? kB : kA;
      const firstP = kA < kB ? pA : pB;
      const secondP = kA < kB ? pB : pA;
      const pairKey = `${firstKey}|${secondKey}`;

      const r = compareRivalHeadToHead({
        row,
        target: firstP,
        other: secondP,
      });

      let pairAcc = acc.pairwise.get(pairKey);
      if (!pairAcc) {
        const identityA = acc.identityByKey.get(firstKey);
        const identityB = acc.identityByKey.get(secondKey);
        if (!identityA || !identityB) {
          throw new Error(
            `Played-with pairwise: missing identity for keys "${firstKey}" and/or "${secondKey}" in group "${acc.groupKey}".`,
          );
        }
        pairAcc = {
          keyA: firstKey,
          keyB: secondKey,
          identityA,
          identityB,
          matches: 0,
          winsA: 0,
          lossesA: 0,
          ties: 0,
          placementDeltaSum: 0,
          placementDeltaCount: 0,
        };
        acc.pairwise.set(pairKey, pairAcc);
      }
      pairAcc.matches += 1;
      if (r === "win") {
        pairAcc.winsA += 1;
      } else if (r === "loss") {
        pairAcc.lossesA += 1;
      } else {
        pairAcc.ties += 1;
      }
      if (firstP.placement !== null && secondP.placement !== null) {
        pairAcc.placementDeltaSum += secondP.placement - firstP.placement;
        pairAcc.placementDeltaCount += 1;
      }
    }
  }
};

export type ProcessCohortSubsetArgs = {
  acc: CohortGroupAcc;
  profileKey: string;
  targetParticipant: InsightMatchParticipant;
  subset: InsightMatchParticipant[];
  row: InsightMatchRow;
  matchEntry: PlayerInsightsMatchEntryType;
  gameKey: string;
  swept: boolean;
  isExact: number;
};

/**
 * Applies one k-subset of opponents to an existing cohort accumulator: match counts,
 * placements, recent matches, and pairwise stats.
 */
export const applyCohortSubsetContribution = (
  args: ProcessCohortSubsetArgs,
): void => {
  const {
    acc,
    profileKey,
    targetParticipant,
    subset,
    row,
    matchEntry,
    gameKey,
    swept,
    isExact,
  } = args;

  acc.matches += 1;
  if (swept) {
    acc.sweptWins += 1;
  }
  acc.exactMatches += isExact;

  if (row.outcomePlacement !== null) {
    acc.placementSum += row.outcomePlacement;
    acc.placementCount += 1;
  }
  if (row.outcomeScore !== null) {
    acc.scoreSum += row.outcomeScore;
    acc.scoreCount += 1;
  }
  acc.gameKeys.add(gameKey);
  if (acc.lastPlayedAt === null || row.date > acc.lastPlayedAt) {
    acc.lastPlayedAt = row.date;
  }
  acc.recentMatches = [...acc.recentMatches, matchEntry]
    .toSorted((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  bumpPlacementForKey(
    acc.placementsByPlayerKey,
    profileKey,
    targetParticipant.placement,
  );
  for (const op of subset) {
    bumpPlacementForKey(
      acc.placementsByPlayerKey,
      participantIdentityKey(op),
      op.placement,
    );
  }

  const cohortParticipants: InsightMatchParticipant[] = [
    targetParticipant,
    ...subset,
  ];
  accumulatePairwise(acc, cohortParticipants, row);
};
