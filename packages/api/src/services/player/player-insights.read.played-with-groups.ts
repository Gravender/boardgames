import { kCombinations } from "../../utils/combinations";
import type {
  PlayerInsightsIdentityType,
  PlayerInsightsPlayedWithGroupType,
} from "../../routers/player/player-insights.output";
import { playerInsightsMatchQueryService } from "./player-insights-match-query.service";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import {
  MAX_COHORT_OPPONENTS,
  MAX_PLAYED_WITH_GROUPS,
  MAX_COHORT_SUBSETS,
  MIN_COHORT_OPPONENTS,
  MIN_MATCHES_PER_COHORT_GROUP,
} from "./player-insights.read.constants";
import { compareRivalHeadToHead } from "./player-insights.read.outcome";
import {
  applyCohortSubsetContribution,
  type CohortGroupAcc,
  type CohortPairwiseAcc,
} from "./player-insights.read.played-with-groups.helpers";
import {
  gameIdentityKey,
  getTargetParticipant,
  identityKeyFromIdentity,
  participantIdentityKey,
  toIdentity,
} from "./player-insights.read.identity";
import type {
  InsightMatchParticipant,
  InsightMatchRow,
} from "./player-insights.read.types";

export const buildPlayedWithGroups = async (args: {
  rows: InsightMatchRow[];
  input: GetPlayerInsightsArgs["input"];
  ctx: GetPlayerInsightsArgs["ctx"];
  profileIdentity: PlayerInsightsIdentityType;
}): Promise<PlayerInsightsPlayedWithGroupType[]> => {
  const profileKey = identityKeyFromIdentity(args.profileIdentity);
  const identityCache = new Map<string, PlayerInsightsIdentityType>();
  const getCachedIdentity = async (
    participant: InsightMatchParticipant,
  ): Promise<PlayerInsightsIdentityType> => {
    const k = participantIdentityKey(participant);
    const hit = identityCache.get(k);
    if (hit) {
      return hit;
    }
    const id = await toIdentity(participant, args.ctx);
    identityCache.set(k, id);
    return id;
  };

  const grouped = new Map<string, CohortGroupAcc>();

  for (const row of args.rows) {
    if (row.isCoop) {
      continue;
    }
    const targetParticipant = getTargetParticipant({
      row,
      input: args.input,
    });
    if (!targetParticipant) {
      continue;
    }

    const opponents = row.participants.filter((participant) => {
      if (participant.playerId === targetParticipant.playerId) {
        return false;
      }
      if (
        targetParticipant.teamId !== null &&
        participant.teamId === targetParticipant.teamId
      ) {
        return false;
      }
      return true;
    });

    if (opponents.length < MIN_COHORT_OPPONENTS) {
      continue;
    }

    const opponentsSorted = opponents.toSorted((a, b) =>
      participantIdentityKey(a).localeCompare(participantIdentityKey(b)),
    );

    const matchEntry =
      await playerInsightsMatchQueryService.mapMatchEntryFromRow({
        ctx: args.ctx,
        input: {
          matchId: row.matchId,
          sharedMatchId: row.sharedMatchId,
          matchType: row.matchType,
          date: row.date,
          isCoop: row.isCoop,
          gameId: row.gameId,
          sharedGameId: row.sharedGameId,
          gameType: row.gameType,
          gameName: row.gameName,
          gameImage: row.gameImage,
          scoresheetWinCondition: row.scoresheetWinCondition,
          outcomePlacement: row.outcomePlacement,
          outcomeScore: row.outcomeScore,
          outcomeWinner: row.outcomeWinner,
          playerCount: row.participants.length,
        },
      });
    const gk = gameIdentityKey(row);

    let rowSubsetsConsidered = 0;
    let rowSubsetBudgetExhausted = false;
    const maxK = Math.min(MAX_COHORT_OPPONENTS, opponentsSorted.length);
    for (
      let k = MIN_COHORT_OPPONENTS;
      k <= maxK && !rowSubsetBudgetExhausted;
      k++
    ) {
      const combos = kCombinations(opponentsSorted, k);
      for (const subset of combos) {
        if (rowSubsetsConsidered >= MAX_COHORT_SUBSETS) {
          rowSubsetBudgetExhausted = true;
          break;
        }
        rowSubsetsConsidered += 1;
        const memberIdentities = await Promise.all(
          subset.map((op) => getCachedIdentity(op)),
        );
        memberIdentities.sort((a, b) =>
          identityKeyFromIdentity(a).localeCompare(identityKeyFromIdentity(b)),
        );
        const groupKey = memberIdentities
          .map((m) => identityKeyFromIdentity(m))
          .join("|");

        const swept = subset.every(
          (op) =>
            compareRivalHeadToHead({
              row,
              target: targetParticipant,
              other: op,
            }) === "win",
        );

        const cohortParticipants: InsightMatchParticipant[] = [
          targetParticipant,
          ...subset,
        ];
        const cohortSize = cohortParticipants.length;
        const isExact = row.participants.length === cohortSize ? 1 : 0;

        let acc = grouped.get(groupKey);
        if (!acc) {
          const identityByKey = new Map<string, PlayerInsightsIdentityType>();
          identityByKey.set(profileKey, args.profileIdentity);
          for (const m of memberIdentities) {
            identityByKey.set(identityKeyFromIdentity(m), m);
          }
          acc = {
            groupKey,
            members: memberIdentities,
            matches: 0,
            sweptWins: 0,
            exactMatches: 0,
            placementSum: 0,
            placementCount: 0,
            scoreSum: 0,
            scoreCount: 0,
            recentMatches: [],
            gameKeys: new Set<string>(),
            lastPlayedAt: null,
            placementsByPlayerKey: new Map(),
            pairwise: new Map<string, CohortPairwiseAcc>(),
            identityByKey,
          };
          grouped.set(groupKey, acc);
        }

        applyCohortSubsetContribution({
          acc,
          profileKey,
          targetParticipant,
          subset,
          row,
          matchEntry,
          gameKey: gk,
          swept,
          isExact,
        });
      }
    }
  }

  const filtered = Array.from(grouped.values()).filter(
    (g) => g.matches >= MIN_MATCHES_PER_COHORT_GROUP,
  );

  return filtered
    .map((g): PlayerInsightsPlayedWithGroupType => {
      const stability = g.matches > 0 ? g.exactMatches / g.matches : 0;

      const cohortKeys = [
        profileKey,
        ...g.members.map((m) => identityKeyFromIdentity(m)),
      ];

      const groupOrdering = cohortKeys
        .map((key) => {
          const pl = g.placementsByPlayerKey.get(key);
          const avgPlacement =
            pl !== undefined && pl.count > 0 ? pl.sum / pl.count : null;
          const player = g.identityByKey.get(key);
          if (player === undefined) {
            return null;
          }
          return {
            player,
            avgPlacement,
            rank: 0,
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            player: PlayerInsightsIdentityType;
            avgPlacement: number | null;
            rank: number;
          } => entry !== null,
        )
        .toSorted((a, b) => {
          if (a.avgPlacement === null && b.avgPlacement === null) {
            return a.player.name.localeCompare(b.player.name);
          }
          if (a.avgPlacement === null) {
            return 1;
          }
          if (b.avgPlacement === null) {
            return -1;
          }
          if (a.avgPlacement !== b.avgPlacement) {
            return a.avgPlacement - b.avgPlacement;
          }
          return a.player.name.localeCompare(b.player.name);
        })
        .map((entry, idx) => ({
          player: entry.player,
          avgPlacement: entry.avgPlacement,
          rank: idx + 1,
        }));

      const pairwiseWithinCohort = Array.from(g.pairwise.values())
        .map((p) => ({
          playerA: p.identityA,
          playerB: p.identityB,
          matches: p.matches,
          winsA: p.winsA,
          lossesA: p.lossesA,
          ties: p.ties,
          winRateA: p.matches > 0 ? p.winsA / p.matches : 0,
          avgPlacementDeltaA:
            p.placementDeltaCount > 0
              ? p.placementDeltaSum / p.placementDeltaCount
              : null,
        }))
        .toSorted((a, b) => {
          const na = `${a.playerA.name}|${a.playerB.name}`;
          const nb = `${b.playerA.name}|${b.playerB.name}`;
          return na.localeCompare(nb);
        });

      return {
        groupKey: g.groupKey,
        profileInCohort: args.profileIdentity,
        members: g.members,
        matches: g.matches,
        winsWithGroup: g.sweptWins,
        winRateWithGroup: g.matches > 0 ? g.sweptWins / g.matches : 0,
        avgPlacement:
          g.placementCount > 0 ? g.placementSum / g.placementCount : null,
        avgScore: g.scoreCount > 0 ? g.scoreSum / g.scoreCount : null,
        uniqueGamesPlayed: g.gameKeys.size,
        lastPlayedAt: g.lastPlayedAt,
        recentMatches: g.recentMatches,
        stability,
        groupOrdering,
        pairwiseWithinCohort,
      };
    })
    .toSorted((a, b) => b.matches - a.matches)
    .slice(0, MAX_PLAYED_WITH_GROUPS);
};
