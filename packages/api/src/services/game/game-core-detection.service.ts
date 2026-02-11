import type {
  CorePlayer,
  DetectedCore,
  MatchInsightData,
  MatchPlayerEntry,
  PairwiseStat,
  PlayerCountBucketStat,
  RawCore,
} from "./game-insights.service.types";

// ─── Helpers ─────────────────────────────────────────────────────

/** Generate all k-sized combinations from arr. */
const kCombinations = <T>(arr: T[], k: number): T[][] => {
  if (k > arr.length || k <= 0) return [];
  if (k === arr.length) return [arr.slice()];
  if (k === 1) return arr.map((item) => [item]);

  const result: T[][] = [];
  const helper = (start: number, combo: T[]) => {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i <= arr.length - (k - combo.length); i++) {
      const item = arr[i];
      if (item === undefined) continue;
      combo.push(item);
      helper(i + 1, combo);
      combo.pop();
    }
  };
  helper(0, []);
  return result;
};

const getPlayerCountBucket = (count: number): string => {
  if (count <= 4) return `${count}p`;
  if (count <= 6) return "5-6p";
  return "7+p";
};

const getConfidence = (matchCount: number): "low" | "medium" | "high" => {
  if (matchCount < 3) return "low";
  if (matchCount <= 10) return "medium";
  return "high";
};

export const buildCorePlayer = (entry: MatchPlayerEntry): CorePlayer => ({
  playerKey: entry.playerKey,
  playerId: entry.playerId,
  playerName: entry.playerName,
  playerType: entry.playerType,
  isUser: entry.isUser,
  image: entry.image,
});

// ─── Core detection (generic over k and teamOnly) ────────────────

export const detectCores = (
  matchMap: Map<number, MatchInsightData>,
  coreSize: number,
  minMatches: number,
  teamOnly: boolean,
): RawCore[] => {
  const coreMap = new Map<
    string,
    { playerKeys: string[]; matchIds: Set<number> }
  >();

  for (const [matchId, matchData] of matchMap) {
    if (teamOnly) {
      const teamGroups = new Map<number, string[]>();
      for (const p of matchData.players) {
        if (p.teamId === null) continue;
        let group = teamGroups.get(p.teamId);
        if (!group) {
          group = [];
          teamGroups.set(p.teamId, group);
        }
        group.push(p.playerKey);
      }
      for (const group of teamGroups.values()) {
        if (group.length < coreSize) continue;
        const subsets = kCombinations(group.sort(), coreSize);
        for (const subset of subsets) {
          const coreKey = subset.join("|");
          let entry = coreMap.get(coreKey);
          if (!entry) {
            entry = { playerKeys: subset, matchIds: new Set() };
            coreMap.set(coreKey, entry);
          }
          entry.matchIds.add(matchId);
        }
      }
      continue;
    }

    const playerKeys = matchData.players.map((p) => p.playerKey).sort();
    if (playerKeys.length < coreSize) continue;

    const subsets = kCombinations(playerKeys, coreSize);
    for (const subset of subsets) {
      const coreKey = subset.join("|");
      let entry = coreMap.get(coreKey);
      if (!entry) {
        entry = { playerKeys: subset, matchIds: new Set() };
        coreMap.set(coreKey, entry);
      }
      entry.matchIds.add(matchId);
    }
  }

  const cores: RawCore[] = [];
  for (const [coreKey, entry] of coreMap) {
    if (entry.matchIds.size >= minMatches) {
      cores.push({
        coreKey,
        playerKeys: entry.playerKeys,
        matchIds: Array.from(entry.matchIds),
      });
    }
  }

  cores.sort((a, b) => b.matchIds.length - a.matchIds.length);
  return cores.slice(0, 20);
};

// ─── Per-match pairwise accumulation ─────────────────────────────

interface PairAccumulator {
  aAboveB: number;
  total: number;
  placementDeltas: number[];
  scoreDeltas: number[];
  byBucket: Map<
    string,
    {
      aAboveB: number;
      total: number;
      placementDeltas: number[];
      scoreDeltas: number[];
    }
  >;
}

const createPairAccumulator = (): PairAccumulator => ({
  aAboveB: 0,
  total: 0,
  placementDeltas: [],
  scoreDeltas: [],
  byBucket: new Map(),
});

