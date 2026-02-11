import type {
  CorePlayer,
  DetectedCore,
  FrequentLineup,
  GameInsightsOutput,
  GetGameInsightsArgs,
  InsightsSummary,
  MatchInsightData,
  MatchPlayerEntry,
  PairwiseStat,
  PerPlayerDistribution,
  PlayerCountBucketStat,
  PlayerCountDistributionEntry,
  RawCore,
  TeamConfig,
  TeamCore,
} from "./game-insights.service.types";
import { gameRepository } from "../../repositories/game/game.repository";
import { computeRoleInsights } from "./game-role-insights.service";

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

const buildCorePlayer = (entry: MatchPlayerEntry): CorePlayer => ({
  playerKey: entry.playerKey,
  playerId: entry.playerId,
  playerName: entry.playerName,
  playerType: entry.playerType,
  isUser: entry.isUser,
  image: entry.image,
});

// ─── Service ─────────────────────────────────────────────────────

class GameInsightsService {
  public async getGameInsights(
    args: GetGameInsightsArgs,
  ): Promise<GameInsightsOutput> {
    const [rows, roleRows] = await Promise.all([
      gameRepository.getGameInsightsData({
        input: args.input,
        userId: args.ctx.userId,
      }),
      gameRepository.getGameInsightsRoleData({
        input: args.input,
        userId: args.ctx.userId,
      }),
    ]);

    const matchMap = this.groupMatchesByMatch(rows);

    // Merge role data into the match map
    this.mergeRoleData(matchMap, roleRows);

    // Game cores (all players in match, regardless of team)
    const rawPairs = this.detectCores(matchMap, 2, 3, false);
    const pairs = rawPairs.map((raw) => this.computeCoreStats(raw, matchMap));

    const rawTrios = this.detectCores(matchMap, 3, 3, false);
    const trios = rawTrios.map((raw) => this.computeCoreStats(raw, matchMap));

    const rawQuartets = this.detectCores(matchMap, 4, 3, false);
    const quartets = rawQuartets.map((raw) =>
      this.computeCoreStats(raw, matchMap),
    );

    // Team cores (same team within match)
    const rawTeamPairs = this.detectCores(matchMap, 2, 3, true);
    const teamPairs = rawTeamPairs.map((raw) =>
      this.computeTeamCoreStats(raw, matchMap),
    );

    const rawTeamTrios = this.detectCores(matchMap, 3, 3, true);
    const teamTrios = rawTeamTrios.map((raw) =>
      this.computeTeamCoreStats(raw, matchMap),
    );

    const rawTeamQuartets = this.detectCores(matchMap, 4, 3, true);
    const teamQuartets = rawTeamQuartets.map((raw) =>
      this.computeTeamCoreStats(raw, matchMap),
    );

    const teamConfigurations = this.computeTeamConfigurations(matchMap);

    // Determine if any team data exists
    const hasTeamData =
      teamPairs.length > 0 ||
      teamTrios.length > 0 ||
      teamQuartets.length > 0 ||
      teamConfigurations.length > 0;

    const teams = hasTeamData
      ? {
          cores: {
            pairs: teamPairs,
            trios: teamTrios,
            quartets: teamQuartets,
          },
          configurations: teamConfigurations,
        }
      : null;

    const distribution = this.computePlayerCountDistribution(matchMap);
    const lineups = this.computeFrequentLineups(matchMap);
    const summary = this.computeSummary(
      distribution,
      pairs,
      trios,
      teamPairs,
      lineups,
    );

    // Compute role insights (null if no role data)
    const roles = computeRoleInsights(matchMap);

    return {
      summary,
      distribution,
      cores: { pairs, trios, quartets },
      lineups,
      teams,
      roles,
    };
  }

  // ─── Group flat rows by match ──────────────────────────────────

