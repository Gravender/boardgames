import type {
  CorePlayer,
  FrequentLineup,
  MatchInsightData,
  PerPlayerDistribution,
  PlayerCountDistributionEntry,
} from "./game-insights.service.types";
import { buildCorePlayer } from "./game-core-detection.service";

// ─── Player-count distribution ───────────────────────────────────

export const computePlayerCountDistribution = (
  matchMap: Map<number, MatchInsightData>,
): {
  game: PlayerCountDistributionEntry[];
  perPlayer: PerPlayerDistribution[];
} => {
  const countMap = new Map<number, number>();
  const playerCountMap = new Map<
    string,
    { player: CorePlayer; counts: Map<number, number> }
  >();
  const totalMatches = matchMap.size;

  for (const matchData of matchMap.values()) {
    const pc = matchData.playerCount;
    countMap.set(pc, (countMap.get(pc) ?? 0) + 1);

    for (const p of matchData.players) {
      let entry = playerCountMap.get(p.playerKey);
      if (!entry) {
        entry = { player: buildCorePlayer(p), counts: new Map() };
        playerCountMap.set(p.playerKey, entry);
      }
      entry.counts.set(pc, (entry.counts.get(pc) ?? 0) + 1);
    }
  }

  const gameDistribution: PlayerCountDistributionEntry[] = Array.from(
    countMap.entries(),
  )
    .map(([playerCount, matchCount]) => ({
      playerCount,
      matchCount,
      percentage:
        totalMatches > 0 ? Math.round((matchCount / totalMatches) * 100) : 0,
    }))
    .sort((a, b) => a.playerCount - b.playerCount);

  const perPlayer: PerPlayerDistribution[] = Array.from(playerCountMap.values())
    .map((entry) => ({
      player: entry.player,
      distribution: Array.from(entry.counts.entries())
        .map(([playerCount, matchCount]) => ({ playerCount, matchCount }))
        .sort((a, b) => a.playerCount - b.playerCount),
    }))
    .sort((a, b) => {
      if (a.player.isUser !== b.player.isUser) {
        return a.player.isUser ? -1 : 1;
      }
      const totalA = a.distribution.reduce((s, d) => s + d.matchCount, 0);
      const totalB = b.distribution.reduce((s, d) => s + d.matchCount, 0);
      return totalB - totalA;
    });

  return { game: gameDistribution, perPlayer };
};

// ─── Frequent exact lineups ──────────────────────────────────────

export const computeFrequentLineups = (
  matchMap: Map<number, MatchInsightData>,
): FrequentLineup[] => {
  const lineupMap = new Map<
    string,
    {
      playerKeys: string[];
      matchIds: number[];
      matches: { matchId: number; date: Date }[];
    }
  >();

  for (const matchData of matchMap.values()) {
    const sortedKeys = matchData.players.map((p) => p.playerKey).sort();
    const lineupKey = sortedKeys.join("|");

    let entry = lineupMap.get(lineupKey);
    if (!entry) {
      entry = { playerKeys: sortedKeys, matchIds: [], matches: [] };
      lineupMap.set(lineupKey, entry);
    }
    entry.matchIds.push(matchData.matchId);
    entry.matches.push({
      matchId: matchData.matchId,
      date: matchData.matchDate,
    });
  }

  const playerInfoMap = new Map<string, CorePlayer>();
  for (const matchData of matchMap.values()) {
    for (const p of matchData.players) {
      if (!playerInfoMap.has(p.playerKey)) {
        playerInfoMap.set(p.playerKey, buildCorePlayer(p));
      }
    }
  }

  const lineups: FrequentLineup[] = Array.from(lineupMap.values())
    .filter((entry) => entry.matchIds.length >= 2)
    .map((entry) => ({
      players: entry.playerKeys
        .map((key) => playerInfoMap.get(key))
        .filter((p): p is CorePlayer => p !== undefined),
      matchCount: entry.matchIds.length,
      matchIds: entry.matchIds,
      matches: entry.matches.sort(
        (a, b) => b.date.getTime() - a.date.getTime(),
      ),
    }))
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 10);

  return lineups;
};