const accumulateManualWinnerPair = (
  pairAcc: PairAccumulator,
  pA: MatchPlayerEntry,
  pB: MatchPlayerEntry,
  bucket: string,
): void => {
  if (pA.winner === pB.winner) return;

  pairAcc.total++;
  if (pA.winner) pairAcc.aAboveB++;

  let bucketAcc = pairAcc.byBucket.get(bucket);
  if (!bucketAcc) {
    bucketAcc = { aAboveB: 0, total: 0, placementDeltas: [], scoreDeltas: [] };
    pairAcc.byBucket.set(bucket, bucketAcc);
  }
  bucketAcc.total++;
  if (pA.winner) bucketAcc.aAboveB++;
};

const accumulatePlacementPair = (
  pairAcc: PairAccumulator,
  pA: MatchPlayerEntry,
  pB: MatchPlayerEntry,
  bucket: string,
): void => {
  if (pA.placement <= 0 || pB.placement <= 0) return;

  pairAcc.total++;
  if (pA.placement < pB.placement) pairAcc.aAboveB++;

  const placementDelta = pA.placement - pB.placement;
  pairAcc.placementDeltas.push(placementDelta);

  let bucketAcc = pairAcc.byBucket.get(bucket);
  if (!bucketAcc) {
    bucketAcc = { aAboveB: 0, total: 0, placementDeltas: [], scoreDeltas: [] };
    pairAcc.byBucket.set(bucket, bucketAcc);
  }
  bucketAcc.total++;
  if (pA.placement < pB.placement) bucketAcc.aAboveB++;
  bucketAcc.placementDeltas.push(placementDelta);
};

const accumulateScoreDelta = (
  pairAcc: PairAccumulator,
  pA: MatchPlayerEntry,
  pB: MatchPlayerEntry,
  bucket: string,
): void => {
  if (pA.score === null || pB.score === null) return;

  const scoreDelta = pA.score - pB.score;
  pairAcc.scoreDeltas.push(scoreDelta);
  const bucketAcc = pairAcc.byBucket.get(bucket);
  if (bucketAcc) {
    bucketAcc.scoreDeltas.push(scoreDelta);
  }
};

// ─── Build PairwiseStat from accumulator ─────────────────────────

const mean = (arr: number[]): number =>
  arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const buildPairwiseStat = (
  playerA: CorePlayer,
  playerB: CorePlayer,
  acc: PairAccumulator,
): PairwiseStat => {
  const byPlayerCount: PlayerCountBucketStat[] = [];
  for (const [bucket, bAcc] of acc.byBucket) {
    if (bAcc.total === 0) continue;
    byPlayerCount.push({
      bucket,
      matchCount: bAcc.total,
      finishesAboveRate: bAcc.aAboveB / bAcc.total,
      avgPlacementDelta: mean(bAcc.placementDeltas),
      avgScoreDelta:
        bAcc.scoreDeltas.length > 0 ? mean(bAcc.scoreDeltas) : null,
    });
  }
  byPlayerCount.sort((a, b) => a.bucket.localeCompare(b.bucket));

  return {
    playerA,
    playerB,
    finishesAboveRate: acc.total > 0 ? acc.aAboveB / acc.total : 0,
    avgPlacementDelta: mean(acc.placementDeltas),
    avgScoreDelta: acc.scoreDeltas.length > 0 ? mean(acc.scoreDeltas) : null,
    matchCount: acc.total,
    confidence: getConfidence(acc.total),
    byPlayerCount,
  };
};

// ─── Compute stats for a detected core ───────────────────────────