  private groupMatchesByMatch(
    rows: Awaited<ReturnType<typeof gameRepository.getGameInsightsData>>,
  ): Map<number, MatchInsightData> {
    const matchMap = new Map<number, MatchInsightData>();

    for (const row of rows) {
      let matchData = matchMap.get(row.matchId);
      if (!matchData) {
        matchData = {
          matchId: row.matchId,
          matchDate: row.matchDate,
          isCoop: row.isCoop,
          winCondition: row.winCondition,
          playerCount: Number(row.playerCount),
          players: [],
        };
        matchMap.set(row.matchId, matchData);
      }

      const sourceType = row.playerSourceType;
      const playerType: "original" | "shared" =
        sourceType === "linked" || sourceType === "original"
          ? "original"
          : "shared";
      const playerKey = `${playerType}-${row.playerId}`;

      // Avoid duplicates within same match
      if (matchData.players.some((p) => p.playerKey === playerKey)) continue;

      matchData.players.push({
        playerKey,
        playerId: row.playerId,
        playerName: row.playerName,
        playerType,
        isUser: row.isUser,
        winner: row.winner ?? false,
        score: row.score,
        placement: row.placement ?? 0,
        teamId: row.teamId,
        teamName: row.teamName,
        image:
          row.playerImageName !== null
            ? {
                name: row.playerImageName,
                url: row.playerImageUrl,
                type: row.playerImageType ?? "file",
              }
            : null,
        roles: [],
      });
    }

    return matchMap;
  }

  // ─── Merge role data into the match map ─────────────────────────

  private mergeRoleData(
    matchMap: Map<number, MatchInsightData>,
    roleRows: Awaited<
      ReturnType<typeof gameRepository.getGameInsightsRoleData>
    >,
  ): void {
    for (const row of roleRows) {
      const matchData = matchMap.get(row.matchId);
      if (!matchData) continue;

      const sourceType = row.playerSourceType;
      const playerType: "original" | "shared" =
        sourceType === "linked" || sourceType === "original"
          ? "original"
          : "shared";
      const playerKey = `${playerType}-${row.playerId}`;

      const playerEntry = matchData.players.find(
        (p) => p.playerKey === playerKey,
      );
      if (!playerEntry) continue;

      // Deduplicate by canonicalRoleId within the same player
      if (playerEntry.roles.some((r) => r.roleId === row.canonicalRoleId)) {
        continue;
      }

      playerEntry.roles.push({
        roleId: row.canonicalRoleId,
        roleName: row.roleName,
        roleDescription: row.roleDescription,
      });
    }
  }

  // ─── Core detection (generic over k and teamOnly) ──────────────

