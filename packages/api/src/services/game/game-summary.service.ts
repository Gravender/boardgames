import type {
  DetectedCore,
  FrequentLineup,
  InsightsSummary,
  PerPlayerDistribution,
  PlayerCountDistributionEntry,
  TeamCore,
} from "./game-insights.service.types";

// ─── Summary computation ─────────────────────────────────────────

export const computeSummary = (
  distribution: {
    game: PlayerCountDistributionEntry[];
    perPlayer: PerPlayerDistribution[];
  },
  pairs: DetectedCore[],
  trios: DetectedCore[],
  teamPairs: TeamCore[],
  lineups: FrequentLineup[],
): InsightsSummary => {
  const mostCommon = findMostCommonPlayerCount(distribution.game);
  const userPlayerCount = computeUserPlayerCount(distribution.perPlayer);
  const topRival = findTopRival(pairs);
  const topPair = buildTopCore(pairs[0]);
  const topTrio = buildTopCore(trios[0]);
  const topGroup = findTopGroup(lineups);
  const bestTeamCore = findBestTeamCore(teamPairs);

  const totalMatchesAnalyzed = distribution.game.reduce(
    (sum, e) => sum + e.matchCount,
    0,
  );

  return {
    mostCommonPlayerCount: mostCommon
      ? { count: mostCommon.playerCount, percentage: mostCommon.percentage }
      : null,
    userPlayerCount,
    topRival,
    topPair,
    topTrio,
    topGroup,
    bestTeamCore,
    totalMatchesAnalyzed,
  };
};

// ─── Helpers ─────────────────────────────────────────────────────

const findMostCommonPlayerCount = (
  game: PlayerCountDistributionEntry[],
): PlayerCountDistributionEntry | null =>
  game.reduce<PlayerCountDistributionEntry | null>((best, entry) => {
    if (!best || entry.matchCount > best.matchCount) return entry;
    return best;
  }, null);

const computeUserPlayerCount = (
  perPlayer: PerPlayerDistribution[],
): InsightsSummary["userPlayerCount"] => {
  const userDist = perPlayer.find((p) => p.player.isUser);
  if (!userDist || userDist.distribution.length === 0) return null;

  const userTotal = userDist.distribution.reduce((s, d) => s + d.matchCount, 0);
  const userMostCommon = userDist.distribution.reduce((best, d) =>
    d.matchCount > best.matchCount ? d : best,
  );
  return {
    mostCommon: userMostCommon.playerCount,
    percentage:
      userTotal > 0
        ? Math.round((userMostCommon.matchCount / userTotal) * 100)
        : 0,
    totalMatches: userTotal,
  };
};

const findTopRival = (pairs: DetectedCore[]): InsightsSummary["topRival"] => {
  let topRival: InsightsSummary["topRival"] = null;
  for (const pair of pairs) {
    const userPlayer = pair.players.find((p) => p.isUser);
    if (!userPlayer) continue;

    for (const ps of pair.pairwiseStats) {
      if (ps.matchCount < 3) continue;
      const isUserA = ps.playerA.isUser;
      const rate = isUserA ? ps.finishesAboveRate : 1 - ps.finishesAboveRate;
      const opponentName = isUserA
        ? ps.playerB.playerName
        : ps.playerA.playerName;

      if (!topRival || rate > topRival.finishesAboveRate) {
        topRival = {
          name: opponentName,
          finishesAboveRate: rate,
          matchCount: ps.matchCount,
        };
      }
    }
  }
  return topRival;
};

const buildTopCore = (
  core: DetectedCore | undefined,
): InsightsSummary["topPair"] => {
  if (!core) return null;
  return {
    names: core.players.map((p) => p.playerName),
    matchCount: core.matchCount,
  };
};

const findTopGroup = (
  lineups: FrequentLineup[],
): InsightsSummary["topGroup"] => {
  const topGroupLineup = lineups.find((l) => l.players.length >= 3);
  if (!topGroupLineup) return null;
  return {
    names: topGroupLineup.players.map((p) => p.playerName),
    matchCount: topGroupLineup.matchCount,
    playerCount: topGroupLineup.players.length,
  };
};

const findBestTeamCore = (
  teamPairs: TeamCore[],
): InsightsSummary["bestTeamCore"] => {
  let bestTeamCore: InsightsSummary["bestTeamCore"] = null;
  for (const tc of teamPairs) {
    if (tc.teamMatches < 3) continue;
    if (!bestTeamCore || tc.teamWinRate > bestTeamCore.winRate) {
      bestTeamCore = {
        names: tc.players.map((p) => p.playerName),
        winRate: tc.teamWinRate,
        matchCount: tc.teamMatches,
      };
    }
  }
  return bestTeamCore;
};