export const computeCoreStats = (
  raw: RawCore,
  matchMap: Map<number, MatchInsightData>,
): DetectedCore => {
  const corePlayerKeys = new Set(raw.playerKeys);
  const matchCount = raw.matchIds.length;

  const playerInfoMap = new Map<string, CorePlayer>();
  const guestCountMap = new Map<
    string,
    { player: CorePlayer; count: number }
  >();
  let exactMatchCount = 0;

  const placementSums = new Map<string, { total: number; count: number }>();
  const winLossMap = new Map<
    string,
    { wins: number; losses: number; total: number }
  >();

  // Build pair keys
  const pairKeys: [string, string][] = [];
  for (let i = 0; i < raw.playerKeys.length; i++) {
    for (let j = i + 1; j < raw.playerKeys.length; j++) {
      const keyA = raw.playerKeys[i];
      const keyB = raw.playerKeys[j];
      if (keyA && keyB) {
        pairKeys.push([keyA, keyB]);
      }
    }
  }

  const pairAccMap = new Map<string, PairAccumulator>();
  for (const [keyA, keyB] of pairKeys) {
    pairAccMap.set(`${keyA}|${keyB}`, createPairAccumulator());
  }

  // Process each match
  for (const matchId of raw.matchIds) {
    const matchData = matchMap.get(matchId);
    if (!matchData) continue;

    const matchPlayerMap = new Map<string, MatchPlayerEntry>();
    for (const p of matchData.players) {
      matchPlayerMap.set(p.playerKey, p);
    }

    // Populate player info
    for (const key of raw.playerKeys) {
      const p = matchPlayerMap.get(key);
      if (p && !playerInfoMap.has(key)) {
        playerInfoMap.set(key, buildCorePlayer(p));
      }
    }

    // Track guests
    const isExact = matchData.players.length === raw.playerKeys.length;
    if (isExact) exactMatchCount++;

    for (const p of matchData.players) {
      if (corePlayerKeys.has(p.playerKey)) continue;
      const existing = guestCountMap.get(p.playerKey);
      if (existing) {
        existing.count++;
      } else {
        guestCountMap.set(p.playerKey, {
          player: buildCorePlayer(p),
          count: 1,
        });
      }
    }

    // Stats accumulation (skip coop)
    if (!matchData.isCoop) {
      const isManualWinner = matchData.winCondition === "Manual";

      // Win/loss tracking
      for (const key of raw.playerKeys) {
        const p = matchPlayerMap.get(key);
        if (!p) continue;
        const acc = winLossMap.get(key);
        if (acc) {
          acc.total++;
          if (p.winner) acc.wins++;
          else acc.losses++;
        } else {
          winLossMap.set(key, {
            wins: p.winner ? 1 : 0,
            losses: p.winner ? 0 : 1,
            total: 1,
          });
        }
      }

      // Placement accumulation (skip manual winner)
      if (!isManualWinner) {
        for (const key of raw.playerKeys) {
          const p = matchPlayerMap.get(key);
          if (!p || p.placement <= 0) continue;
          const acc = placementSums.get(key);
          if (acc) {
            acc.total += p.placement;
            acc.count++;
          } else {
            placementSums.set(key, { total: p.placement, count: 1 });
          }
        }
      }

      // Pairwise stats
      const bucket = getPlayerCountBucket(matchData.playerCount);
      for (const [keyA, keyB] of pairKeys) {
        const pA = matchPlayerMap.get(keyA);
        const pB = matchPlayerMap.get(keyB);
        if (!pA || !pB) continue;

        const pairAcc = pairAccMap.get(`${keyA}|${keyB}`);
        if (!pairAcc) continue;

        if (isManualWinner) {
          accumulateManualWinnerPair(pairAcc, pA, pB, bucket);
        } else {
          accumulatePlacementPair(pairAcc, pA, pB, bucket);
        }

        accumulateScoreDelta(pairAcc, pA, pB, bucket);
      }
    }
  }

  // Build players array
  const players: CorePlayer[] = raw.playerKeys
    .map((key) => playerInfoMap.get(key))
    .filter((p): p is CorePlayer => p !== undefined);

  // Build group ordering
  const hasPlacementData = placementSums.size > 0;
  const groupOrdering = players
    .map((p) => {
      const plAcc = placementSums.get(p.playerKey);
      const avgPlacement =
        plAcc && plAcc.count > 0 ? plAcc.total / plAcc.count : 0;

      const wlAcc = winLossMap.get(p.playerKey);
      const wins = wlAcc?.wins ?? 0;
      const losses = wlAcc?.losses ?? 0;
      const winRate = wlAcc && wlAcc.total > 0 ? wlAcc.wins / wlAcc.total : 0;

      return { player: p, avgPlacement, winRate, wins, losses, rank: 0 };
    })
    .sort((a, b) => {
      if (hasPlacementData) {
        if (a.avgPlacement === 0 && b.avgPlacement !== 0) return 1;
        if (b.avgPlacement === 0 && a.avgPlacement !== 0) return -1;
        if (a.avgPlacement !== 0 && b.avgPlacement !== 0) {
          return a.avgPlacement - b.avgPlacement;
        }
      }
      return b.winRate - a.winRate;
    })
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  // Build pairwise stats
  const pairwiseStats: PairwiseStat[] = [];
  for (const [keyA, keyB] of pairKeys) {
    const acc = pairAccMap.get(`${keyA}|${keyB}`);
    if (!acc) continue;

    const playerA = playerInfoMap.get(keyA);
    const playerB = playerInfoMap.get(keyB);
    if (!playerA || !playerB) continue;

    pairwiseStats.push(buildPairwiseStat(playerA, playerB, acc));
  }

  // Build guest list sorted by count desc
  const guests = Array.from(guestCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const stability = matchCount > 0 ? exactMatchCount / matchCount : 0;

  return {
    coreKey: raw.coreKey,
    players,
    matchCount,
    matchIds: raw.matchIds,
    stability,
    guests,
    groupOrdering,
    pairwiseStats,
  };
};