  private detectCores(
    matchMap: Map<number, MatchInsightData>,
    coreSize: number,
    minMatches: number,
    teamOnly: boolean,
  ): RawCore[] {
    // coreKey -> { playerKeys, matchIds set }
    const coreMap = new Map<
      string,
      { playerKeys: string[]; matchIds: Set<number> }
    >();

    for (const [matchId, matchData] of matchMap) {
      if (teamOnly) {
        // Group players by teamId, then generate subsets per team
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
        // Generate subsets for each team group
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

      // Game core: all players regardless of team
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

    // Filter by minMatches and convert to array
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

    // Sort by match count descending
    cores.sort((a, b) => b.matchIds.length - a.matchIds.length);

    // Return top 20
    return cores.slice(0, 20);
  }

  // ─── Compute stats for a detected core ─────────────────────────

  private computeCoreStats(
    raw: RawCore,
    matchMap: Map<number, MatchInsightData>,
  ): DetectedCore {
    const corePlayerKeys = new Set(raw.playerKeys);
    const matchCount = raw.matchIds.length;

    // Collect player info from first match that has all core members
    const playerInfoMap = new Map<string, CorePlayer>();
    const guestCountMap = new Map<
      string,
      { player: CorePlayer; count: number }
    >();
    let exactMatchCount = 0;

    // Per-player placement accumulators (for non-coop, non-manual matches only)
    const placementSums = new Map<string, { total: number; count: number }>();

    // Per-player win/loss accumulators (for non-coop matches)
    const winLossMap = new Map<
      string,
      { wins: number; losses: number; total: number }
    >();

    // Pairwise accumulators
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

    // pairKey -> accumulators
    const pairAccMap = new Map<
      string,
      {
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
    >();

    for (const [keyA, keyB] of pairKeys) {
      pairAccMap.set(`${keyA}|${keyB}`, {
        aAboveB: 0,
        total: 0,
        placementDeltas: [],
        scoreDeltas: [],
        byBucket: new Map(),
      });
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

        // Win/loss tracking for all competitive matches
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

        // Placement accumulation (skip manual winner — placement is meaningless there)
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
            // Manual winner: use winner boolean for head-to-head
            // Only count when outcomes differ (one won, one didn't)
            if (pA.winner !== pB.winner) {
              pairAcc.total++;
              if (pA.winner) pairAcc.aAboveB++;

              // By bucket
              let bucketAcc = pairAcc.byBucket.get(bucket);
              if (!bucketAcc) {
                bucketAcc = {
                  aAboveB: 0,
                  total: 0,
                  placementDeltas: [],
                  scoreDeltas: [],
                };
                pairAcc.byBucket.set(bucket, bucketAcc);
              }
              bucketAcc.total++;
              if (pA.winner) bucketAcc.aAboveB++;
            }
          } else {
            // Placement-based: existing logic
            if (pA.placement > 0 && pB.placement > 0) {
              pairAcc.total++;
              if (pA.placement < pB.placement) pairAcc.aAboveB++;

              const placementDelta = pA.placement - pB.placement;
              pairAcc.placementDeltas.push(placementDelta);

              // By bucket
              let bucketAcc = pairAcc.byBucket.get(bucket);
              if (!bucketAcc) {
                bucketAcc = {
                  aAboveB: 0,
                  total: 0,
                  placementDeltas: [],
                  scoreDeltas: [],
                };
                pairAcc.byBucket.set(bucket, bucketAcc);
              }
              bucketAcc.total++;
              if (pA.placement < pB.placement) bucketAcc.aAboveB++;
              bucketAcc.placementDeltas.push(placementDelta);
            }
          }

          // Score delta (independent of win condition)
          if (pA.score !== null && pB.score !== null) {
            const scoreDelta = pA.score - pB.score;
            pairAcc.scoreDeltas.push(scoreDelta);
            const bucketAcc = pairAcc.byBucket.get(bucket);
            if (bucketAcc) {
              bucketAcc.scoreDeltas.push(scoreDelta);
            }
          }
        }
      }
    }

    // Build players array
    const players: CorePlayer[] = raw.playerKeys
      .map((key) => playerInfoMap.get(key))
      .filter((p): p is CorePlayer => p !== undefined);

    // Build group ordering with both placement and win/loss data
    // avgPlacement of 0 means "no data" (valid placements are always >= 1)
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
          // Placement-based sort: lower avgPlacement = better
          if (a.avgPlacement === 0 && b.avgPlacement !== 0) return 1;
          if (b.avgPlacement === 0 && a.avgPlacement !== 0) return -1;
          if (a.avgPlacement !== 0 && b.avgPlacement !== 0) {
            return a.avgPlacement - b.avgPlacement;
          }
        }
        // Win-rate-based sort (for manual winner or tie-breaking): higher = better
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

      const finishesAboveRate = acc.total > 0 ? acc.aAboveB / acc.total : 0;
      const avgPlacementDelta =
        acc.placementDeltas.length > 0
          ? acc.placementDeltas.reduce((a, b) => a + b, 0) /
            acc.placementDeltas.length
          : 0;
      const avgScoreDelta =
        acc.scoreDeltas.length > 0
          ? acc.scoreDeltas.reduce((a, b) => a + b, 0) / acc.scoreDeltas.length
          : null;

      const byPlayerCount: PlayerCountBucketStat[] = [];
      for (const [bucket, bAcc] of acc.byBucket) {
        if (bAcc.total === 0) continue;
        byPlayerCount.push({
          bucket,
          matchCount: bAcc.total,
          finishesAboveRate: bAcc.aAboveB / bAcc.total,
          avgPlacementDelta:
            bAcc.placementDeltas.length > 0
              ? bAcc.placementDeltas.reduce((a, b) => a + b, 0) /
                bAcc.placementDeltas.length
              : 0,
          avgScoreDelta:
            bAcc.scoreDeltas.length > 0
              ? bAcc.scoreDeltas.reduce((a, b) => a + b, 0) /
                bAcc.scoreDeltas.length
              : null,
        });
      }
      // Sort buckets by player count
      byPlayerCount.sort((a, b) => a.bucket.localeCompare(b.bucket));

      pairwiseStats.push({
        playerA,
        playerB,
        finishesAboveRate,
        avgPlacementDelta,
        avgScoreDelta,
        matchCount: acc.total,
        confidence: getConfidence(acc.total),
        byPlayerCount,
      });
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
  }

  // ─── Compute team core stats (extends core stats with win rate) ─

  private computeTeamCoreStats(
    raw: RawCore,
    matchMap: Map<number, MatchInsightData>,
  ): TeamCore {
    const base = this.computeCoreStats(raw, matchMap);

    // Compute team win rate: % of matches where the shared team won
    let teamWins = 0;
    let teamMatches = 0;

    for (const matchId of raw.matchIds) {
      const matchData = matchMap.get(matchId);
      if (!matchData) continue;

      // Find a core member and their teamId in this match
      const firstCoreKey = raw.playerKeys[0];
      if (!firstCoreKey) continue;

      const corePlayer = matchData.players.find(
        (p) => p.playerKey === firstCoreKey,
      );
      if (!corePlayer) continue;
      if (corePlayer.teamId === null) continue;

      const sharedTeamId = corePlayer.teamId;

      // Check if the team won: all core members on the same team should have winner=true
      const teamWon = matchData.players
        .filter((p) => p.teamId === sharedTeamId)
        .some((p) => p.winner);

      teamMatches++;
      if (teamWon) teamWins++;
    }

    return {
      ...base,
      teamWinRate: teamMatches > 0 ? teamWins / teamMatches : 0,
      teamWins,
      teamMatches,
    };
  }

  // ─── Team configurations (team-vs-team matchups) ───────────────

  private computeTeamConfigurations(
    matchMap: Map<number, MatchInsightData>,
  ): TeamConfig[] {
    // Build a player info map for CorePlayer construction
    const playerInfoMap = new Map<string, CorePlayer>();
    for (const matchData of matchMap.values()) {
      for (const p of matchData.players) {
        if (!playerInfoMap.has(p.playerKey)) {
          playerInfoMap.set(p.playerKey, buildCorePlayer(p));
        }
      }
    }

    // Group matches by team composition signature
    const configMap = new Map<
      string,
      {
        teams: {
          playerKeys: string[];
          teamName: string;
          wins: number;
        }[];
        matchIds: number[];
      }
    >();

    for (const matchData of matchMap.values()) {
      // Group players by teamId
      const teamGroups = new Map<
        number,
        { playerKeys: string[]; teamName: string; hasWinner: boolean }
      >();
      let hasTeams = false;

      for (const p of matchData.players) {
        if (p.teamId === null) continue;
        hasTeams = true;
        let group = teamGroups.get(p.teamId);
        if (!group) {
          group = {
            playerKeys: [],
            teamName: p.teamName ?? `Team ${p.teamId}`,
            hasWinner: false,
          };
          teamGroups.set(p.teamId, group);
        }
        group.playerKeys.push(p.playerKey);
        if (p.winner) group.hasWinner = true;
      }

      if (!hasTeams || teamGroups.size < 2) continue;

      // Create a canonical signature: sort teams by their sorted player keys
      const sortedTeams = Array.from(teamGroups.values())
        .map((g) => ({
          ...g,
          playerKeys: g.playerKeys.sort(),
        }))
        .sort((a, b) =>
          a.playerKeys.join("|").localeCompare(b.playerKeys.join("|")),
        );

      const configKey = sortedTeams
        .map((t) => t.playerKeys.join(","))
        .join(" vs ");

      let entry = configMap.get(configKey);
      if (!entry) {
        entry = {
          teams: sortedTeams.map((t) => ({
            playerKeys: t.playerKeys,
            teamName: t.teamName,
            wins: 0,
          })),
          matchIds: [],
        };
        configMap.set(configKey, entry);
      }
      entry.matchIds.push(matchData.matchId);

      // Record wins
      for (let i = 0; i < sortedTeams.length; i++) {
        const sortedTeam = sortedTeams[i];
        const entryTeam = entry.teams[i];
        if (sortedTeam?.hasWinner && entryTeam) {
          entryTeam.wins++;
        }
      }
    }

    // Convert to TeamConfig[], filter by min 2 matches, sort by count desc
    const configs: TeamConfig[] = Array.from(configMap.values())
      .filter((entry) => entry.matchIds.length >= 2)
      .map((entry) => ({
        teams: entry.teams.map((t) => ({
          players: t.playerKeys
            .map((key) => playerInfoMap.get(key))
            .filter((p): p is CorePlayer => p !== undefined),
          teamName: t.teamName,
        })),
        matchCount: entry.matchIds.length,
        matchIds: entry.matchIds,
        outcomes: entry.teams.map((t, idx) => ({
          teamIndex: idx,
          wins: t.wins,
        })),
      }))
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 15);

    return configs;
  }

  // ─── Player-count distribution ─────────────────────────────────

  private computePlayerCountDistribution(
    matchMap: Map<number, MatchInsightData>,
  ): {
    game: PlayerCountDistributionEntry[];
    perPlayer: PerPlayerDistribution[];
  } {
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

    const perPlayer: PerPlayerDistribution[] = Array.from(
      playerCountMap.values(),
    )
      .map((entry) => ({
        player: entry.player,
        distribution: Array.from(entry.counts.entries())
          .map(([playerCount, matchCount]) => ({ playerCount, matchCount }))
          .sort((a, b) => a.playerCount - b.playerCount),
      }))
      .sort((a, b) => {
        // User first, then by total matches desc
        if (a.player.isUser !== b.player.isUser) {
          return a.player.isUser ? -1 : 1;
        }
        const totalA = a.distribution.reduce((s, d) => s + d.matchCount, 0);
        const totalB = b.distribution.reduce((s, d) => s + d.matchCount, 0);
        return totalB - totalA;
      });

    return { game: gameDistribution, perPlayer };
  }

  // ─── Frequent exact lineups ────────────────────────────────────

  private computeFrequentLineups(
    matchMap: Map<number, MatchInsightData>,
  ): FrequentLineup[] {
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

    // Build player info map from all matches
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
  }

  // ─── Summary ───────────────────────────────────────────────────

  private computeSummary(
    distribution: {
      game: PlayerCountDistributionEntry[];
      perPlayer: PerPlayerDistribution[];
    },
    pairs: DetectedCore[],
    trios: DetectedCore[],
    teamPairs: TeamCore[],
    lineups: FrequentLineup[],
  ): InsightsSummary {
    // Most common player count
    const mostCommon =
      distribution.game.reduce<PlayerCountDistributionEntry | null>(
        (best, entry) => {
          if (!best || entry.matchCount > best.matchCount) return entry;
          return best;
        },
        null,
      );

    // User's player count info
    let userPlayerCount: InsightsSummary["userPlayerCount"] = null;
    const userDist = distribution.perPlayer.find((p) => p.player.isUser);
    if (userDist && userDist.distribution.length > 0) {
      const userTotal = userDist.distribution.reduce(
        (s, d) => s + d.matchCount,
        0,
      );
      const userMostCommon = userDist.distribution.reduce((best, d) =>
        d.matchCount > best.matchCount ? d : best,
      );
      userPlayerCount = {
        mostCommon: userMostCommon.playerCount,
        percentage:
          userTotal > 0
            ? Math.round((userMostCommon.matchCount / userTotal) * 100)
            : 0,
        totalMatches: userTotal,
      };
    }

    // Top rival: highest finishes-above rate pair where user is a member, n >= 3
    let topRival: InsightsSummary["topRival"] = null;
    for (const pair of pairs) {
      const userPlayer = pair.players.find((p) => p.isUser);
      if (!userPlayer) continue;

      // Find the pairwise stat involving the user
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

    // Top pair: most frequent pair
    const topPairCore = pairs[0];
    const topPair: InsightsSummary["topPair"] = topPairCore
      ? {
          names: topPairCore.players.map((p) => p.playerName),
          matchCount: topPairCore.matchCount,
        }
      : null;

    // Top trio: most frequent trio (sorted by match count already)
    const topTrioCore = trios[0];
    const topTrio: InsightsSummary["topTrio"] = topTrioCore
      ? {
          names: topTrioCore.players.map((p) => p.playerName),
          matchCount: topTrioCore.matchCount,
        }
      : null;

    // Top group: most frequent lineup with 3+ players
    const topGroupLineup = lineups.find((l) => l.players.length >= 3);
    const topGroup: InsightsSummary["topGroup"] = topGroupLineup
      ? {
          names: topGroupLineup.players.map((p) => p.playerName),
          matchCount: topGroupLineup.matchCount,
          playerCount: topGroupLineup.players.length,
        }
      : null;

    // Best team core: highest win rate team pair with >= 3 matches
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
  }
}

export const gameInsightsService = new GameInsightsService();
